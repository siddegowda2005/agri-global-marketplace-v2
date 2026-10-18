import { Router } from 'express';
import { Company } from '../models/Company.js';
import { Enquiry } from '../models/Enquiry.js';
import { BuyingRequest } from '../models/BuyingRequest.js';
import { User } from '../models/User.js';
import { asyncHandler, ApiError, validate, objectId } from '../middleware/http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { companySchema, enquirySchema, evidenceSchema, rejectSchema } from '../validators/schemas.js';
import { matchCompanies, buildEnquiry, mailtoLink } from '../services/matching.js';
import { esc, hostOf, nameKey } from '../services/matching_extra.js';
import { notify } from '../services/notify.js';
export const companies = Router();
export const enquiries = Router();
const NOTE = 'Listing means the company publicly handles these products. It does not mean it is currently buying from you.';
companies.use(authenticate);
function filterFrom(req) {
  const { type, country, state, city, product, q } = req.query; const f = {};
  if (req.user.role !== 'admin') f.verificationStatus = 'verified';
  else if (req.query.verification) f.verificationStatus = String(req.query.verification);
  if (type) f.type = String(type);
  if (country) f.country = new RegExp(`^${esc(country)}$`, 'i');
  if (state) f.state = new RegExp(`^${esc(state)}$`, 'i');
  if (city) f.city = new RegExp(`^${esc(city)}$`, 'i');
  if (product) f.productsHandled = new RegExp(esc(String(product).toLowerCase()));
  if (q) f.name = new RegExp(esc(q), 'i');
  return f;
}
companies.get('/', asyncHandler(async (req, res) => res.json({ items: await Company.find(filterFrom(req)).sort('name').limit(200), note: NOTE })));
companies.get('/match', requireRole('farmer'), asyncHandler(async (req, res) => {
  const crop = String(req.query.crop || '').trim();
  if (crop.length < 2) throw new ApiError(400, 'crop is required');
  const list = await Company.find({ verificationStatus: 'verified', type: 'international_importer' });
  res.json({ items: matchCompanies(list, { crop, country: req.query.country }), note: NOTE });
}));
// Admin: likely duplicates by normalised name or identical website host.
companies.get('/duplicates', requireRole('admin'), asyncHandler(async (_req, res) => {
  const all = await Company.find().select('name country website type verificationStatus');
  const groups = new Map();
  const add = (k, c) => { if (!k) return; if (!groups.has(k)) groups.set(k, new Map()); groups.get(k).set(String(c._id), c); };
  for (const c of all) { add(`name:${nameKey(c.name)}`, c); add(c.website && `host:${hostOf(c.website)}`, c); }
  const out = [...groups.entries()].filter(([, m]) => m.size > 1).map(([key, m]) => ({ key, items: [...m.values()] }));
  res.json({ groups: out });
}));
companies.get('/:id', asyncHandler(async (req, res) => {
  const c = objectId.safeParse(req.params.id).success && await Company.findById(req.params.id);
  if (!c || (c.verificationStatus !== 'verified' && req.user.role !== 'admin')) throw new ApiError(404, 'Company not found');
  res.json({ company: c, note: NOTE });
}));
const fresh = (b) => ({ ...b, sources: b.sources?.length ? b.sources : [{ url: b.sourceUrl, label: 'Primary source', checkedAt: new Date() }] });
companies.post('/', requireRole('admin'), validate(companySchema), asyncHandler(async (req, res) => res.status(201).json({ company: await Company.create(fresh(req.body)) })));
companies.put('/:id', requireRole('admin'), validate(companySchema.partial()), asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Company not found');
  const c = await Company.findByIdAndUpdate(req.params.id, { ...req.body, verificationStatus: 'unverified', lastVerifiedAt: null }, { new: true, runValidators: true });
  if (!c) throw new ApiError(404, 'Company not found'); res.json({ company: c });
}));
companies.post('/:id/verify', requireRole('admin'), validate(evidenceSchema), asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Company not found');
  const now = new Date();
  const c = await Company.findByIdAndUpdate(req.params.id, { verificationStatus: 'verified', verificationEvidence: req.body.evidence, rejectionReason: null, lastVerifiedAt: now, lastCheckedAt: now }, { new: true });
  if (!c) throw new ApiError(404, 'Company not found'); res.json({ company: c });
}));
companies.post('/:id/reject', requireRole('admin'), validate(rejectSchema), asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Company not found');
  const c = await Company.findByIdAndUpdate(req.params.id, { verificationStatus: 'rejected', rejectionReason: req.body.reason, lastCheckedAt: new Date() }, { new: true });
  if (!c) throw new ApiError(404, 'Company not found'); res.json({ company: c });
}));
companies.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success || !(await Company.findByIdAndDelete(req.params.id))) throw new ApiError(404, 'Company not found');
  await BuyingRequest.deleteMany({ company: req.params.id });
  res.json({ message: 'Deleted' });
}));

