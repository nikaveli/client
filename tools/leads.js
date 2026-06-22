#!/usr/bin/env node
/**
 * DM-first lead generator.
 *
 * Scrapes Google Maps (via Outscraper) for a niche in a city/state, enriches
 * each business with the emails-and-contacts endpoint (email, Instagram,
 * Facebook, owner name), excludes franchises, and writes a DM-first Excel
 * sheet: Instagram/owner up front, DM-ready leads highlighted and sorted to
 * the top.
 *
 * Usage:
 *   node tools/leads.js --category "restaurant" --city "Denver" --state "CO" [--limit 50]
 *
 * Options:
 *   --limit N    leads to keep after franchise filtering (default 30, max 120)
 *   --exclude "a,b"  extra business-name prefixes to exclude
 *   --out DIR    output directory (default leads/)
 *
 * Requires OUTSCRAPER_API_KEY in the environment or .env. Costs Outscraper
 * credits only — no Claude involved at runtime.
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const KNOWN_FRANCHISES = require('./franchises');

const API_BASE = 'https://api.app.outscraper.com';

const parseArgs = (argv) => {
  const args = { limit: 30, out: 'leads' };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith('--')) args[key.slice(2)] = argv[(i += 1)];
  }
  return args;
};

const loadApiKey = () => {
  if (process.env.OUTSCRAPER_API_KEY) return process.env.OUTSCRAPER_API_KEY;
  const envFile = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/^OUTSCRAPER_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
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

const isFranchise = (place, all, extra) => {
  const name = (place.name || '').toLowerCase().trim();
  if ([...KNOWN_FRANCHISES, ...extra].some((b) => name.startsWith(b) || name.includes(` ${b} `))) return true;
  if (all.filter((p) => (p.name || '').toLowerCase().trim() === name).length > 1) return true;
  const site = (place.website || '').toLowerCase();
  return /\/(locations|location|stores|store-locator|restaurants?)\//.test(site);
};

// Website-builder template socials and non-profile paths that aren't the business.
const SOCIAL_JUNK = /(squarespace|wix|shopify|godaddy|wordpress|weebly|duda|jimdo|godaddysites)/i;

const igInfo = (raw) => {
  if (!raw) return null;
  let h = String(raw).trim();
  if (SOCIAL_JUNK.test(h)) return null;
  const m = h.match(/instagram\.com\/([^/?#]+)/i);
  if (m) h = m[1];
  h = h.replace(/^@/, '').replace(/\/$/, '');
  if (!h || /^(p|explore|accounts|reel|reels|stories|tv)$/i.test(h)) return null;
  return { url: `https://instagram.com/${h}`, handle: `@${h}` };
};

const fbInfo = (raw) => {
  if (!raw) return null;
  const h = String(raw).trim();
  if (SOCIAL_JUNK.test(h) || /facebook\.com\/(sharer|tr\?|plugins|dialog)/i.test(h)) return null;
  const url = h.startsWith('http') ? h : `https://${h}`;
  if (!/facebook\.com\//i.test(url)) return null;
  return { url };
};

// Pick the most decision-maker-like named contact, returning {name, email}.
const pickOwner = (emails) => {
  if (!emails?.length) return { name: '', email: '' };
  const rank = (e) => {
    const t = `${e.title || ''}`.toLowerCase();
    const lvl = `${e.level || ''}`.toLowerCase();
    if (/owner|founder|principal|proprietor/.test(t)) return 0;
    if (lvl === 'c_suite' || /ceo|coo|president|partner/.test(t)) return 1;
    if (lvl === 'management' || /manager|director|gm|general manager/.test(t)) return 2;
    return 3;
  };
  // Real names only: at least two letters, no stray punctuation/placeholders.
  const validName = (n) => n && /[a-z]{2,}/i.test(n) && !/[?_<>@\d]/.test(n) && n.trim().length >= 3;
  const named = emails.filter((e) => validName(e.full_name)).sort((a, b) => rank(a) - rank(b));
  if (named.length) return { name: named[0].full_name.trim(), email: named[0].value || '' };
  return { name: '', email: emails[0].value || '' };
};

const main = async () => {
  const args = parseArgs(process.argv);
  if (!args.category || !args.city || !args.state) {
    console.error('Usage: node tools/leads.js --category "restaurant" --city "Denver" --state "CO" [--limit 30]');
    process.exit(1);
  }
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('Missing OUTSCRAPER_API_KEY (set it in .env or the environment).');
    process.exit(1);
  }

  const limit = Math.min(Number(args.limit) || 30, 120);
  const extra = (args.exclude || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const outDir = path.resolve(args.out);
  fs.mkdirSync(outDir, { recursive: true });

  const query = `${args.category}, ${args.city}, ${args.state}`;
  const poolSize = Math.min(limit * 2, 200);
  console.log(`Searching Google Maps: "${query}" (pool ${poolSize})...`);
  const search = await outscraper(apiKey, '/maps/search-v3', { query, limit: poolSize, language: 'en', region: 'US' });
  const found = (search.data?.[0] || []).filter((p) => p.name);
  const places = found.filter((p) => !isFranchise(p, found, extra)).slice(0, limit);
  console.log(`  ${found.length} found, ${places.length} independent leads to enrich\n`);

  const rows = [];
  for (const place of places) {
    console.log(`Enriching: ${place.name}`);
    const row = {
      name: place.name,
      owner: '',
      ig: null,
      fb: null,
      email: '',
      phone: place.phone || '',
      address: place.street || (place.address || '').split(',')[0] || '',
      city: place.city || args.city,
      state: place.state_code || place.state || args.state,
      zip: place.postal_code || '',
      website: place.website || place.site || '',
      rating: place.rating ?? '',
      reviews: place.reviews ?? '',
    };

    const site = place.website || place.site;
    if (site) {
      try {
        const domain = new URL(site.startsWith('http') ? site : `https://${site}`).hostname.replace(/^www\./, '');
        const c = await outscraper(apiKey, '/emails-and-contacts', { query: domain });
        const rec = c.data?.[0] || {};
        const socials = rec.socials || {};
        row.ig = igInfo(socials.instagram);
        row.fb = fbInfo(socials.facebook);
        const owner = pickOwner(rec.emails);
        row.owner = owner.name;
        row.email = owner.email || (rec.emails?.[0]?.value || '');
      } catch (err) { console.log(`  ! contacts lookup failed: ${err.message}`); }
    }
    row.dmReady = Boolean(row.ig || row.fb);
    rows.push(row);
  }

  // DM-first ordering: Instagram leads, then Facebook, then email-only, then rest.
  const score = (r) => (r.ig ? 0 : r.fb ? 1 : r.email ? 2 : 3);
  rows.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));

  await writeXlsx(rows, outDir, query);

  const ig = rows.filter((r) => r.ig).length;
  const fb = rows.filter((r) => r.fb).length;
  const em = rows.filter((r) => r.email).length;
  const own = rows.filter((r) => r.owner).length;
  console.log(`\nDone. ${rows.length} leads.`);
  console.log(`  Instagram: ${ig}   Facebook: ${fb}   Email: ${em}   Owner name: ${own}`);
};

const writeXlsx = async (rows, outDir, query) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Leads', { views: [{ state: 'frozen', ySplit: 1 }] });
  const NAVY = 'FF16324F'; const GOLD = 'FFF2B33D'; const GREEN = 'FFE5F3E5';

  ws.columns = [
    { header: 'DM', key: 'dm', width: 5 },
    { header: 'Business Name', key: 'name', width: 32 },
    { header: 'Owner', key: 'owner', width: 20 },
    { header: 'Instagram', key: 'ig', width: 22 },
    { header: 'Facebook', key: 'fb', width: 14 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Address', key: 'address', width: 26 },
    { header: 'City', key: 'city', width: 14 },
    { header: 'State', key: 'state', width: 7 },
    { header: 'Zip', key: 'zip', width: 8 },
    { header: 'Website', key: 'website', width: 16 },
    { header: 'Rating', key: 'rating', width: 8 },
    { header: 'Reviews', key: 'reviews', width: 9 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  header.alignment = { vertical: 'middle' };
  header.height = 20;

  const link = (text, url) => (url ? { text, hyperlink: url } : '');
  for (const r of rows) {
    const row = ws.addRow({
      dm: r.dmReady ? '★' : '',
      name: r.name,
      owner: r.owner,
      ig: r.ig ? link(r.ig.handle, r.ig.url) : '',
      fb: r.fb ? link('Facebook', r.fb.url) : '',
      email: r.email ? link(r.email, `mailto:${r.email}`) : '',
      phone: r.phone,
      address: r.address,
      city: r.city,
      state: r.state,
      zip: r.zip,
      website: r.website ? link('site', r.website) : '',
      rating: r.rating,
      reviews: r.reviews,
    });
    if (r.dmReady) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    row.getCell('dm').alignment = { horizontal: 'center' };
    row.getCell('dm').font = { color: { argb: 'FF2E7D32' }, bold: true };
    ['ig', 'fb', 'email', 'website'].forEach((k) => {
      row.getCell(k).font = { color: { argb: 'FF1565C0' }, underline: true };
    });
  }

  ws.autoFilter = { from: 'A1', to: `N${rows.length + 1}` };

  const safe = query.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const file = path.join(outDir, `leads-${safe}.xlsx`);
  await wb.xlsx.writeFile(file);
  console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
  return file;
};

if (require.main === module) {
  main().catch((err) => { console.error(`\nFailed: ${err.message}`); process.exit(1); });
}
