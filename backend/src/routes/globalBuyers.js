import { Router } from 'express';
import { Company } from '../models/Company.js';
import { BuyingRequest, activeFilter, requestState, STALE_DAYS } from '../models/BuyingRequest.js';
import { asyncHandler, ApiError, validate, objectId } from '../middleware/http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { buyingRequestSchema, evidenceSchema } from '../validators/schemas.js';
import { stem, esc, normCountry } from '../services/matching_extra.js';
import { z } from 'zod';

export const globalBuyers = Router();
export const buyingRequests = Router();
const NOTE = 'Importers listed here publicly handle these products. "Currently Buying" appears only when an admin has verified a recent, unexpired buying request from a cited source.';
globalBuyers.use(authenticate);

const qSchema = z.object({
  crop: z.string().trim().max(60).optional(), country: z.string().trim().max(60).optional(), q: z.string().trim().max(100).optional(),
  buyerType: z.enum(['importer', 'wholesaler', 'distributor', 'retailer', 'processor', 'other']).optional(), category: z.string().trim().max(60).optional(),
  status: z.enum(['currently_buying', 'potential']).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(12),
});
const reqCropFilter = (crop) => (crop ? { crop: new RegExp(esc(stem(crop))) } : {});

globalBuyers.get('/', validate(qSchema, 'query'), asyncHandler(async (req, res) => {
  const { crop, country, q, buyerType, category, status, page, limit } = req.query;
  const now = new Date();
  const f = { type: 'international_importer', verificationStatus: 'verified' };
  if (crop) f.productsHandled = new RegExp(esc(stem(crop)));
  if (country) f.country = new RegExp(`^${esc(normCountry(country))}$`, 'i');
  if (q) f.name = new RegExp(esc(q), 'i');
  if (buyerType) f.buyerType = buyerType;
  if (category) f.productCategories = new RegExp(esc(category.toLowerCase()));
  if (status) {
    const ids = await BuyingRequest.distinct('company', { ...activeFilter(now), ...reqCropFilter(crop) });
    f._id = status === 'currently_buying' ? { $in: ids } : { $nin: ids };
  }
  const [items, total] = await Promise.all([Company.find(f).sort('name').skip((page - 1) * limit).limit(limit).lean(), Company.countDocuments(f)]);
  const reqs = await BuyingRequest.find({ ...activeFilter(now), company: { $in: items.map((c) => c._id) }, ...reqCropFilter(crop) }).sort('-requestDate').lean();
  const byCompany = {}; for (const r of reqs) (byCompany[r.company] ||= []).push(r);
  res.json({ items: items.map((c) => ({ ...c, activeRequests: byCompany[c._id] || [], buyingStatus: byCompany[c._id]?.length ? 'Currently Buying' : 'Potential Buyer' })),
    total, page, pages: Math.ceil(total / limit), note: NOTE });
}));
globalBuyers.get('/requests', validate(qSchema.pick({ crop: true, country: true, page: true, limit: true }), 'query'), asyncHandler(async (req, res) => {
  const { crop, country, page, limit } = req.query; const now = new Date();
  const companyF = { type: 'international_importer', verificationStatus: 'verified' };
  if (country) companyF.country = new RegExp(`^${esc(normCountry(country))}$`, 'i');
  const companyIds = await Company.distinct('_id', companyF);
  const f = { ...activeFilter(now), company: { $in: companyIds }, ...reqCropFilter(crop) };
  const [items, total] = await Promise.all([BuyingRequest.find(f).populate('company', 'name country city website email phone whatsapp contactPage').sort('-requestDate').skip((page - 1) * limit).limit(limit), BuyingRequest.countDocuments(f)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit), staleAfterDays: STALE_DAYS,
    emptyMessage: total ? undefined : 'No verified active buying requests available.' });
}));
globalBuyers.get('/:id', asyncHandler(async (req, res) => {
  const c = objectId.safeParse(req.params.id).success && await Company.findOne({ _id: req.params.id, type: 'international_importer', verificationStatus: 'verified' }).lean();
  if (!c) throw new ApiError(404, 'Company not found');
  const activeRequests = await BuyingRequest.find({ ...activeFilter(), company: c._id }).sort('-requestDate').lean();
  res.json({ company: { ...c, activeRequests, buyingStatus: activeRequests.length ? 'Currently Buying' : 'Potential Buyer' }, note: NOTE });
}));

// Admin management of buying requests. Verification requires written evidence.
buyingRequests.use(authenticate, requireRole('admin'));
const withState = (r) => ({ ...(r.toObject?.() ?? r), state: requestState(r) });
buyingRequests.get('/all', asyncHandler(async (_req, res) => res.json({ items: (await BuyingRequest.find().populate('company', 'name country').sort('-requestDate').limit(500)).map(withState) })));
buyingRequests.post('/', validate(buyingRequestSchema), asyncHandler(async (req, res) => {
  if (!(await Company.exists({ _id: req.body.company }))) throw new ApiError(404, 'Company not found');
  res.status(201).json({ item: withState(await BuyingRequest.create(req.body)) });
}));
buyingRequests.put('/:id', validate(buyingRequestSchema.partial()), asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Not found');
  const r = await BuyingRequest.findByIdAndUpdate(req.params.id, { ...req.body, verificationStatus: 'unverified' }, { new: true, runValidators: true });
  if (!r) throw new ApiError(404, 'Not found'); res.json({ item: withState(r) });
}));
buyingRequests.post('/:id/verify', validate(evidenceSchema), asyncHandler(async (req, res) => {
  const r = objectId.safeParse(req.params.id).success && await BuyingRequest.findByIdAndUpdate(req.params.id, { verificationStatus: 'verified', verificationEvidence: req.body.evidence, lastCheckedAt: new Date() }, { new: true });
  if (!r) throw new ApiError(404, 'Not found'); res.json({ item: withState(r) });
}));
buyingRequests.post('/:id/recheck', asyncHandler(async (req, res) => {
  const r = objectId.safeParse(req.params.id).success && await BuyingRequest.findOneAndUpdate({ _id: req.params.id, verificationStatus: 'verified' }, { lastCheckedAt: new Date() }, { new: true });
  if (!r) throw new ApiError(404, 'Verified request not found'); res.json({ item: withState(r) });
}));
buyingRequests.post('/:id/close', asyncHandler(async (req, res) => {
  const r = objectId.safeParse(req.params.id).success && await BuyingRequest.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
  if (!r) throw new ApiError(404, 'Not found'); res.json({ item: withState(r) });
}));
buyingRequests.delete('/:id', asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success || !(await BuyingRequest.findByIdAndDelete(req.params.id))) throw new ApiError(404, 'Not found'); res.json({ message: 'Deleted' });
}));
