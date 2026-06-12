#!/usr/bin/env node
/**
 * Prospect audit generator.
 *
 * Scrapes Google Maps (via Outscraper) for a category in a city/state,
 * excludes franchise businesses, and writes one audit PDF per business
 * using the LocalFirst report template.
 *
 * Usage:
 *   node tools/prospect-audit.js --category "restaurant" --city "Denver" --state "CO" [--limit 10]
 *
 * Options:
 *   --limit N          businesses to fetch before franchise filtering (default 10, max 50)
 *   --exclude "a,b"    extra business-name prefixes to exclude
 *   --skip-reviews     skip the per-business reviews call (saves credits; reply box left blank)
 *   --skip-photos      skip the per-business photos call (saves credits; photo date/video left blank)
 *   --skip-contacts    skip the social-media lookup (saves credits; social box left blank)
 *   --out DIR          output directory (default audit-reports/)
 *
 * Requires OUTSCRAPER_API_KEY in the environment or in .env.
 * Costs Outscraper credits only — no Claude involved at runtime.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const KNOWN_FRANCHISES = require('./franchises');

const API_BASE = 'https://api.app.outscraper.com';
const REVIEWS_SAMPLE = 10; // newest reviews checked for owner replies
const OWNER_PHOTOS_LIMIT = 1000; // max owner-uploaded photos fetched per business

// ---------------------------------------------------------------- helpers

const parseArgs = (argv) => {
  const args = { limit: 10, out: 'audit-reports' };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--skip-reviews') args.skipReviews = true;
    else if (key === '--skip-photos') args.skipPhotos = true;
    else if (key === '--skip-contacts') args.skipContacts = true;
    else if (key.startsWith('--')) args[key.slice(2)] = argv[(i += 1)];
  }
  return args;
};

const loadApiKey = () => {
  if (process.env.OUTSCRAPER_API_KEY) return process.env.OUTSCRAPER_API_KEY;
  const envFile = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envFile)) {
    const match = fs.readFileSync(envFile, 'utf8').match(/^OUTSCRAPER_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  }
  return null;
};

const outscraper = async (apiKey, endpoint, params) => {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries({ ...params, async: 'false' }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
  if (!res.ok) throw new Error(`Outscraper ${endpoint} failed: HTTP ${res.status} ${await res.text()}`);
  return res.json();
};

// ------------------------------------------------------- franchise filter

const isFranchise = (place, allPlaces, extraExcludes) => {
  const name = (place.name || '').toLowerCase().trim();

  const excluded = [...KNOWN_FRANCHISES, ...extraExcludes].some((brand) =>
    name.startsWith(brand) || name.includes(` ${brand} `));
  if (excluded) return 'known franchise list';

  // Same name appearing more than once in the result set = multi-location chain.
  const sameName = allPlaces.filter((p) => (p.name || '').toLowerCase().trim() === name);
  if (sameName.length > 1) return 'multiple locations in results';

  // Corporate multi-location website paths like /locations/... or /restaurant/co/...
  const site = (place.website || '').toLowerCase();
  if (/\/(locations|location|stores|store-locator|restaurants?)\//.test(site)) {
    return 'multi-location website pattern';
  }

  return null;
};

// ------------------------------------------------------------ pdf builder

const C = {
  navy: '#16324f',
  gold: '#f2b33d',
  ink: '#1f2933',
  gray: '#7b8794',
  cardBg: '#f4f7fb',
  cardBorder: '#d9e2ec',
  line: '#b3c1d1',
  green: '#2e7d32',
  white: '#ffffff',
};

// Fixed layout grid: labels at LABEL_X, values/checkboxes aligned at VALUE_X.
const PAGE = { left: 50, width: 512 };
const LABEL_X = 70;
const VALUE_X = 320;
const ROW_H = 24;

const drawCheckbox = (doc, x, y, checked) => {
  doc.save().lineWidth(1.2).strokeColor(C.navy).roundedRect(x, y, 12, 12, 2).stroke();
  if (checked) {
    doc.lineWidth(1.8).strokeColor(C.green)
      .moveTo(x + 2.5, y + 6.5).lineTo(x + 5, y + 9.5).lineTo(x + 10, y + 2.5).stroke();
  }
  doc.restore();
};

/** Label left, value in the aligned column; null value = fill-in-by-hand line. */
const drawRow = (doc, y, label, value) => {
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.ink)
    .text(label, LABEL_X, y, { lineBreak: false });
  if (value !== null && value !== undefined) {
    doc.font('Helvetica').fontSize(11.5).fillColor(C.ink)
      .text(String(value), VALUE_X, y, { lineBreak: false });
  } else {
    doc.save().lineWidth(0.9).strokeColor(C.line)
      .moveTo(VALUE_X, y + 11).lineTo(540, y + 11).stroke().restore();
  }
};

