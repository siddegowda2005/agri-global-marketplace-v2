// Repeatable DEMO DATA seeder for local testing.
// Every record created here is clearly marked as SAMPLE / DEMO DATA and is written to an
// ISOLATED database (default: agri_marketplace_demo) so production data is never touched.
// Usage:  node src/scripts-seed-demo.js            (seeds the demo DB)
//         SEED_MONGODB_URI=mongodb://127.0.0.1:27017/my_demo_db node src/scripts-seed-demo.js
// Safety: the target database name MUST contain "demo" unless you pass --force.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDb } from './config/db.js';
import { User } from './models/User.js';
import { Crop } from './models/Crop.js';
import { Company } from './models/Company.js';
import { BuyingRequest } from './models/BuyingRequest.js';
import { Enquiry } from './models/Enquiry.js';
import { Order } from './models/Order.js';
import { Notification } from './models/Notification.js';
import { Cart } from './models/Cart.js';

const DEMO_URI = process.env.SEED_MONGODB_URI || 'mongodb://127.0.0.1:27017/agri_marketplace_demo';
const DEMO_PASSWORD = 'Demo@12345';
const DEMO_TAG = 'SAMPLE / DEMO DATA — fictional record generated for local testing. Not a real business, farmer or offer.';
const SRC = 'https://example.com/demo/source'; // example.com is reserved for documentation only

