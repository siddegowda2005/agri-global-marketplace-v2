import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app, mongod, M, miscRoutes, n = 0;
beforeAll(async () => {
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'agri-up2-'));
  mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri());
  app = (await import('../app.js')).createApp();
  M = { User: (await import('../models/User.js')).User, Company: (await import('../models/Company.js')).Company, BR: (await import('../models/BuyingRequest.js')).BuyingRequest, Enquiry: (await import('../models/Enquiry.js')).Enquiry };
  await Promise.all(Object.values(M).map((m) => m.init())); miscRoutes = await import('../routes/misc.js');
});
afterAll(async () => { await mongoose.disconnect(); await mongod?.stop(); });
beforeEach(async () => { await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))); });

async function signup(role) { n += 1; const r = await request(app).post('/api/auth/register').send({ name: `User ${n}`, email: `v${n}@example.com`, password: 'Passw0rdTest', role }); return { auth: { Authorization: `Bearer ${r.body.token}` }, user: r.body.user }; }
async function admin() { const bcrypt = (await import('bcryptjs')).default; n += 1; await M.User.create({ name: 'Admin', email: `va${n}@example.com`, role: 'admin', passwordHash: await bcrypt.hash('Passw0rdTest', 4) }); const r = await request(app).post('/api/auth/login').send({ email: `va${n}@example.com`, password: 'Passw0rdTest' }); return { auth: { Authorization: `Bearer ${r.body.token}` } }; }
const EVID = { evidence: 'Checked the official website and contact page' };
const co = (o = {}) => ({ type: 'international_importer', name: 'Alpha Fresh Imports', country: 'UAE', city: 'Dubai', buyerType: 'importer', productsHandled: ['tomato', 'onion'], productCategories: ['vegetables'], sourceUrl: 'https://example.com/a', website: 'https://example.com', email: 'buy@example.com', ...o });
async function mkCompany(a, o, verify = true) { const c = (await request(app).post('/api/companies').set(a.auth).send(co(o))).body.company; if (verify) await request(app).post(`/api/companies/${c._id}/verify`).set(a.auth).send(EVID); return c; }
const day = 86400000;
const reqBody = (companyId, o = {}) => ({ company: companyId, crop: 'Tomato', quantity: 5000, unit: 'kg', requestDate: new Date().toISOString(), sourceUrl: 'https://example.com/req', ...o });

describe('company verification evidence', () => {
  it('requires evidence to verify, supports reject, and hides unverified/rejected from farmers', async () => {
    const a = await admin(); const f = await signup('farmer'); const c = await mkCompany(a, {}, false);
    expect((await request(app).post(`/api/companies/${c._id}/verify`).set(a.auth).send({})).status).toBe(400);
    expect((await request(app).get('/api/global-buyers').set(f.auth)).body.items).toHaveLength(0);
    const v = await request(app).post(`/api/companies/${c._id}/verify`).set(a.auth).send(EVID); expect(v.body.company.verificationEvidence).toBeTruthy(); expect(v.body.company.lastVerifiedAt).toBeTruthy();
    expect((await request(app).get('/api/global-buyers').set(f.auth)).body.items).toHaveLength(1);
    const rj = await request(app).post(`/api/companies/${c._id}/reject`).set(a.auth).send({ reason: 'Website could not be confirmed' }); expect(rj.body.company.verificationStatus).toBe('rejected');
    expect((await request(app).get('/api/global-buyers').set(f.auth)).body.items).toHaveLength(0);
    expect((await request(app).post(`/api/companies/${c._id}/verify`).set(f.auth).send(EVID)).status).toBe(403);
  });
  it('detects duplicates by normalised name and website host', async () => {
    const a = await admin();
    await mkCompany(a, { name: 'Beta Trading LLC', country: 'UAE', website: 'https://www.beta.example' }, false);
    await mkCompany(a, { name: 'Beta Trading Ltd', country: 'UK', website: 'https://beta.example/contact' }, false);
    const d = await request(app).get('/api/companies/duplicates').set(a.auth); expect(d.body.groups.length).toBeGreaterThanOrEqual(1);
    expect((await request(app).get('/api/companies/duplicates').set((await signup('farmer')).auth)).status).toBe(403);
  });
});

describe('country normalisation', () => {
  it('stores canonical names and matches filters either way', async () => {
    const a = await admin(); const f = await signup('farmer');
    const c = await mkCompany(a, { country: 'United Arab Emirates' }); expect(c.country).toBe('UAE');
    expect((await request(app).get('/api/global-buyers?country=United%20Arab%20Emirates').set(f.auth)).body.total).toBe(1);
  });
});

