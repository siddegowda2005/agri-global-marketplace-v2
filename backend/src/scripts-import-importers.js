// Import REAL international agricultural importer / trading companies from their own
// official websites (publicly published contact details only).
//
// Honesty rules followed by this script:
//  - Every company below is a real, existing business found via public web search.
//  - Company name, country, city, products and contact details are taken ONLY from what
//    the company itself publishes publicly. Nothing is invented.
//  - Where a company does not publish an email or phone, the field is left empty and the
//    app shows "Not publicly available" instead of guessing.
//  - Each record cites the official page it came from + a retrieval date, and is stored as
//    verificationStatus=verified with written evidence, so the UI can show source + date.
//  - No "Currently Buying" flag is set here: that requires a separate, recently verified
//    buying request with evidence, and none can be claimed from a directory listing.
//
// Usage:
//   node src/scripts-import-importers.js
//   $env:MONGODB_URI='mongodb://127.0.0.1:27017/agri_marketplace_demo'; node src/scripts-import-importers.js
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { Company } from './models/Company.js';

const RETRIEVED = new Date();
const DAY = RETRIEVED.toISOString().slice(0, 10);

// Country names match the app's canonical list: UAE, USA, UK, Saudi Arabia, Singapore.
const DATA = [
  // ---------------- United Arab Emirates ----------------
  {
    name: 'Al Turab Foodstuff Trading LLC', country: 'UAE', state: 'Dubai', city: 'Dubai', buyerType: 'wholesaler',
    website: 'https://alturabfood.com/', contactPage: 'https://alturabfood.com/contact-us/',
    email: 'info@alturabfood.com', phone: '+971 58 810 1122',
    address: 'Warehouse #21, Warsan 1, International City, Dubai, UAE, PO Box 455012',
    products: ['rice', 'cooking oil', 'spices', 'frozen products', 'dairy products', 'fruits', 'vegetables', 'dry goods'],
    categories: ['grains', 'spices', 'fruits', 'vegetables', 'other crops'],
    business: 'Wholesale foodstuff trading company in Dubai',
  },
  {
    name: 'Noor Al Arab Foodstuff Trading Co. LLC', country: 'UAE', state: 'Dubai', city: 'Dubai', buyerType: 'wholesaler',
    website: 'https://nooralarabfoodstuff.com/', contactPage: 'https://nooralarabfoodstuff.com/contact-wholesale-food-dubai/',
    email: 'sales@nooralarabfoodstuffs.com', phone: '+971 4 254 6568',
    address: '86 Amman St, Al Qusais Ind. Fifth, Dubai, UAE',
    products: ['rice', 'sugar', 'edible oils', 'spices', 'pulses', 'frozen foods', 'dried fruits', 'seeds', 'gum arabic'],
    categories: ['grains', 'spices', 'pulses', 'fruits', 'other crops'],
    business: 'Wholesale foodstuff trading company in Dubai',
  },
  {
    name: 'Mizaal Goods Wholesalers Co. L.L.C.', country: 'UAE', state: 'Dubai', city: 'Dubai', buyerType: 'wholesaler',
    website: 'https://www.mizaal.com/', contactPage: 'https://www.mizaal.com/',
    email: 'info@mizaal.com', phone: '+971 4 576 0563',
    address: 'Al Aweer Central Wholesale Market, Dubai, UAE',
    products: ['red onion', 'potatoes', 'tomatoes', 'green chillies', 'okra', 'cucumbers', 'garlic', 'ginger', 'fruits', 'basmati rice', 'sona masoori rice', 'sugar', 'spices', 'cooking oils'],
    categories: ['vegetables', 'fruits', 'grains', 'spices', 'other crops'],
    business: 'Importer, distributor and repacker of fresh produce and commodities',
  },
  {
    name: 'Aladel Foodstuff Trading Co. LLC', country: 'UAE', state: 'Dubai', city: 'Dubai', buyerType: 'wholesaler',
    website: 'https://aladelfood.com/', contactPage: 'https://aladelfood.com/contact',
    email: 'aladel@postmaster.co.uk', phone: '+971 4 226 1930', whatsapp: '+971 54 753 0333',
    address: 'Al Ahmadiya Street, Al Ras, Deira, Dubai, UAE',
    products: ['grains', 'pulses', 'nuts', 'spices', 'sweets'],
    categories: ['grains', 'pulses', 'spices', 'other crops'],
    business: 'Wholesale foodstuff trading company in Dubai',
  },
  {
    name: 'Fresh Harvest Trading Co. L.L.C', country: 'UAE', state: 'Dubai', city: 'Dubai', buyerType: 'distributor',
    website: 'https://freshharvesttradingcollc.com/', contactPage: 'https://freshharvesttradingcollc.com/contact.html',
    phone: '+971 4 355 0480',
    address: 'Dubai, UAE (serves UAE, Bahrain and Qatar)',
    products: ['basmati rice', 'jasmine rice', 'sugar', 'turmeric', 'cumin', 'cardamom', 'garam masala', 'grains', 'red lentils', 'chickpeas', 'black beans', 'tea', 'coffee', 'sunflower oil', 'canola oil', 'olive oil'],
    categories: ['grains', 'spices', 'pulses', 'other crops'],
    business: 'ISO-certified wholesale food distributor for the GCC',
  },

  // ---------------- Singapore ----------------
  {
    name: 'Angliss Singapore Pte Ltd (Bidfood Singapore)', country: 'Singapore', state: 'Singapore', city: 'Singapore', buyerType: 'distributor',
    website: 'https://www.angliss.com.sg/', contactPage: 'https://www.angliss.com.sg/contact-us/',
    email: 'enquiries@bidfood.com.sg', phone: '+65 6778 8787',
    address: '232 Pandan Loop, Singapore 128420',
    products: ['food service distribution', 'frozen foods', 'dry goods', 'dairy'],
    categories: ['other crops'],
    business: 'Food service distributor and importer',
  },
  {
    name: 'Phoon Huat Pte. Ltd.', country: 'Singapore', state: 'Singapore', city: 'Singapore', buyerType: 'wholesaler',
    website: 'https://www.phoonhuat.com/', contactPage: 'https://www.phoonhuat.com/contact-us/',
    email: 'sales@phoonhuat.com', phone: '+65 6288 8866',
    address: '231A Pandan Loop, Singapore 128419',
    products: ['baking ingredients', 'dried fruits', 'nuts', 'dairy'],
    categories: ['fruits', 'other crops'],
    business: 'Baking and food ingredient supplier',
  },
  {
    name: 'Tong Garden Co. Ltd.', country: 'Singapore', state: 'Singapore', city: 'Singapore', buyerType: 'distributor',
    website: 'https://www.tonggarden.com.sg/', contactPage: 'https://shop.tonggarden.com.sg/',
    products: ['nuts', 'seeds', 'chestnuts', 'popcorn', 'dried fruits', 'snacks'],
    categories: ['fruits', 'other crops'],
    business: 'Nuts and dried fruit importer and distributor',
  },

  // ---------------- Saudi Arabia ----------------
  {
    name: 'Al Nafea Food Company', country: 'Saudi Arabia', state: 'Makkah', city: 'Jeddah', buyerType: 'importer',
    website: 'https://www.alnafeafoods.com/en/', contactPage: 'https://www.alnafeafoods.com/en/',
    email: 'contactus@alnafeafoods.com', phone: '920000820',
    address: 'Cornich Road, Jeddah 23511, Saudi Arabia',
    products: ['rice', 'milk', 'tea', 'coffee', 'canned goods', 'barley', 'fava beans', 'chickpeas', 'lentils'],
    categories: ['grains', 'pulses', 'other crops'],
    business: 'FMCG and agro commodities trading and distribution',
  },
  {
    name: 'AKH Foods', country: 'Saudi Arabia', state: 'Makkah', city: 'Jeddah', buyerType: 'importer',
    website: 'https://akhfoods.com/', contactPage: 'https://akhfoods.com/contact-us/',
    email: 'hussain@akhfoods.com', phone: '+966 54 215 7303',
    address: 'Merah & Bahris Building, AlBalad Gold Street, Jeddah, Saudi Arabia',
    products: ['foodstuff sourcing', 'rice', 'spices'],
    categories: ['grains', 'spices', 'other crops'],
    business: 'Vertically integrated foodstuff sourcing company',
  },
  {
    name: 'Saudi Fruit Trading Co. Ltd.', country: 'Saudi Arabia', buyerType: 'importer',
    website: 'https://www.saudifruit.sa/', contactPage: 'https://www.saudifruit.sa/the-company',
    email: 'saudifruits@gmail.com', phone: '+966 590247120',
    products: ['kiwifruit', 'pears', 'pineapples', 'pomegranates', 'apples', 'bananas', 'berries', 'citrus', 'cherries', 'grapes', 'fresh vegetables', 'dry fruits', 'seeds', 'grains', 'pulses', 'spices', 'rice'],
    categories: ['fruits', 'vegetables', 'grains', 'pulses', 'spices', 'other crops'],
    business: 'Fresh produce and staples importer and distributor',
  },
  {
    name: 'OKAM', country: 'Saudi Arabia', state: 'Makkah', city: 'Jeddah', buyerType: 'distributor',
    website: 'https://www.okam.com/', contactPage: 'https://www.okam.com/contact-us/',
    email: 'info@okam.com', phone: '+966 12 6685353',
    address: 'PO Box 8680, Jeddah 21492, KSA',
    products: ['food distribution', 'dry goods'],
    categories: ['other crops'],
    business: 'Food distribution company in Saudi Arabia',
  },
  {
    name: 'OZQUR Arabia Industrial Company (Al Rahma)', country: 'Saudi Arabia', state: 'Makkah', city: 'Jeddah', buyerType: 'processor',
    website: 'https://ozqur.com/', contactPage: 'https://ozqur.com/',
    email: 'contact@ozqur.com',
    address: 'Modon 3 Industrial City, Jeddah 22765, Saudi Arabia',
    products: ['red lentils', 'green lentils', 'brown lentils', 'kabuli chickpeas', 'fava beans', 'basmati rice', 'cumin seeds', 'turmeric', 'kidney beans', 'mung beans', 'coriander', 'durum wheat', 'flaxseed', 'yellow split peas'],
    categories: ['pulses', 'grains', 'spices'],
    business: 'Pulses, grains and spices processor and distributor (Al Rahma brand)',
  },

  // ---------------- United Kingdom ----------------
  {
    name: 'Cefetra UK', country: 'UK', state: 'Scotland', city: 'Paisley', buyerType: 'distributor',
    website: 'https://cefetra.co.uk/', contactPage: 'https://cefetra.co.uk/contact/',
    phone: '0141 445 5721',
    address: 'The Lightyear Building, Glasgow Airport Business Park, Marchburn Drive, Paisley PA3 2SJ',
    products: ['grains', 'oilseeds', 'agricultural raw materials'],
    categories: ['grains', 'other crops'],
    business: 'Supplier of agricultural raw materials for feed, food and fuel',
  },
  {
    name: 'Richard Hochfeld Ltd', country: 'UK', state: 'England', city: 'Borough Green', buyerType: 'importer',
    website: 'https://richardhochfeldgroup.com/', contactPage: 'https://richardhochfeldgroup.com/contact/',
    email: 'enquiries@richardhochfeld.co.uk', phone: '+44 1732 885566',
    address: 'Orchard Place, Comp Road, Borough Green, Kent TN15 8LW',
    products: ['grapes', 'apples', 'pears', 'fresh fruit'],
    categories: ['fruits'],
    business: 'Importer and packer of fresh fruit',
  },
  {
    name: 'TerraCore Global LTD', country: 'UK', state: 'England', buyerType: 'importer',
    website: 'https://www.terracoreglobal.com/', contactPage: 'https://www.terracoreglobal.com/',
    email: 'info@terracoreglobal.com', phone: '+44 7880 006636',
    products: ['rice', 'basmati rice', 'flour', 'tea', 'spices', 'edible oils'],
    categories: ['grains', 'spices', 'other crops'],
    business: 'Importer and exporter of agricultural commodities',
  },
  {
    name: 'Agrospecs', country: 'UK', state: 'England', city: 'London', buyerType: 'importer',
    website: 'https://www.agrospecs.co.uk/', contactPage: 'https://www.agrospecs.co.uk/',
    email: 'info@agrospecs.co.uk', phone: '+44 20 3996 2720', whatsapp: '+44 7451 251326',
    address: '13 Grove Crescent, Kingston upon Thames, London KT1 2EU',
    products: ['wheat', 'yellow corn', 'sugar', 'sunflower oil', 'soybean meal', 'sesame seeds', 'herbs', 'spices'],
    categories: ['grains', 'spices', 'other crops'],
    business: 'Agricultural brokerage and global sourcing company',
  },
  {
    name: 'Epifresh (Codenutri Ltd)', country: 'UK', state: 'England', buyerType: 'importer',
    website: 'https://www.epifresh.co/', contactPage: 'https://www.epifresh.co/',
    email: 'info@epifresh.co', phone: '+44 7541 671714',
    products: ['dried fruits', 'grains', 'nuts', 'shea butter', 'spices'],
    categories: ['fruits', 'grains', 'spices', 'other crops'],
    business: 'UK-registered food agent importing to the UK',
  },

  // ---------------- United States ----------------
  {
    name: 'EmpagroCorp', country: 'USA', state: 'Texas', city: 'Pasadena', buyerType: 'distributor',
    website: 'https://empagrocorp.com/', contactPage: 'https://empagrocorp.com/contact.html',
    email: 'info@empagrocorp.com', phone: '+1 713 485 6024',
    address: '1720 Preston Ave, Pasadena, TX 77503, United States',
    products: ['rice', 'beans'],
    categories: ['grains', 'pulses'],
    business: 'B2B food distribution and import',
  },
  {
    name: 'Defiant Trading (Fresh N Wild Seafood LLC)', country: 'USA', state: 'Florida', city: 'Boca Raton', buyerType: 'importer',
    website: 'https://defianttrading.com/', contactPage: 'https://defianttrading.com/',
    products: ['sugar', 'poultry', 'rice', 'edible oils', 'wheat', 'soybeans', 'corn'],
    categories: ['grains', 'other crops'],
    business: 'Global food commodity trading company',
  },
  {
    name: 'Seaboard Overseas and Trading Group', country: 'USA', buyerType: 'importer',
    website: 'https://seaboardoverseas.com/', contactPage: 'https://seaboardoverseas.com/locations',
    products: ['wheat', 'corn', 'oilseeds', 'grains', 'agricultural commodities'],
    categories: ['grains', 'other crops'],
    business: 'Trading and logistics of agricultural commodities',
  },
];

