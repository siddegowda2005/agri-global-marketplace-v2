import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app, mongod, models, currencySvc, miscRoutes;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
let n = 0;

beforeAll(async () => {
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'agri-up-'));
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const { createApp } = await import('../app.js');
  app = createApp();
  models = {
    User: (await import('../models/User.js')).User, Crop: (await import('../models/Crop.js')).Crop,
    Order: (await import('../models/Order.js')).Order, Company: (await import('../models/Company.js')).Company,
    Rate: (await import('../models/ExchangeRateCache.js')).ExchangeRateCache,
  };
  await Promise.all(Object.values(models).map((m) => m.init()));
  currencySvc = await import('../services/currency.js');
  miscRoutes = await import('../routes/misc.js');
});
afterAll(async () => { await mongoose.disconnect(); await mongod?.stop(); });
beforeEach(async () => { await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))); });

async function signup(role, extra = {}) {
  n += 1;
  const res = await request(app).post('/api/auth/register').send({ name: `User ${n}`, email: `u${n}@example.com`, password: 'Passw0rdTest', role, ...extra });
  expect(res.status).toBe(201);
  return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } };
}
async function admin() {
  const bcrypt = (await import('bcryptjs')).default;
  n += 1;
  await models.User.create({ name: 'Admin', email: `admin${n}@example.com`, role: 'admin', passwordHash: await bcrypt.hash('Passw0rdTest', 4) });
  const res = await request(app).post('/api/auth/login').send({ email: `admin${n}@example.com`, password: 'Passw0rdTest' });
  return { auth: { Authorization: `Bearer ${res.body.token}` } };
}
const cropBody = (o = {}) => ({ name: 'Tomato', category: 'Vegetables', quantity: 100, unit: 'kg', priceInr: 30, location: 'Mysuru', state: 'Karnataka', ...o });
async function addCrop(farmer, o) { const r = await request(app).post('/api/crops').set(farmer.auth).field(Object.fromEntries(Object.entries(cropBody(o)).map(([k, v]) => [k, String(v)]))); expect(r.status).toBe(201); return r.body.crop; }

describe('auth', () => {
  it('registers, logs in, rejects bad credentials', async () => {
    const f = await signup('farmer');
    expect(f.user.passwordHash).toBeUndefined();
    expect((await request(app).post('/api/auth/login').send({ email: f.user.email, password: 'Passw0rdTest' })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: f.user.email, password: 'wrong-password1' })).status).toBe(401);
  });
  it('rejects admin self-registration, weak passwords, duplicates', async () => {
    const base = { name: 'X Y', email: 'x@example.com', password: 'Passw0rdTest' };
    expect((await request(app).post('/api/auth/register').send({ ...base, role: 'admin' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ ...base, role: 'buyer', password: 'short' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ ...base, role: 'buyer' })).status).toBe(201);
    expect((await request(app).post('/api/auth/register').send({ ...base, role: 'buyer' })).status).toBe(409);
  });
  it('blocks NoSQL operator injection on login', async () => {
    await signup('buyer');
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });
  it('requires a token', async () => { expect((await request(app).get('/api/auth/me')).status).toBe(401); });
});

describe('crops & permissions', () => {
  it('farmer CRUD with image upload; images served', async () => {
    const f = await signup('farmer');
    const r = await request(app).post('/api/crops').set(f.auth).field('name', 'Mango').field('category', 'Fruits').field('quantity', '50').field('priceInr', '80').field('location', 'Mysuru').attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(r.status).toBe(201);
    expect(r.body.crop.images).toHaveLength(1);
    expect((await request(app).get(r.body.crop.images[0])).status).toBe(200);
    const u = await request(app).put(`/api/crops/${r.body.crop._id}`).set(f.auth).field('priceInr', '90');
    expect(u.status).toBe(200); expect(u.body.crop.priceInr).toBe(90); expect(u.body.crop.name).toBe('Mango');
    expect((await request(app).delete(`/api/crops/${r.body.crop._id}`).set(f.auth)).status).toBe(200);
  });
  it('rejects non-image uploads and invalid input', async () => {
    const f = await signup('farmer');
    const bad = await request(app).post('/api/crops').set(f.auth).field('name', 'Rice').field('category', 'Grains').field('quantity', '5').field('priceInr', '10').field('location', 'Mandya').attach('images', Buffer.from('<?php ?>'), { filename: 'x.php', contentType: 'application/x-php' });
    expect(bad.status).toBe(400);
    expect((await request(app).post('/api/crops').set(f.auth).send({ name: 'A' })).status).toBe(400);
  });
  it('buyers cannot create crops; farmers cannot edit others\' crops', async () => {
    const f1 = await signup('farmer'); const f2 = await signup('farmer'); const b = await signup('buyer');
    expect((await request(app).post('/api/crops').set(b.auth).send(cropBody())).status).toBe(403);
    const crop = await addCrop(f1);
    expect((await request(app).put(`/api/crops/${crop._id}`).set(f2.auth).field('priceInr', '1')).status).toBe(403);
    expect((await request(app).delete(`/api/crops/${crop._id}`).set(f2.auth)).status).toBe(403);
  });
  it('search and filters work; out-of-stock hidden', async () => {
    const f = await signup('farmer');
    await addCrop(f, { name: 'Tomato' }); await addCrop(f, { name: 'Basmati Rice', category: 'Grains', priceInr: 70 }); await addCrop(f, { name: 'Sold Out', quantity: 0 });
    expect((await request(app).get('/api/crops?q=rice')).body.items.map((c) => c.name)).toEqual(['Basmati Rice']);
    expect((await request(app).get('/api/crops?category=Vegetables')).body.total).toBe(1);
    expect((await request(app).get('/api/crops?minPrice=50')).body.total).toBe(1);
    expect((await request(app).get('/api/crops')).body.total).toBe(2);
  });
});