describe('global buyers search and filters', () => {
  it('filters combine, partial/plural crop terms match, Indian exporters excluded, pagination works', async () => {
    const a = await admin(); const f = await signup('farmer');
    await mkCompany(a, { name: 'Alpha Fresh Imports', country: 'UAE', productsHandled: ['tomato', 'onion'], buyerType: 'importer' });
    await mkCompany(a, { name: 'Gamma Wholesale', country: 'Singapore', productsHandled: ['tomatoes', 'mango'], productCategories: ['fruits'], buyerType: 'wholesaler' });
    await mkCompany(a, { name: 'Delta Exports', type: 'indian_exporter', country: 'India', productsHandled: ['tomato'] });
    const get = (qs) => request(app).get(`/api/global-buyers?${qs}`).set(f.auth);
    expect((await get('crop=tomato')).body.total).toBe(2);
    expect((await get('crop=tomatoes')).body.total).toBe(2);
    expect((await get('crop=tom')).body.total).toBe(2);
    expect((await get('crop=tomato&country=uae')).body.items.map((c) => c.name)).toEqual(['Alpha Fresh Imports']);
    expect((await get('crop=tomato&buyerType=wholesaler')).body.items.map((c) => c.name)).toEqual(['Gamma Wholesale']);
    expect((await get('category=fruits')).body.total).toBe(1);
    expect((await get('q=alpha')).body.total).toBe(1);
    expect((await get('crop=wheat')).body.total).toBe(0);
    const p = await get('limit=1&page=2'); expect(p.body.items).toHaveLength(1); expect(p.body.pages).toBe(2);
    expect((await get('buyerType=bogus')).status).toBe(400);
    expect((await request(app).get('/api/global-buyers')).status).toBe(401);
  });
});

describe('buying requests: only verified, recent, unexpired requests count as active', () => {
  it('lifecycle', async () => {
    const a = await admin(); const f = await signup('farmer'); const c = await mkCompany(a, {});
    const created = await request(app).post('/api/buying-requests').set(a.auth).send(reqBody(c._id)); expect(created.status).toBe(201); expect(created.body.item.state).toBe('unverified');
    const status = async () => (await request(app).get('/api/global-buyers?crop=tomato').set(f.auth)).body.items[0].buyingStatus;
    expect(await status()).toBe('Potential Buyer');
    expect((await request(app).get('/api/global-buyers/requests').set(f.auth)).body.emptyMessage).toBe('No verified active buying requests available.');
    expect((await request(app).post(`/api/buying-requests/${created.body.item._id}/verify`).set(a.auth).send({})).status).toBe(400);
    await request(app).post(`/api/buying-requests/${created.body.item._id}/verify`).set(a.auth).send(EVID);
    expect(await status()).toBe('Currently Buying');
    expect((await request(app).get('/api/global-buyers?crop=tomato&status=currently_buying').set(f.auth)).body.total).toBe(1);
    expect((await request(app).get('/api/global-buyers?crop=onion&status=currently_buying').set(f.auth)).body.total).toBe(0);
    expect((await request(app).get('/api/global-buyers?crop=onion&status=potential').set(f.auth)).body.total).toBe(1);
    expect((await request(app).get('/api/global-buyers/requests?crop=tomato').set(f.auth)).body.items).toHaveLength(1);
    await M.BR.updateOne({ _id: created.body.item._id }, { expiresAt: new Date(Date.now() - day) });
    expect(await status()).toBe('Potential Buyer');
    await M.BR.updateOne({ _id: created.body.item._id }, { expiresAt: null, lastCheckedAt: new Date(Date.now() - 45 * day) });
    expect(await status()).toBe('Potential Buyer');
    await request(app).post(`/api/buying-requests/${created.body.item._id}/recheck`).set(a.auth); expect(await status()).toBe('Currently Buying');
    await request(app).post(`/api/buying-requests/${created.body.item._id}/close`).set(a.auth); expect(await status()).toBe('Potential Buyer');
  });
  it('is admin-only and editing resets verification', async () => {
    const a = await admin(); const f = await signup('farmer'); const c = await mkCompany(a, {});
    expect((await request(app).post('/api/buying-requests').set(f.auth).send(reqBody(c._id))).status).toBe(403);
    const r = (await request(app).post('/api/buying-requests').set(a.auth).send(reqBody(c._id))).body.item;
    await request(app).post(`/api/buying-requests/${r._id}/verify`).set(a.auth).send(EVID);
    const u = await request(app).put(`/api/buying-requests/${r._id}`).set(a.auth).send({ quantity: 100 }); expect(u.body.item.verificationStatus).toBe('unverified');
    expect((await request(app).post('/api/buying-requests').set(a.auth).send({ ...reqBody(c._id), sourceUrl: 'javascript:1' })).status).toBe(400);
  });
});