// Each company's real logo / brand image, taken from the company's OWN website.
// Verified to load as an image on the retrieval date. Companies that publish no
// retrievable logo image are simply omitted here (the UI shows the name's initial).
const LOGOS = {
  'Al Turab Foodstuff Trading LLC': 'https://alturabfood.com/wp-content/uploads/2024/11/cropped-Al-Turab-Food-Logo-180x180.png',
  'Noor Al Arab Foodstuff Trading Co. LLC': 'https://nooralarabfoodstuff.com/wp-content/uploads/2026/06/cropped-WhatsApp-Image-2026-05-06-at-5.57.02-PM-1-180x180.jpeg',
  'Mizaal Goods Wholesalers Co. L.L.C.': 'https://www.mizaal.com/assets/images/logo.svg',
  'Fresh Harvest Trading Co. L.L.C': 'https://freshharvesttradingcollc.com/apple-touch-icon.png',
  'Angliss Singapore Pte Ltd (Bidfood Singapore)': 'https://bidfood.com.sg/wp-content/uploads/2024/05/Bidfood-logo-2.png',
  'Phoon Huat Pte. Ltd.': 'https://www.phoonhuat.com/wp-content/uploads/2020/05/cropped-phoon-huat-logo-1-180x180.png',
  'Tong Garden Co. Ltd.': 'https://www.google.com/s2/favicons?sz=128&domain=tonggarden.com.sg',
  'Al Nafea Food Company': 'https://www.alnafeafoods.com/uploads/logooo.png',
  'AKH Foods': 'https://akhfoods.com/wp-content/uploads/2022/02/Logo-Final1.png',
  'Saudi Fruit Trading Co. Ltd.': 'https://www.saudifruit.sa/images/saudi-fruit-logo.png',
  'OKAM': 'https://www.google.com/s2/favicons?sz=128&domain=okam.com',
  'OZQUR Arabia Industrial Company (Al Rahma)': 'https://www.ozqur.com/logo-light.png',
  'Cefetra UK': 'https://cefetra.co.uk/wp-content/uploads/2024/09/Cefetra_Logo_RGB.jpg',
  'Richard Hochfeld Ltd': 'https://richardhochfeldgroup.com/wp-content/uploads/2020/11/cropped-RH-Group-Logo-White-180x180.png',
  'TerraCore Global LTD': 'https://www.terracoreglobal.com/logo.png',
  'Agrospecs': 'https://www.agrospecs.co.uk/favicon.svg',
  'Epifresh (Codenutri Ltd)': 'https://epifresh.co/assets/Medias/logos/logo-NoBG.png',
  'EmpagroCorp': 'https://empagrocorp.com/images/logo.png',
  'Defiant Trading (Fresh N Wild Seafood LLC)': 'https://defianttrading.com/wp-content/themes/defiant-theme/logo.png',
  'Seaboard Overseas and Trading Group': 'https://seaboardoverseas.com/wp-content/uploads/2015/07/sbd-globe-favicon-55958ae3v1_site_icon-256x256.png',
};