// ---- Enquiries: stored internally. The platform never emails companies. ----
const SUBMITTED_NOTICE = 'Saved in AgriGlobal as submitted. It has NOT been delivered to the company: no delivery service is connected. Use the email draft or the company\'s official contact page to reach them yourself.';
const DRAFT_NOTICE = 'Draft only. Your email app opens with this text; you must review and send it yourself.';
enquiries.use(authenticate);
enquiries.post('/', requireRole('farmer'), validate(enquirySchema), asyncHandler(async (req, res) => {
  const { submit, companyId, ...rest } = req.body;
  const company = objectId.safeParse(companyId).success && await Company.findOne({ _id: companyId, verificationStatus: 'verified' });
  if (!company) throw new ApiError(404, 'Company not found');
  const base = buildEnquiry({ farmerName: req.user.name, ...rest });
  const extras = [rest.grade && `Quality/grade: ${rest.grade}`, rest.expectedPriceInr !== undefined && `Expected price: INR ${rest.expectedPriceInr} per ${rest.unit}`, rest.message && `\n${rest.message}`].filter(Boolean).join('\n');
  const body = extras ? base.body.replace('Please share your current sourcing requirements', `${extras}\n\nPlease share your current sourcing requirements`) : base.body;
  const status = submit ? 'submitted' : 'draft';
  const enquiry = await Enquiry.create({ farmer: req.user._id, company: company._id, crop: rest.cropId, ...rest, subject: base.subject, body, status,
    history: [{ status, at: new Date(), note: submit ? 'Submitted internally' : 'Draft created' }], note: submit ? SUBMITTED_NOTICE : DRAFT_NOTICE });
  await notify(req.user._id, 'enquiry_created', `Enquiry ${submit ? 'saved' : 'draft created'} for ${company.name}`, '/enquiries');
  res.status(201).json({ enquiry, mailto: company.email ? mailtoLink(company.email, base.subject, body) : null, notice: submit ? SUBMITTED_NOTICE : DRAFT_NOTICE });
}));
enquiries.get('/', requireRole('farmer'), asyncHandler(async (req, res) => res.json({ items: await Enquiry.find({ farmer: req.user._id }).populate('company', 'name country website email').sort('-createdAt').limit(200) })));
enquiries.post('/:id/submit', requireRole('farmer'), asyncHandler(async (req, res) => {
  const e = objectId.safeParse(req.params.id).success && await Enquiry.findOneAndUpdate({ _id: req.params.id, farmer: req.user._id, status: 'draft' },
    { status: 'submitted', note: SUBMITTED_NOTICE, $push: { history: { status: 'submitted', at: new Date(), note: 'Submitted internally' } } }, { new: true });
  if (!e) throw new ApiError(404, 'Draft not found'); res.json({ enquiry: e, notice: SUBMITTED_NOTICE });
}));
enquiries.delete('/:id', requireRole('farmer'), asyncHandler(async (req, res) => {
  const e = objectId.safeParse(req.params.id).success && await Enquiry.findOneAndDelete({ _id: req.params.id, farmer: req.user._id, status: 'draft' });
  if (!e) throw new ApiError(404, 'Only your own drafts can be deleted'); res.json({ message: 'Deleted' });
}));
// Admin review: contact details of farmers are visible to admins only.
enquiries.get('/admin/all', requireRole('admin'), asyncHandler(async (_req, res) => res.json({ items: await Enquiry.find().populate('farmer', 'name email phone').populate('company', 'name country email').sort('-createdAt').limit(500) })));
enquiries.patch('/admin/:id/status', requireRole('admin'), asyncHandler(async (req, res) => {
  const { status, note } = req.body || {};
  if (!['delivery_attempted', 'delivered', 'failed'].includes(status)) throw new ApiError(400, 'status must be delivery_attempted, delivered or failed');
  const e = objectId.safeParse(req.params.id).success && await Enquiry.findOneAndUpdate({ _id: req.params.id, status: { $ne: 'draft' } },
    { status, $push: { history: { status, at: new Date(), note: String(note || '').slice(0, 300) } } }, { new: true });
  if (!e) throw new ApiError(404, 'Submitted enquiry not found');
  await notify(e.farmer, 'enquiry_status', `Enquiry status changed to ${status.replace('_', ' ')}`, '/enquiries');
  res.json({ enquiry: e });
}));
