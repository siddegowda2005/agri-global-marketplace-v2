import { Router } from 'express';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Crop } from '../models/Crop.js';
import { Order } from '../models/Order.js';
import { Company } from '../models/Company.js';
import { asyncHandler, ApiError, validate, objectId } from '../middleware/http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getRates, convertFromInr, SUPPORTED } from '../services/currency.js';
import { aiPriceSchema, aiCropSchema } from '../validators/schemas.js';
import { env } from '../config/env.js';
export const notifications = Router();
notifications.use(authenticate);
notifications.get('/', asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([Notification.find({ user: req.user._id }).sort('-createdAt').limit(100), Notification.countDocuments({ user: req.user._id, read: false })]);
  res.json({ items, unread });
}));
notifications.post('/read-all', asyncHandler(async (req, res) => { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ message: 'ok' }); }));
notifications.patch('/:id/read', asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Not found');
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) throw new ApiError(404, 'Not found'); res.json({ notification: n });
}));

export const currency = Router();
currency.get('/rates', asyncHandler(async (_req, res) => {
  const r = await getRates();
  if (!r) return res.json({ available: false, base: 'INR', message: 'Exchange rates unavailable; showing INR prices.' });
  res.json({ available: true, ...r });
}));
currency.get('/convert', asyncHandler(async (req, res) => {
  const amount = Number(req.query.amount), to = String(req.query.to || '');
  if (!(amount >= 0) || !SUPPORTED.includes(to)) throw new ApiError(400, 'Invalid amount or currency');
  const r = await getRates(); const value = r ? convertFromInr(amount, to, r.rates) : null;
  res.json(value === null ? { available: false, amountInr: amount } : { available: true, amountInr: amount, currency: to, value, fetchedAt: r.fetchedAt, source: r.source });
}));

export const ai = Router();
let aiFetch = (...a) => fetch(...a);
export const setAiFetch = (fn) => { aiFetch = fn; };
async function forward(path, body, res) {
  try {
    const r = await aiFetch(`${env.aiUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    const data = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : r.status === 503 ? 503 : 502).json(r.ok ? data : { message: data.detail || 'AI service error' });
  } catch { return res.status(503).json({ message: 'AI service is currently unavailable' }); }
}
ai.use(authenticate, requireRole('farmer'));
ai.post('/price-prediction', validate(aiPriceSchema), (req, res) => forward('/predict/price', req.body, res));
ai.post('/crop-recommendation', validate(aiCropSchema), (req, res) => forward('/recommend/crop', req.body, res));

export const admin = Router();
admin.use(authenticate, requireRole('admin'));
admin.get('/users', asyncHandler(async (_req, res) => res.json({ items: await User.find().sort('-createdAt').limit(500) })));
admin.patch('/users/:id', asyncHandler(async (req, res) => {
  if (typeof req.body.active !== 'boolean') throw new ApiError(400, 'active (boolean) required');
  const u = objectId.safeParse(req.params.id).success && await User.findById(req.params.id);
  if (!u) throw new ApiError(404, 'User not found');
  if (u.role === 'admin') throw new ApiError(403, 'Admin accounts cannot be changed here');
  u.active = req.body.active; await u.save(); res.json({ user: u.toSafe() });
}));
admin.get('/crops', asyncHandler(async (_req, res) => res.json({ items: await Crop.find().populate('farmer', 'name').sort('-createdAt').limit(500) })));
admin.get('/orders', asyncHandler(async (_req, res) => res.json({ items: await Order.find().sort('-createdAt').limit(500) })));
admin.get('/stats', asyncHandler(async (_req, res) => {
  const [farmers, buyers, crops, orders, companies, verified] = await Promise.all([
    User.countDocuments({ role: 'farmer' }), User.countDocuments({ role: 'buyer' }), Crop.countDocuments(), Order.countDocuments(), Company.countDocuments(), Company.countDocuments({ verificationStatus: 'verified' })]);
  res.json({ farmers, buyers, crops, orders, companies, verifiedCompanies: verified });
}));
