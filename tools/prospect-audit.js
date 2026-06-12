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
const PHOTOS_SAMPLE = 40; // newest media checked for dates and video

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
  ink: '#1a1a2e',
  accent: '#1565c0',
  warn: '#b26a00',
  line: '#9e9e9e',
  green: '#2e7d32',
};

const drawCheckbox = (doc, x, y, checked) => {
  doc.save().lineWidth(1.2).strokeColor(C.ink).rect(x, y, 12, 12).stroke();
  if (checked) {
    doc.lineWidth(1.8).strokeColor(C.green)
      .moveTo(x + 2.5, y + 6.5).lineTo(x + 5, y + 9.5).lineTo(x + 10, y + 2.5).stroke();
  }
  doc.restore();
};

/** "Label:  value" on one line; if value is null, draws a fill-in-by-hand line. */
const fieldLine = (doc, label, value, { indent = 72 } = {}) => {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink).text(`${label}: `, indent, y, { continued: value !== null });
  if (value !== null) {
    doc.font('Helvetica').text(String(value));
  } else {
    const labelWidth = doc.widthOfString(`${label}: `) + 4;
    doc.save().lineWidth(0.8).strokeColor(C.line)
      .moveTo(indent + labelWidth, y + 12).lineTo(540, y + 12).stroke().restore();
    doc.text('', indent, y + 14); // advance the cursor past the blank line
  }
  doc.moveDown(0.8);
};

/** "Label:" followed by Yes/No checkboxes. checked: true=Yes, false=No, null=both blank. */
const yesNoLine = (doc, label, checked, { indent = 72 } = {}) => {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink).text(`${label}:`, indent, y);
  const boxX = indent + doc.widthOfString(`${label}:`) + 24;
  drawCheckbox(doc, boxX, y - 1, checked === true);
  doc.font('Helvetica').text('Yes', boxX + 18, y);
  drawCheckbox(doc, boxX + 70, y - 1, checked === false);
  doc.text('No', boxX + 88, y);
  doc.moveDown(0.9);
};

const sectionHeader = (doc, title) => {
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.accent).text(title, 60);
  doc.save().lineWidth(1).strokeColor(C.accent)
    .moveTo(60, doc.y + 2).lineTo(552, doc.y + 2).stroke().restore();
  doc.moveDown(0.7);
};

const PITCH =
  'AI needs to see you to recommend you. My mission is simple: keeping local businesses thriving. ' +
  'As a visual creator, I know exactly how to use professional photography and video to give Google ' +
  'the powerful "trust signals" it’s looking for in 2026. Let’s work together to fix the gaps in ' +
  'your audit and show the community—and the AI—why your business is the best choice.';

const CONTACT = 'Drop me a text to chat: Nicholas  303-524-0591';

const drawFooter = (doc) => {
  const y = doc.page.height - 104;
  doc.save().lineWidth(0.8).strokeColor(C.line).moveTo(60, y).lineTo(552, y).stroke().restore();

  const brand = 'LocalFirst';
  const url = '   www.LocalFirstOnline.com';
  doc.font('Helvetica-Bold').fontSize(12);
  const brandWidth = doc.widthOfString(brand);
  doc.font('Helvetica');
  const urlWidth = doc.widthOfString(url);
  const startX = 60 + (492 - brandWidth - urlWidth) / 2;
  doc.font('Helvetica-Bold').fillColor(C.ink)
    .text(brand, startX, y + 12, { lineBreak: false, width: brandWidth + 4 });
  doc.font('Helvetica').fillColor(C.accent)
    .text(url, startX + brandWidth, y + 12, {
      lineBreak: false, width: urlWidth + 4,
      link: 'https://www.LocalFirstOnline.com', underline: true,
    });

  doc.font('Helvetica').fontSize(10).fillColor(C.line)
    .text('*Colorado Only   303-524-0591', 60, y + 30, { width: 492, align: 'center', lineBreak: false });
};

const buildPdf = (business, outDir) => {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 54, bottom: 54, left: 60, right: 60 } });
  const safeName = business.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const file = path.join(outDir, `${safeName}.pdf`);
  doc.pipe(fs.createWriteStream(file));

  // ---- Page 1: the audit
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.ink)
    .text('Google Business Profile AI Audit Report', { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Helvetica-Oblique').fontSize(14).fillColor(C.accent)
    .text('How your business stands today!', { align: 'center' });
  doc.moveDown(1.2);

  fieldLine(doc, 'Business name', business.name, { indent: 60 });
  doc.moveDown(0.3);

  sectionHeader(doc, 'Reputation Section');
  fieldLine(doc, 'Overall Rating', business.rating != null ? `${business.rating} / 5` : null);
  fieldLine(doc, 'Number of Reviews', business.reviews ?? null);
  yesNoLine(doc, 'Reply to Reviews', business.repliesToReviews);
  fieldLine(doc, 'Number of Photo Reviews', business.photoReviews ?? null);

  sectionHeader(doc, 'Update Section');
  fieldLine(doc, 'Number of Photos', business.photosCount ?? null);
  fieldLine(doc, 'Date of last Photo update', business.lastPhotoDate ?? null);
  yesNoLine(doc, 'Video', business.hasVideo);
  yesNoLine(doc, 'Posts/Updates', null); // not publicly visible — fill in manually
  fieldLine(doc, 'Date of last Post', null); // manual
  yesNoLine(doc, 'Website', business.hasWebsite);
  yesNoLine(doc, 'Social Media', business.hasSocials);
  if (business.socialLinks?.length) {
    doc.font('Helvetica').fontSize(9).fillColor(C.line)
      .text(`Found: ${business.socialLinks.join('   ')}`, 96, doc.y, { width: 440 });
  }

  // ---- Pitch + contact, directly under the audit
  doc.moveDown(1.2);
  doc.save().lineWidth(1).strokeColor(C.accent)
    .moveTo(60, doc.y).lineTo(552, doc.y).stroke().restore();
  doc.moveDown(0.8);
  doc.font('Helvetica-BoldOblique').fontSize(11.5).fillColor(C.ink)
    .text(PITCH, 60, doc.y, { width: 492, lineGap: 2.5 });
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.accent)
    .text(CONTACT, 60, doc.y, { width: 492, align: 'center' });

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
      photosCount: place.photos_count ?? null,
      hasWebsite: Boolean(place.website || place.site),
      repliesToReviews: null,
      photoReviews: null,
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
          const withPhotos = reviewsData.filter((rev) =>
            rev.review_img_url || rev.review_img_urls?.length || rev.review_photo_ids?.length).length;
          business.photoReviews = `${withPhotos} of ${reviewsData.length} newest`;
        }
      } catch (err) { console.log(`  ! reviews lookup failed: ${err.message}`); }
    }

    if (!args.skipPhotos && place.place_id && (place.photos_count ?? 0) > 0) {
      try {
        const p = await outscraper(apiKey, '/maps/photos-v3', {
          query: place.place_id, photosLimit: PHOTOS_SAMPLE,
        });
        const photos = p.data?.[0]?.[0]?.photos_data || [];
        const dates = photos.map((ph) => new Date(ph.photo_date)).filter((d) => !Number.isNaN(d));
        if (dates.length) {
          business.lastPhotoDate = new Date(Math.max(...dates)).toLocaleDateString('en-US');
        }
        business.hasVideo = photos.some((ph) => ph.photo_source_video) ? true : photos.length ? false : null;
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