describe('enquiry workflow', () => {
  it('draft -> submitted internally -> admin records delivery outcome; never claims delivery', async () => {
    const a = await admin(); const f = await signup('farmer'); const other = await signup('farmer'); const c = await mkCompany(a, {});
    const base = { companyId: c._id, cropName: 'Tomato', quantity: 500, unit: 'kg', location: 'Mysuru, Karnataka', expectedPriceInr: 28, grade: 'A', message: 'Available from December.', contactPreference: 'email' };
    const d = await request(app).post('/api/enquiries').set(f.auth).send(base); expect(d.status).toBe(201); expect(d.body.enquiry.status).toBe('draft'); expect(d.body.enquiry.body).toContain('Quality/grade: A'); expect(d.body.mailto).toMatch(/^mailto:/);
    const s = await request(app).post(`/api/enquiries/${d.body.enquiry._id}/submit`).set(f.auth); expect(s.body.enquiry.status).toBe('submitted'); expect(s.body.notice).toMatch(/NOT been delivered/);
    expect((await request(app).post(`/api/enquiries/${d.body.enquiry._id}/submit`).set(other.auth)).status).toBe(404);
    const direct = await request(app).post('/api/enquiries').set(f.auth).send({ ...base, submit: true }); expect(direct.body.enquiry.status).toBe('submitted');
    expect((await request(app).patch(`/api/enquiries/admin/${direct.body.enquiry._id}/status`).set(f.auth).send({ status: 'delivered' })).status).toBe(403);
    expect((await request(app).patch(`/api/enquiries/admin/${direct.body.enquiry._id}/status`).set(a.auth).send({ status: 'bogus' })).status).toBe(400);
    const done = await request(app).patch(`/api/enquiries/admin/${direct.body.enquiry._id}/status`).set(a.auth).send({ status: 'delivery_attempted', note: 'Emailed by admin' }); expect(done.body.enquiry.status).toBe('delivery_attempted');
    const mine = (await request(app).get('/api/enquiries').set(f.auth)).body.items; expect(mine).toHaveLength(2);
    expect((await request(app).get('/api/enquiries').set(other.auth)).body.items).toHaveLength(0);
    const all = await request(app).get('/api/enquiries/admin/all').set(a.auth); expect(all.body.items[0].farmer.email).toBeTruthy();
    expect((await request(app).get('/api/enquiries/admin/all').set(f.auth)).status).toBe(403);
  });
  it('rejects invalid input and unverified companies; drafts can be deleted, submitted cannot', async () => {
    const a = await admin(); const f = await signup('farmer'); const u = await mkCompany(a, { name: 'Unverified Co' }, false); const c = await mkCompany(a, {});
    const body = { cropName: 'Tomato', quantity: 5, unit: 'kg', location: 'Mysuru' };
    expect((await request(app).post('/api/enquiries').set(f.auth).send({ ...body, companyId: u._id })).status).toBe(404);
    expect((await request(app).post('/api/enquiries').set(f.auth).send({ ...body, companyId: c._id, quantity: -1 })).status).toBe(400);
    expect((await request(app).post('/api/enquiries').send({ ...body, companyId: c._id })).status).toBe(401);
    const d = (await request(app).post('/api/enquiries').set(f.auth).send({ ...body, companyId: c._id })).body.enquiry;
    expect((await request(app).delete(`/api/enquiries/${d._id}`).set(f.auth)).status).toBe(200);
    const s = (await request(app).post('/api/enquiries').set(f.auth).send({ ...body, companyId: c._id, submit: true })).body.enquiry;
    expect((await request(app).delete(`/api/enquiries/${s._id}`).set(f.auth)).status).toBe(404);
  });
});

describe('AI proxy diagnostics', () => {
  it('distinguishes unreachable, untrained and bad input; exposes status', async () => {
    const f = await signup('farmer');
    miscRoutes.setAiFetch(async () => { throw new Error('ECONNREFUSED'); });
    let r = await request(app).post('/api/ai/price-prediction').set(f.auth).send({ crop: 'Tomato' }); expect(r.status).toBe(503); expect(r.body.code).toBe('AI_UNREACHABLE');
    expect((await request(app).get('/api/ai/status').set(f.auth)).body.reachable).toBe(false);
    miscRoutes.setAiFetch(async () => ({ ok: false, status: 503, json: async () => ({ detail: 'price_model has not been trained yet.' }) }));
    r = await request(app).post('/api/ai/price-prediction').set(f.auth).send({ crop: 'Tomato' }); expect(r.body.code).toBe('MODEL_NOT_TRAINED'); expect(r.body.message).toMatch(/not been trained/);
    miscRoutes.setAiFetch(async () => ({ ok: false, status: 422, json: async () => ({ detail: "Crop 'x' was not in the training data." }) }));
    r = await request(app).post('/api/ai/price-prediction').set(f.auth).send({ crop: 'Tomato' }); expect(r.status).toBe(422);
    miscRoutes.setAiFetch(async () => ({ ok: true, status: 200, json: async () => ({ models: { price_model: { loaded: true } } }) }));
    expect((await request(app).get('/api/ai/status').set(f.auth)).body.models.price_model.loaded).toBe(true);
  });
});
