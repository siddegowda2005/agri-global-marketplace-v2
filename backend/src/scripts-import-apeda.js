// Import REAL Indian exporters from the official APEDA "AgriExchange" exporter directory.
// Source (Government of India): https://agriexchange.apeda.gov.in/AgriDirectory/Exporter/Exporters
//
// What APEDA publishes per exporter: company name, address, products handled, state and PIN code.
// APEDA does NOT publish email, phone or website, so those fields are deliberately left empty
// (the app shows "Not publicly available" rather than inventing anything).
//
// Every imported record cites the APEDA directory it came from and is stored with written
// verification evidence + a retrieval date, so the UI can show the source link and the date.
//
// Usage:
//   node src/scripts-import-apeda.js                                  # Karnataka, up to 30 pages
//   node src/scripts-import-apeda.js --state=Karnataka --pages=40
//   node src/scripts-import-apeda.js --state=Karnataka --state=Maharashtra --pages=40
//   node src/scripts-import-apeda.js --file=./saved-page.html         # parse a saved page offline (dry run)
import mongoose from 'mongoose';
import fs from 'node:fs';
import { connectDb } from './config/db.js';
import { Company } from './models/Company.js';

const BASE = 'https://agriexchange.apeda.gov.in/AgriDirectory/Exporter/Exporters';
const argsFor = (name, def) => {
  const hits = process.argv.slice(2).filter((a) => a.startsWith(`--${name}=`));
  return hits.length ? hits.map((a) => a.slice(name.length + 3)) : def;
};
const states = argsFor('state', ['Karnataka']);
const maxPages = Number(argsFor('pages', ['30'])[0]) || 30;
const file = argsFor('file', [])[0];
const RETRIEVED = new Date();
const DAY = RETRIEVED.toISOString().slice(0, 10);

// Karnataka districts first (priority), then other major Indian cities for address→city detection.
const DISTRICTS = [
  'Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru', 'Bidar', 'Chamarajanagara', 'Chikkaballapura',
  'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwada', 'Gadag', 'Hassan', 'Haveri',
  'Kalaburagi', 'Kodagu', 'Kolar', 'Koppala', 'Mandya', 'Mysuru', 'Raichuru', 'Ramanagara', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 'Vijayapura', 'Yadagiri',
  'Mumbai', 'Pune', 'Nashik', 'Chennai', 'Coimbatore', 'Hyderabad', 'Delhi', 'Kochi', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
];
// Common spellings/aliases in APEDA addresses → canonical place name.
const ALIASES = {
  MYSORE: 'Mysuru', MYSURU: 'Mysuru', BANGALORE: 'Bengaluru', BENGALURU: 'Bengaluru', MANGALORE: 'Dakshina Kannada',
  MANGALURU: 'Dakshina Kannada', HUBBALLI: 'Dharwada', HUBLI: 'Dharwada', BELGAUM: 'Belagavi', BELLARY: 'Ballari',
  GULBARGA: 'Kalaburagi', SHIMOGA: 'Shivamogga', TUMKUR: 'Tumakuru', CHIKMAGALUR: 'Chikkamagaluru',
  CHAMARAJANAGAR: 'Chamarajanagara', DAVANGERE: 'Davanagere', BIJAPUR: 'Vijayapura', KOPPAL: 'Koppala',
  BOMBAY: 'Mumbai', COCHIN: 'Kochi', ERNAKULAM: 'Kochi', CALICUT: 'Kozhikode', TRIVANDRUM: 'Thiruvananthapuram',
};
// Recognised crop keywords → likely product tokens so the app's crop filter works.
const CROP_WORDS = ['tomato', 'onion', 'potato', 'rice', 'wheat', 'mango', 'banana', 'grape', 'pomegranate', 'groundnut', 'banana', 'papaya', 'coconut'];
const CATEGORY_HINTS = {
  fruits: ['fruit', 'mango', 'banana', 'grape', 'pomegranate', 'papaya', 'orange', 'apple', 'guava', 'coconut', 'melon'],
  vegetables: ['vegetable', 'onion', 'tomato', 'potato', 'shallot', 'brinjal', 'okra', 'gourd', 'chilli', 'cauliflower', 'spinach'],
  grains: ['rice', 'wheat', 'cereal', 'coarse grain', 'maize', 'basmati', 'millet', 'barley', 'paddy'],
  pulses: ['pulse', 'dal', 'gram', 'lentil', 'chickpea'],
  spices: ['spice', 'chilli', 'coriander', 'cumin', 'turmeric', 'pepper', 'ginger', 'garlic', 'curry'],
  nuts: ['nut', 'cashew', 'groundnut', 'walnut', 'almond'],
  floriculture: ['floriculture', 'flower', 'seed', 'plant'],
  processed: ['processed', 'pulp', 'pickle', 'preserved', 'jaggery', 'honey', 'sauce', 'juice', 'instant'],
  meat: ['meat', 'buffalo', 'poultry', 'sheep', 'goat', 'casing'],
  dairy: ['dairy', 'milk', 'cheese', 'butter', 'ghee'],
};