const dbName = new URL(DEMO_URI).pathname.replace(/^\//, '');
if (!/demo/i.test(dbName) && !process.argv.includes('--force')) {
  console.error(`Refusing to seed "${dbName}": database name must contain "demo". Pass --force to override.`);
  process.exit(1);
}

const now = new Date();
const days = (n) => new Date(now.getTime() + n * 86400000);

const farmerNames = ['Ravi Kumar', 'Lakshmi Devi', 'Suresh Patil', 'Anitha Rao', 'Mahesh Gowda', 'Sunita Bai', 'Vinod Nair', 'Pooja Shetty', 'Imran Khan', 'Deepa Menon'];
const farmerPlaces = [
  ['Karnataka', 'Mysuru'], ['Karnataka', 'Mysuru'], ['Karnataka', 'Mandya'], ['Tamil Nadu', 'Erode'],
  ['Karnataka', 'Bengaluru Rural'], ['Maharashtra', 'Nashik'], ['Kerala', 'Palakkad'], ['Karnataka', 'Hassan'],
  ['Telangana', 'Warangal'], ['Karnataka', 'Kolar'],
];
const buyerSpecs = [
  ['Al Noor Foods Trading', 'UAE', 'AED', 'Dubai'], ['Marina Fresh Produce', 'UAE', 'AED', 'Abu Dhabi'],
  ['Sunrise Agri Singapore', 'Singapore', 'SGD', 'Singapore'], ['Saudi Harvest Co', 'Saudi Arabia', 'SAR', 'Riyadh'],
  ['Kingdom Fresh Imports', 'Saudi Arabia', 'SAR', 'Jeddah'], ['Britannia Produce Ltd', 'UK', 'GBP', 'London'],
  ['Thames Valley Foods', 'UK', 'GBP', 'Birmingham'], ['Pacific Coast Traders', 'USA', 'USD', 'Los Angeles'],
  ['Midwest Grain Partners', 'USA', 'USD', 'Chicago'], ['Deccan Buyers Pvt Ltd', 'India', 'INR', 'Hyderabad'],
];

const cropSpecs = [
  ['Tomato', 'Vegetables', 28, 'kg', 'A'], ['Onion', 'Vegetables', 22, 'kg', 'A'], ['Potato', 'Vegetables', 18, 'kg', 'B'],
  ['Rice', 'Grains', 42, 'kg', 'A'], ['Wheat', 'Grains', 30, 'kg', 'A'], ['Mango', 'Fruits', 85, 'kg', 'A'],
  ['Banana', 'Fruits', 35, 'kg', 'B'], ['Tomato', 'Vegetables', 30, 'kg', 'B'], ['Onion', 'Vegetables', 24, 'kg', 'B'],
  ['Potato', 'Vegetables', 20, 'kg', 'A'], ['Rice', 'Grains', 45, 'kg', 'B'], ['Wheat', 'Grains', 32, 'kg', 'B'],
  ['Mango', 'Fruits', 95, 'kg', 'A'], ['Banana', 'Fruits', 33, 'kg', 'A'], ['Tomato', 'Vegetables', 26, 'kg', 'A'],
  ['Onion', 'Vegetables', 21, 'kg', 'C'], ['Rice', 'Grains', 40, 'kg', 'A'], ['Wheat', 'Grains', 29, 'kg', 'C'],
  ['Mango', 'Fruits', 80, 'kg', 'B'], ['Banana', 'Fruits', 36, 'kg', 'A'],
];

const importerSpecs = [
  ['DEMO Al Noor Foods Trading LLC', 'UAE', 'Dubai', 'importer', ['tomato', 'onion', 'potato'], ['vegetables']],
  ['DEMO Gulf Garden Produce FZE', 'UAE', 'Dubai', 'importer', ['mango', 'banana', 'tomato'], ['fruits', 'vegetables']],
  ['DEMO Emirates Wholesale Foods', 'UAE', 'Sharjah', 'wholesaler', ['rice', 'wheat', 'onion'], ['grains', 'vegetables']],
  ['DEMO Desert Fresh Distributors', 'UAE', 'Abu Dhabi', 'distributor', ['tomato', 'banana'], ['vegetables', 'fruits']],
  ['DEMO Merlion Agri Trading Pte', 'Singapore', 'Singapore', 'importer', ['mango', 'banana'], ['fruits']],
  ['DEMO Strait Fresh Wholesale', 'Singapore', 'Singapore', 'wholesaler', ['tomato', 'onion', 'potato'], ['vegetables']],
  ['DEMO Jurong Food Supply Pte', 'Singapore', 'Singapore', 'distributor', ['rice', 'mango'], ['grains', 'fruits']],
  ['DEMO Riyadh Harvest Import Co', 'Saudi Arabia', 'Riyadh', 'importer', ['rice', 'wheat'], ['grains']],
  ['DEMO Jeddah Fresh Markets', 'Saudi Arabia', 'Jeddah', 'distributor', ['mango', 'banana', 'onion'], ['fruits', 'vegetables']],
  ['DEMO Albion Produce Importers', 'UK', 'London', 'importer', ['mango', 'banana'], ['fruits']],
  ['DEMO Midlands Veg Supply Ltd', 'UK', 'Birmingham', 'wholesaler', ['onion', 'potato', 'tomato'], ['vegetables']],
  ['DEMO Thames Grain Traders', 'UK', 'London', 'processor', ['wheat', 'rice'], ['grains']],
  ['DEMO Pacific Rim Foods Inc', 'USA', 'Los Angeles', 'importer', ['mango', 'banana'], ['fruits']],
  ['DEMO Midwest Grain Partners Inc', 'USA', 'Chicago', 'processor', ['wheat', 'rice'], ['grains']],
  ['DEMO East Coast Fresh LLC', 'USA', 'New York', 'wholesaler', ['tomato', 'onion', 'potato'], ['vegetables']],
];

const exporterSpecs = [
  ['DEMO Mysuru Fresh Exports', 'Karnataka', 'Mysuru', ['tomato', 'banana']],
  ['DEMO Kaveri Agri Exports', 'Karnataka', 'Mysuru', ['tomato', 'onion']],
  ['DEMO Chamundi Produce Exports', 'Karnataka', 'Mysuru', ['mango', 'tomato']],
  ['DEMO Deccan Spice & Grain Exports', 'Karnataka', 'Bengaluru', ['rice', 'wheat']],
  ['DEMO Mandya Sugarcane & Veg Exports', 'Karnataka', 'Mandya', ['tomato', 'potato']],
  ['DEMO Nashik Onion Exporters', 'Maharashtra', 'Nashik', ['onion']],
  ['DEMO Erode Banana Export Co', 'Tamil Nadu', 'Erode', ['banana']],
  ['DEMO Palakkad Mango Exports', 'Kerala', 'Palakkad', ['mango']],
  ['DEMO Kolar Vegetable Exports', 'Karnataka', 'Kolar', ['tomato', 'potato']],
  ['DEMO Hassan Coffee & Fruit Exports', 'Karnataka', 'Hassan', ['banana', 'mango']],
];

async function main() {
  console.log(`Seeding DEMO data into database: ${dbName}`);
  await connectDb(DEMO_URI);

  // Clear our demo collections so the script is safely repeatable.
  await Promise.all([User, Crop, Company, BuyingRequest, Enquiry, Order, Notification, Cart].map((M) => M.deleteMany({})));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const farmers = await User.create(farmerNames.map((name, i) => ({
    name: `${name} (DEMO)`, email: `farmer${i + 1}@demo.agriglobal.test`, passwordHash, role: 'farmer',
    phone: '+91 90000 0000' + i, country: 'India', currency: 'INR', state: farmerPlaces[i][0], city: farmerPlaces[i][1],
  })));
  const buyers = await User.create(buyerSpecs.map(([org, country, currency, city], i) => ({
    name: `${org} Buyer (DEMO)`, email: `buyer${i + 1}@demo.agriglobal.test`, passwordHash, role: 'buyer',
    organization: org, country, currency, city,
  })));
  const admin = await User.create({
    name: 'Demo Admin (DEMO)', email: 'admin@demo.agriglobal.test', passwordHash, role: 'admin', country: 'India', currency: 'INR',
  });

  const crops = await Crop.create(cropSpecs.map(([name, category, price, unit, grade], i) => ({
    farmer: farmers[i % farmers.length]._id, name, category, unit, priceInr: price, grade,
    description: 'SAMPLE / DEMO DATA listing for testing.', quantity: 50 + i * 25,
    location: farmerPlaces[i % farmerPlaces.length][1], state: farmerPlaces[i % farmerPlaces.length][0], country: 'India',
    harvestDate: days(3 + (i % 10)), status: 'available',
  })));

  const importers = await Company.create(importerSpecs.map(([name, country, city, buyerType, products, categories]) => ({
    type: 'international_importer', name, country, city, buyerType, productsHandled: products, productCategories: categories,
    businessCategory: 'DEMO importer/distributor of agricultural produce', website: 'https://example.com', email: 'procurement@example.com',
    address: `${city} (DEMO address)`, sourceUrl: SRC, sources: [{ url: SRC, label: 'DEMO placeholder source', checkedAt: now }],
    verificationStatus: 'verified', verificationEvidence: DEMO_TAG, lastVerifiedAt: now, lastCheckedAt: now,
  })));

  const exporters = await Company.create(exporterSpecs.map(([name, state, city, products]) => ({
    type: 'indian_exporter', name, country: 'India', state, city, buyerType: 'exporter', productsHandled: products,
    productCategories: ['vegetables', 'fruits'], businessCategory: 'DEMO Indian exporter',
    website: 'https://example.com', email: 'exports@example.com', address: `${city}, ${state} (DEMO address)`,
    sourceUrl: SRC, sources: [{ url: SRC, label: 'DEMO placeholder source', checkedAt: now }],
    verificationStatus: 'verified', verificationEvidence: DEMO_TAG, lastVerifiedAt: now, lastCheckedAt: now,
  })));

  const reqSpecs = [
    ['tomato', 20000, 'kg', 'Grade A', 'Dubai'], ['onion', 15000, 'kg', 'Grade A', 'Abu Dhabi'],
    ['mango', 5000, 'kg', 'Grade A', 'London'], ['banana', 30000, 'kg', 'Grade A', 'Singapore'],
    ['wheat', 100000, 'kg', 'Milling', 'London'], ['rice', 80000, 'kg', 'Basmati', 'Riyadh'],
    ['potato', 25000, 'kg', 'Grade B', 'Sharjah'], ['tomato', 12000, 'kg', 'Grade A', 'Jeddah'],
    ['onion', 30000, 'kg', 'Grade B', 'Birmingham'], ['mango', 8000, 'kg', 'Grade A', 'Los Angeles'],
  ];
  const buyingRequests = await BuyingRequest.create(reqSpecs.map(([crop, quantity, unit, quality, destination], i) => ({
    company: importers[i % importers.length]._id, crop, quantity, unit, quality, deliveryDestination: destination,
    requestDate: days(-5 - i), expiresAt: days(60 + i), sourceUrl: SRC,
    status: 'open', verificationStatus: 'verified', verificationEvidence: DEMO_TAG, lastCheckedAt: now,
  })));

  const enqStatuses = ['draft', 'submitted', 'delivery_attempted', 'delivered', 'failed', 'submitted', 'draft', 'delivered', 'submitted', 'delivery_attempted'];
  const enquiries = [];
  for (let i = 0; i < 10; i += 1) {
    const status = enqStatuses[i];
    const crop = cropSpecs[i];
    const farmer = farmers[i % farmers.length];
    const company = importers[i % importers.length];
    enquiries.push({
      farmer: farmer._id, company: company._id, crop: crops[i]._id, cropName: crop[0], quantity: 2000 + i * 500, unit: 'kg',
      location: `${farmer.city}, ${farmer.state}, India`, expectedPriceInr: crop[2], grade: crop[4],
      message: 'SAMPLE / DEMO enquiry.', contactPreference: 'any', subject: `Enquiry: ${crop[0]}`,
      body: `SAMPLE / DEMO DATA enquiry for ${crop[0]}.`, status,
      history: [{ status, at: days(-3 - i), note: 'DEMO status' }],
      note: 'SAMPLE / DEMO DATA.',
    });
  }
  await Enquiry.create(enquiries);

  // A few sample orders, keeping crop stock consistent.
  const orderSpecs = [[1, 100, 'Pending'], [8, 60, 'Accepted'], [12, 40, 'Completed']];
  const orders = [];
  for (const [idx, qty, status] of orderSpecs) {
    const crop = crops[idx];
    const buyer = buyers[idx % buyers.length];
    crop.quantity = Math.max(0, crop.quantity - qty);
    orders.push({
      buyer: buyer._id, farmer: crop.farmer, crop: crop._id, cropName: crop.name, quantity: qty, unit: crop.unit,
      unitPriceInr: crop.priceInr, totalInr: qty * crop.priceInr, buyerCountry: buyer.country, buyerCurrency: buyer.currency,
      status, idempotencyKey: `demo-order-${idx}-${qty}`,
    });
  }
  await Order.create(orders);
  await Promise.all([...new Set(orderSpecs.map(([idx]) => crops[idx]._id.toString()))].map((id) => Crop.findByIdAndUpdate(id, { quantity: crops.find((c) => c._id.toString() === id).quantity })));

  await Notification.create(farmers.slice(0, 3).map((f, i) => ({ user: f._id, type: 'demo', message: 'SAMPLE / DEMO notification', read: i === 0 })));

  console.log(`DEMO SEED COMPLETE (all records labelled "${'SAMPLE / DEMO DATA'}")`);
  console.log(`  farmers: ${farmers.length}, buyers: ${buyers.length}, admin: 1`);
  console.log(`  crops: ${crops.length}, importers: ${importers.length}, indian exporters: ${exporters.length}`);
  console.log(`  buying requests: ${buyingRequests.length}, enquiries: ${enquiries.length}, orders: ${orders.length}`);
  console.log(`\nDemo login: any seeded email, password "${DEMO_PASSWORD}"`);
  console.log(`  farmer: farmer1@demo.agriglobal.test   admin: admin@demo.agriglobal.test   buyer: buyer1@demo.agriglobal.test`);
  console.log(`Demo admin id: ${admin._id}`);
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