describe('orders & inventory', () => {
  it('places an order, reserves stock, notifies farmer; farmer accepts; buyer sees status', async () => {
    const f = await signup('farmer'); const b = await signup('buyer', { country: 'UAE' });
    const crop = await addCrop(f);
    const o = await request(app).post('/api/orders').set(b.auth).send({ cropId: crop._id, quantity: 40, idempotencyKey: 'key-0000001' });
    expect(o.status).toBe(201); expect(o.body.order.totalInr).toBe(1200); expect(o.body.notice).toMatch(/outside this platform/);
    expect((await models.Crop.findById(crop._id)).quantity).toBe(60);
    expect((await request(app).get('/api/notifications').set(f.auth)).body.unread).toBe(1);
    expect((await request(app).patch(`/api/orders/${o.body.order._id}/status`).set(f.auth).send({ status: 'Accepted' })).status).toBe(200);
    expect((await request(app).get(`/api/orders/${o.body.order._id}`).set(b.auth)).body.order.status).toBe('Accepted');
  });
  it('is idempotent: same key does not create a second order or reserve twice', async () => {
    const f = await signup('farmer'); const b = await signup('buyer'); const crop = await addCrop(f);
    const send = () => request(app).post('/api/orders').set(b.auth).send({ cropId: crop._id, quantity: 10, idempotencyKey: 'same-key-001' });
    const [a, c] = await Promise.all([send(), send()]);
    expect([a.status, c.status].sort()).toEqual([200, 201]);
    expect(await models.Order.countDocuments()).toBe(1);
    expect((await models.Crop.findById(crop._id)).quantity).toBe(90);
  });
  it('two buyers racing for the last stock never oversell', async () => {
    const f = await signup('farmer'); const b1 = await signup('buyer'); const b2 = await signup('buyer');
    const crop = await addCrop(f, { quantity: 100 });
    const go = (b, k) => request(app).post('/api/orders').set(b.auth).send({ cropId: crop._id, quantity: 70, idempotencyKey: k });
    const res = await Promise.all([go(b1, 'race-key-001'), go(b2, 'race-key-002')]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await models.Crop.findById(crop._id)).quantity).toBe(30);
  });
  it('rejects quantity above stock', async () => {
    const f = await signup('farmer'); const b = await signup('buyer'); const crop = await addCrop(f);
    expect((await request(app).post('/api/orders').set(b.auth).send({ cropId: crop._id, quantity: 101, idempotencyKey: 'big-order-01' })).status).toBe(409);
    expect((await request(app).post('/api/orders').set(b.auth).send({ cropId: crop._id, quantity: -5, idempotencyKey: 'neg-order-01' })).status).toBe(400);
  });
  it('rejecting or cancelling restores stock exactly once', async () => {
    const f = await signup('farmer'); const b = await signup('buyer'); const crop = await addCrop(f);
    const o = (await request(app).post('/api/orders').set(b.auth).send({ cropId: crop._id, quantity: 25, idempotencyKey: 'restore-key1' })).body.order;
    expect((await request(app).patch(`/api/orders/${o._id}/status`).set(f.auth).send({ status: 'Rejected' })).status).toBe(200);
    expect((await request(app).patch(`/api/orders/${o._id}/status`).set(f.auth).send({ status: 'Rejected' })).status).toBe(409);
    expect((await request(app).patch(`/api/orders/${o._id}/status`).set(b.auth).send({ status: 'Cancelled' })).status).toBe(409);
    expect((await models.Crop.findById(crop._id)).quantity).toBe(100);
  });
  it('enforces ownership and valid transitions', async () => {
    const f = await signup('farmer'); const f2 = await signup('farmer'); const b = await signup('buyer'); const b2 = await signup('buyer'); const crop = await addCrop(f);
    const o = (await request(app).post('/api/orders').set(b.auth).send({ cropId: crop._id, quantity: 5, idempotencyKey: 'perm-key-001' })).body.order;
    expect((await request(app).patch(`/api/orders/${o._id}/status`).set(f2.auth).send({ status: 'Accepted' })).status).toBe(404);
    expect((await request(app).patch(`/api/orders/${o._id}/status`).set(b.auth).send({ status: 'Accepted' })).status).toBe(409);
    expect((await request(app).get(`/api/orders/${o._id}`).set(b2.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/orders/${o._id}/status`).set(f.auth).send({ status: 'Completed' })).status).toBe(409);
  });
  it('cart: add, update, stock-checked, checkout creates orders and empties cart', async () => {
    const f = await signup('farmer'); const b = await signup('buyer'); const crop = await addCrop(f);
    expect((await request(app).put('/api/cart/items').set(b.auth).send({ cropId: crop._id, quantity: 500 })).status).toBe(409);
    expect((await request(app).put('/api/cart/items').set(b.auth).send({ cropId: crop._id, quantity: 5 })).status).toBe(200);
    expect((await request(app).put('/api/cart/items').set(b.auth).send({ cropId: crop._id, quantity: 8 })).body.items[0].quantity).toBe(8);
    const co = await request(app).post('/api/orders/checkout').set(b.auth).send({ idempotencyKey: 'checkout-0001' });
    expect(co.status).toBe(201); expect(co.body.orders).toHaveLength(1);
    expect((await request(app).get('/api/cart').set(b.auth)).body.items).toHaveLength(0);
  });
  it('cannot delete a crop with active orders', async () => {
    const f = await signup('farmer'); const b = await signup('buyer'); const crop = await addCrop(f);
    await request(app).post('/api/orders').set(b.auth).send({ cropId: crop._id, quantity: 5, idempotencyKey: 'del-key-0001' });
    expect((await request(app).delete(`/api/crops/${crop._id}`).set(f.auth)).status).toBe(409);
  });
});

describe('currency', () => {
  const payload = { rates: { INR: 1, USD: 0.012, AED: 0.044, EUR: 0.011, GBP: 0.0095, SAR: 0.045, SGD: 0.016 } };
  it('converts using fetched rate and falls back to cache, then to unavailable', async () => {
    currencySvc.setFetch(async () => ({ ok: true, json: async () => payload }));
    const live = await request(app).get('/api/currency/convert?amount=30&to=AED');
    expect(live.body).toMatchObject({ available: true, value: 1.32, source: 'live' });
    await models.Rate.updateOne({ base: 'INR' }, { fetchedAt: new Date(Date.now() - 24 * 3600 * 1000) });
    currencySvc.setFetch(async () => { throw new Error('down'); });
    const cached = await request(app).get('/api/currency/convert?amount=30&to=AED');
    expect(cached.body).toMatchObject({ available: true, source: 'cache' }); expect(cached.body.fetchedAt).toBeTruthy();
    await models.Rate.deleteMany({});
    const none = await request(app).get('/api/currency/convert?amount=30&to=AED');
    expect(none.body.available).toBe(false);
    expect((await request(app).get('/api/currency/convert?amount=30&to=XXX')).status).toBe(400);
  });
  it('ignores malformed API payloads', async () => {
    currencySvc.setFetch(async () => ({ ok: true, json: async () => ({ rates: { USD: 'x' } }) }));
    expect((await request(app).get('/api/currency/rates')).body.available).toBe(false);
  });
});

describe('companies, matching, enquiries', () => {
  const co = (o = {}) => ({ type: 'international_importer', name: 'Test Importer LLC', country: 'UAE', city: 'Dubai', productsHandled: ['tomato', 'onion'], sourceUrl: 'https://example.com/source', website: 'https://example.com', email: 'procurement@example.com', ...o });
  it('only admins manage; farmers see verified only; matching explains reasons', async () => {
    const a = await admin(); const f = await signup('farmer');
    expect((await request(app).post('/api/companies').set(f.auth).send(co())).status).toBe(403);
    const created = await request(app).post('/api/companies').set(a.auth).send(co()); expect(created.status).toBe(201);
    expect((await request(app).get('/api/companies').set(f.auth)).body.items).toHaveLength(0);
    expect((await request(app).get(`/api/companies/${created.body.company._id}`).set(f.auth)).status).toBe(404);
    const v = await request(app).post(`/api/companies/${created.body.company._id}/verify`).set(a.auth);
    expect(v.body.company.lastVerifiedAt).toBeTruthy();
    const m = await request(app).get('/api/companies/match?crop=Tomato&country=UAE').set(f.auth);
    expect(m.body.items).toHaveLength(1); expect(m.body.items[0].score).toBe(100); expect(m.body.items[0].reasons[0]).toMatch(/publicly lists tomato/);
    expect((await request(app).get('/api/companies/match?crop=Wheat').set(f.auth)).body.items).toHaveLength(0);
  });
  it('rejects javascript: URLs and duplicate companies', async () => {
    const a = await admin();
    expect((await request(app).post('/api/companies').set(a.auth).send(co({ website: 'javascript:alert(1)' }))).status).toBe(400);
    await request(app).post('/api/companies').set(a.auth).send(co());
    expect((await request(app).post('/api/companies').set(a.auth).send(co())).status).toBe(409);
  });
  it('enquiry creates a draft + mailto and never claims sending', async () => {
    const a = await admin(); const f = await signup('farmer');
    const c = (await request(app).post('/api/companies').set(a.auth).send(co())).body.company;
    await request(app).post(`/api/companies/${c._id}/verify`).set(a.auth);
    const e = await request(app).post('/api/enquiries').set(f.auth).send({ companyId: c._id, cropName: 'Tomato', quantity: 2000, unit: 'kg', location: 'Mysuru, Karnataka, India' });
    expect(e.status).toBe(201); expect(e.body.mailto).toMatch(/^mailto:procurement@example.com\?subject=/); expect(e.body.notice).toMatch(/Draft only/);
    expect(e.body.enquiry.body).toContain('Tomato');
  });
});

describe('admin & AI proxy', () => {
  it('blocks non-admins from admin APIs; admin sees stats', async () => {
    const b = await signup('buyer'); const f = await signup('farmer'); const a = await admin();
    for (const t of [b, f]) expect((await request(app).get('/api/admin/users').set(t.auth)).status).toBe(403);
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
    expect((await request(app).get('/api/admin/stats').set(a.auth)).body.farmers).toBe(1);
  });
  it('deactivated users are locked out', async () => {
    const b = await signup('buyer'); const a = await admin();
    await request(app).patch(`/api/admin/users/${b.user._id}`).set(a.auth).send({ active: false });
    expect((await request(app).get('/api/auth/me').set(b.auth)).status).toBe(401);
  });
  it('AI proxy: 503 when service is down, passes through real responses, farmer-only', async () => {
    const f = await signup('farmer'); const b = await signup('buyer');
    miscRoutes.setAiFetch(async () => { throw new Error('refused'); });
    expect((await request(app).post('/api/ai/price-prediction').set(f.auth).send({ crop: 'Tomato' })).status).toBe(503);
    miscRoutes.setAiFetch(async () => ({ ok: true, status: 200, json: async () => ({ predicted_price: 25.5 }) }));
    expect((await request(app).post('/api/ai/price-prediction').set(f.auth).send({ crop: 'Tomato' })).body.predicted_price).toBe(25.5);
    expect((await request(app).post('/api/ai/price-prediction').set(b.auth).send({ crop: 'Tomato' })).status).toBe(403);
  });
});

describe('reference data (centers, export guides)', () => {
  it('admin manages centers; public sees verified only', async () => {
    const a = await admin(); const f = await signup('farmer');
    const body = { name: 'Test APMC Yard', latitude: 12.3, longitude: 76.6, sourceUrl: 'https://example.com/s', state: 'Karnataka' };
    expect((await request(app).post('/api/collection-centers').set(f.auth).send(body)).status).toBe(403);
    const c = await request(app).post('/api/collection-centers').set(a.auth).send(body); expect(c.status).toBe(201);
    expect((await request(app).get('/api/collection-centers')).body.items).toHaveLength(0);
    await request(app).post(`/api/collection-centers/${c.body.item._id}/verify`).set(a.auth);
    expect((await request(app).get('/api/collection-centers')).body.items).toHaveLength(1);
    expect((await request(app).post('/api/collection-centers').set(a.auth).send({ ...body, latitude: 999 })).status).toBe(400);
  });
  it('export guides require a source URL and are admin-managed', async () => {
    const a = await admin(); const f = await signup('farmer');
    const g = { topic: 'Customs', title: 'Customs overview', content: 'General overview text.', sourceName: 'CBIC', sourceUrl: 'https://www.cbic.gov.in' };
    expect((await request(app).post('/api/export-guides').set(f.auth).send(g)).status).toBe(403);
    expect((await request(app).post('/api/export-guides').set(a.auth).send({ ...g, sourceUrl: undefined })).status).toBe(400);
    expect((await request(app).post('/api/export-guides').set(a.auth).send(g)).status).toBe(201);
    expect((await request(app).get('/api/export-guides')).body.items).toHaveLength(1);
  });
});