const clean = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function field(block, cls) {
  const i = block.indexOf(cls);
  if (i < 0) return '';
  const after = block.slice(i);
  const gt = after.indexOf('>');
  const end = after.indexOf('</p>', gt);
  return clean(after.slice(gt + 1, end < 0 ? undefined : end));
}

function parse(html) {
  const records = [];
  for (const block of html.split('<span class="fas fa-user" id="icon"></span>').slice(1)) {
    const name = clean(block.slice(0, block.indexOf('</p>')));
    if (!name) continue;
    records.push({
      name, address: field(block, 'fas fa-map-marker-alt'), products: field(block, 'fa-solid fa-box-open'),
      state: field(block, 'fas fa-map"'), pin: field(block, 'fas fa-map-pin'),
    });
  }
  return records;
}

function detectCity(address, state) {
  const upper = String(address || '').toUpperCase();
  for (const [alias, canonical] of Object.entries(ALIASES)) if (upper.includes(alias)) return canonical;
  for (const d of DISTRICTS) if (upper.includes(d.toUpperCase())) return d;
  return state ? undefined : undefined;
}

function tokens(products) {
  const items = String(products || '').split(',').map((p) => clean(p).toLowerCase()).filter((p) => p.length >= 3);
  const set = new Set(items);
  const lower = String(products || '').toLowerCase();
  for (const w of CROP_WORDS) if (lower.includes(w)) set.add(w);
  return [...set].slice(0, 40);
}

function categories(products) {
  const lower = String(products || '').toLowerCase();
  const out = new Set();
  for (const [cat, hints] of Object.entries(CATEGORY_HINTS)) if (hints.some((h) => lower.includes(h))) out.add(cat);
  return [...out];
}

function toDoc(rec, state) {
  const listingUrl = `${BASE}?expName=&expState=${encodeURIComponent(state)}`;
  return {
    type: 'indian_exporter', name: rec.name, country: 'India', state: rec.state || state,
    city: detectCity(rec.address, rec.state || state), address: rec.address || undefined,
    productsHandled: tokens(rec.products), productCategories: categories(rec.products),
    businessCategory: 'Registered Indian exporter (APEDA directory)', sourceUrl: listingUrl,
    sources: [{ url: listingUrl, label: `APEDA AgriExchange exporter directory (${state})`, checkedAt: RETRIEVED }],
    verificationStatus: 'verified',
    verificationEvidence: `Confirmed on the official APEDA AgriExchange exporter directory (Govt. of India), state=${state}, retrieved ${DAY}. APEDA lists name, address, products, state and PIN only; it publishes no email or phone.`,
    lastVerifiedAt: RETRIEVED, lastCheckedAt: RETRIEVED,
  };
}

async function fetchPage(state, page) {
  const url = `${BASE}?expName=&expState=${encodeURIComponent(state)}&page=${page}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'AgriGlobal-data-import/1.0 (educational project; respects robots)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main() {
  if (file) {
    const records = parse(fs.readFileSync(file, 'utf8'));
    console.log(`Parsed ${records.length} records from ${file}`);
    console.log(JSON.stringify(records.slice(0, 3), null, 2));
    console.log('Sample doc:'); console.log(JSON.stringify(toDoc(records[0], 'Karnataka'), null, 2));
    return;
  }
  await connectDb();
  let total = 0, created = 0;
  for (const state of states) {
    console.log(`\nFetching APEDA exporters for state: ${state}`);
    for (let page = 1; page <= maxPages; page += 1) {
      let html;
      try { html = await fetchPage(state, page); } catch (e) { console.error(`  page ${page}: ${e.message}`); break; }
      const records = parse(html);
      if (!records.length) { console.log(`  page ${page}: no records — stopping`); break; }
      const docs = records.map((r) => toDoc(r, state));
      const ops = docs.map((d) => ({ updateOne: { filter: { type: d.type, country: d.country, name: d.name }, update: { $set: d }, upsert: true } }));
      const r = await Company.bulkWrite(ops, { ordered: false });
      created += r.upsertedCount || 0; total += docs.length;
      console.log(`  page ${page}: ${docs.length} records (${r.upsertedCount || 0} new)`);
      await new Promise((res) => setTimeout(res, 400)); // be polite to the government server
    }
  }
  console.log(`\nAPEDA import complete: ${total} records processed, ${created} newly created.`);
  console.log('All stored as type=indian_exporter with an APEDA source link and verification evidence.');
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