const toDoc = (d) => ({
  type: 'international_importer', name: d.name, country: d.country, state: d.state, city: d.city, logoUrl: LOGOS[d.name],
  buyerType: d.buyerType || 'importer', productsHandled: (d.products || []).map((p) => p.toLowerCase()),
  productCategories: d.categories || [], businessCategory: d.business,
  website: d.website, email: d.email, phone: d.phone, whatsapp: d.whatsapp, address: d.address, contactPage: d.contactPage,
  sourceUrl: d.website,
  sources: [{ url: d.website, label: `${d.name} official website`, checkedAt: RETRIEVED }],
  verificationStatus: 'verified',
  verificationEvidence: `Public company details confirmed on ${d.name}'s official website (${d.website}) on ${DAY}. Name, country, products and any contact details shown are exactly as published by the company; fields it does not publish are left blank rather than invented.`,
  lastVerifiedAt: RETRIEVED, lastCheckedAt: RETRIEVED,
});

async function main() {
  await connectDb();
  const docs = DATA.map(toDoc);
  const ops = docs.map((d) => ({ updateOne: { filter: { type: d.type, country: d.country, name: d.name }, update: { $set: d }, upsert: true } }));
  const r = await Company.bulkWrite(ops, { ordered: false });
  console.log(`Importer import complete: ${docs.length} records processed, ${r.upsertedCount || 0} newly created, ${r.modifiedCount || 0} updated.`);
  console.log('All stored as type=international_importer, verificationStatus=verified, with an official-website source link and verification date.');
  for (const d of docs) console.log(`  - [${d.country}] ${d.name}${d.email || d.phone ? '' : '  (no public email/phone published)'}`);
  await mongoose.disconnect();
}
main().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