/** Label left, Yes/No checkboxes in the aligned column. true=Yes, false=No, null=blank. */
const drawYesNoRow = (doc, y, label, checked) => {
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.ink)
    .text(label, LABEL_X, y, { lineBreak: false });
  drawCheckbox(doc, VALUE_X, y - 1, checked === true);
  doc.font('Helvetica').fontSize(11.5).fillColor(C.ink)
    .text('Yes', VALUE_X + 18, y, { lineBreak: false });
  drawCheckbox(doc, VALUE_X + 70, y - 1, checked === false);
  doc.text('No', VALUE_X + 88, y, { lineBreak: false });
};

/** Bordered card with a tinted title strip; returns where rows start and total height. */
const drawCard = (doc, y, title, rowCount, extraH = 0) => {
  const h = 40 + rowCount * ROW_H + extraH;
  doc.save();
  doc.roundedRect(PAGE.left, y, PAGE.width, h, 8).fillColor(C.white).fill();
  doc.roundedRect(PAGE.left, y, PAGE.width, 28, 8).fillColor(C.cardBg).fill();
  doc.rect(PAGE.left, y + 14, PAGE.width, 14).fillColor(C.cardBg).fill();
  doc.roundedRect(PAGE.left, y, PAGE.width, h, 8).lineWidth(1).strokeColor(C.cardBorder).stroke();
  doc.rect(PAGE.left, y + 6, 4, 16).fillColor(C.gold).fill();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.navy)
    .text(title.toUpperCase(), LABEL_X - 6, y + 8, { characterSpacing: 1, lineBreak: false });
  doc.restore();
  return { rowsY: y + 38, h };
};

const PITCH =
  'AI needs to see you to recommend you. My mission is simple: keeping local businesses thriving. ' +
  'As a visual creator, I know exactly how to use professional photography and video to give Google ' +
  'the powerful "trust signals" it’s looking for in 2026. Let’s work together to fix the gaps in ' +
  'your audit and show the community—and the AI—why your business is the best choice.';

const CONTACT = 'Drop me a text to chat: Nicholas  303-524-0591';

const drawFooter = (doc) => {
  const H = doc.page.height;
  const W = doc.page.width;
  doc.rect(0, H - 64, W, 3).fillColor(C.gold).fill();
  doc.rect(0, H - 61, W, 61).fillColor(C.navy).fill();

  const brand = 'LocalFirst';
  const url = '   www.LocalFirstOnline.com';
  doc.font('Helvetica-Bold').fontSize(12);
  const brandWidth = doc.widthOfString(brand);
  doc.font('Helvetica');
  const urlWidth = doc.widthOfString(url);
  const startX = (W - brandWidth - urlWidth) / 2;
  doc.font('Helvetica-Bold').fillColor(C.white)
    .text(brand, startX, H - 48, { lineBreak: false, width: brandWidth + 4 });
  doc.font('Helvetica').fillColor(C.gold)
    .text(url, startX + brandWidth, H - 48, {
      lineBreak: false, width: urlWidth + 4,
      link: 'https://www.LocalFirstOnline.com', underline: true,
    });

  doc.font('Helvetica').fontSize(9).fillColor('#b8c7d9')
    .text('*Colorado Only   303-524-0591', 0, H - 27, { width: W, align: 'center', lineBreak: false });
};

const buildPdf = (business, outDir) => {
  const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
  const safeName = business.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const file = path.join(outDir, `${safeName}.pdf`);
  doc.pipe(fs.createWriteStream(file));
  const W = doc.page.width;

  // ---- Header band
  doc.rect(0, 0, W, 104).fillColor(C.navy).fill();
  doc.rect(0, 104, W, 3).fillColor(C.gold).fill();
  doc.font('Helvetica-Bold').fontSize(21).fillColor(C.white)
    .text('Google Business Profile AI Audit Report', PAGE.left, 30, { width: PAGE.width, align: 'center' });
  doc.font('Helvetica-Oblique').fontSize(13).fillColor(C.gold)
    .text('How your business stands today!', PAGE.left, 64, { width: PAGE.width, align: 'center' });

  // ---- Business name
  doc.font('Helvetica').fontSize(9).fillColor(C.gray)
    .text('BUSINESS NAME', PAGE.left, 124, { width: PAGE.width, align: 'center', characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(19).fillColor(C.ink)
    .text(business.name, PAGE.left, 138, { width: PAGE.width, align: 'center' });

  // ---- Reputation card
  let y = 176;
  let card = drawCard(doc, y, 'Reputation Section', 3);
  let ry = card.rowsY;
  drawRow(doc, ry, 'Overall Rating', business.rating != null ? `${business.rating} / 5` : null); ry += ROW_H;
  drawRow(doc, ry, 'Number of Reviews', business.reviews ?? null); ry += ROW_H;
  drawYesNoRow(doc, ry, 'Reply to Reviews', business.repliesToReviews);
  y += card.h + 12;

  // ---- Update card
  const socialExtra = business.socialLinks?.length ? 14 : 0;
  card = drawCard(doc, y, 'Update Section', 8, socialExtra);
  ry = card.rowsY;
  drawRow(doc, ry, 'Number of Photos', business.photosCount ?? null); ry += ROW_H;
  drawRow(doc, ry, 'Total Views on Photos', null); ry += ROW_H; // manual fill-in
  drawRow(doc, ry, 'Date of last Photo update', business.lastPhotoDate ?? null); ry += ROW_H;
  drawYesNoRow(doc, ry, 'Video', business.hasVideo); ry += ROW_H;
  drawYesNoRow(doc, ry, 'Posts/Updates', null); ry += ROW_H; // not publicly visible — manual
  drawRow(doc, ry, 'Date of last Post', null); ry += ROW_H; // manual
  drawYesNoRow(doc, ry, 'Website', business.hasWebsite); ry += ROW_H;
  drawYesNoRow(doc, ry, 'Social Media', business.hasSocials); ry += ROW_H;
  if (business.socialLinks?.length) {
    doc.font('Helvetica').fontSize(8).fillColor(C.gray)
      .text(`Found: ${business.socialLinks.join('   ')}`, LABEL_X, ry - 8,
        { width: 472, height: 18, ellipsis: true });
  }
  y += card.h + 14;

  // ---- Pitch callout
  doc.font('Helvetica-BoldOblique').fontSize(10.5);
  const pitchH = doc.heightOfString(PITCH, { width: 462, lineGap: 1.8 }) + 22;
  doc.roundedRect(PAGE.left, y, PAGE.width, pitchH, 8).fillColor(C.cardBg).fill();
  doc.rect(PAGE.left, y + 6, 4, pitchH - 12).fillColor(C.gold).fill();
  doc.font('Helvetica-BoldOblique').fontSize(10.5).fillColor(C.ink)
    .text(PITCH, LABEL_X, y + 11, { width: 462, lineGap: 1.8 });
  y += pitchH + 13;

  // ---- Contact CTA pill
  doc.font('Helvetica-Bold').fontSize(12.5);
  const ctaW = doc.widthOfString(CONTACT) + 48;
  const ctaX = (W - ctaW) / 2;
  doc.roundedRect(ctaX, y, ctaW, 32, 16).fillColor(C.navy).fill();
  doc.fillColor(C.white).text(CONTACT, ctaX, y + 9, { width: ctaW, align: 'center', lineBreak: false });

  drawFooter(doc);
  doc.end();
  return file;
};

// ------------------------------------------------------------------ main

const main = async () => {
  const args = parseArgs(process.argv);
  if (!args.category || !args.city || !args.state) {
    console.error('Usage: node tools/prospect-audit.js --category "restaurant" --city "Denver" --state "CO" [--limit 10]');
    process.exit(1);
  }
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('Missing OUTSCRAPER_API_KEY (set it in .env or the environment).');
    process.exit(1);
  }

  const limit = Math.min(Number(args.limit) || 10, 50);
  const extraExcludes = (args.exclude || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const outDir = path.resolve(args.out);
  fs.mkdirSync(outDir, { recursive: true });

  const query = `${args.category}, ${args.city}, ${args.state}`;
  console.log(`Searching Google Maps: "${query}" (limit ${limit})...`);
  const search = await outscraper(apiKey, '/maps/search-v3', { query, limit, language: 'en', region: 'US' });
  const places = (search.data?.[0] || []).filter((p) => p.name);
  console.log(`  ${places.length} businesses found`);

  const independents = [];
  for (const place of places) {
    const reason = isFranchise(place, places, extraExcludes);
    if (reason) console.log(`  ✗ excluding "${place.name}" (${reason})`);
    else independents.push(place);
  }
  console.log(`  ${independents.length} independent businesses kept\n`);

  for (const place of independents) {
    console.log(`Auditing: ${place.name}`);
    const business = {
      name: place.name,
      rating: place.rating ?? null,
      reviews: place.reviews ?? null,
      photosCount: null, // owner-uploaded count, filled from the photos lookup
      hasWebsite: Boolean(place.website || place.site),
      repliesToReviews: null,
      lastPhotoDate: null,
      hasVideo: null,
      hasSocials: null,
      socialLinks: [],
    };

    if (!args.skipReviews && place.place_id && (place.reviews ?? 0) > 0) {
      try {
        const r = await outscraper(apiKey, '/maps/reviews-v3', {
          query: place.place_id, reviewsLimit: REVIEWS_SAMPLE, sort: 'newest',
        });
        const reviewsData = r.data?.[0]?.reviews_data || [];
        if (reviewsData.length) {
          business.repliesToReviews = reviewsData.some((rev) => rev.owner_answer);
        }
      } catch (err) { console.log(`  ! reviews lookup failed: ${err.message}`); }
    }

    if (!args.skipPhotos && place.place_id && (place.photos_count ?? 0) > 0) {
      try {
        // Only owner-uploaded media counts as profile activity — customer
        // photos are excluded, matching the "by owner" view in Google Maps.
        const p = await outscraper(apiKey, '/maps/photos-v3', {
          query: place.place_id, photosLimit: OWNER_PHOTOS_LIMIT, tag: 'by_owner',
        });
        const photos = p.data?.[0]?.[0]?.photos_data || [];
        business.photosCount = photos.length;
        const dates = photos.map((ph) => new Date(ph.photo_date)).filter((d) => !Number.isNaN(d));
        if (dates.length) {
          business.lastPhotoDate = new Date(Math.max(...dates)).toLocaleDateString('en-US');
        }
        business.hasVideo = photos.some((ph) => ph.photo_source_video);
      } catch (err) { console.log(`  ! photos lookup failed: ${err.message}`); }
    }

    const site = place.website || place.site;
    if (!args.skipContacts && site) {
      try {
        const domain = new URL(site).hostname.replace(/^www\./, '');
        const c = await outscraper(apiKey, '/emails-and-contacts', { query: domain });
        const socials = c.data?.[0]?.socials || {};
        const links = Object.values(socials).filter(Boolean);
        business.hasSocials = links.length > 0;
        business.socialLinks = links.slice(0, 4);
      } catch (err) { console.log(`  ! contacts lookup failed: ${err.message}`); }
    } else if (!site) {
      business.hasSocials = false; // no website to find socials on
    }

    const file = buildPdf(business, outDir);
    console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
  }

  console.log(`\nDone. ${independents.length} report(s) in ${path.relative(process.cwd(), outDir)}/`);
};

if (require.main === module) {
  main().catch((err) => {
    console.error(`\nFailed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { buildPdf, isFranchise };
