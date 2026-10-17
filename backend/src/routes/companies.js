import { Router } from 'express';
import { Company } from '../models/Company.js';
import { Crop } from '../models/Crop.js';
import { User } from '../models/User.js';
import { Enquiry } from '../models/Enquiry.js';
import { asyncHandler, ApiError, validate, objectId } from '../middleware/http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { companySchema, enquirySchema } from '../validators/schemas.js';
import { matchCompanies, buildEnquiry, mailtoLink } from '../services/matching.js';
import { notify } from '../services/notify.js';
export const companies = Router();
export const enquiries = Router();
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
companies.get('/', asyncHandler(async (req, res) => res.json({ items: await Company.find(filterFrom(req)).sort('name').limit(100), note: NOTE })));
companies.get('/match', requireRole('farmer'), asyncHandler(async (req, res) => {
  const crop = String(req.query.crop || '').trim();
  if (crop.length < 2) throw new ApiError(400, 'crop is required');
  const list = await Company.find({ verificationStatus: 'verified', type: 'international_importer' });
  res.json({ items: matchCompanies(list, { crop, country: req.query.country }), note: NOTE });
}));
companies.get('/:id', asyncHandler(async (req, res) => {
  const c = objectId.safeParse(req.params.id).success && await Company.findById(req.params.id);
  if (!c || (c.verificationStatus !== 'verified' && req.user.role !== 'admin')) throw new ApiError(404, 'Company not found');
  res.json({ company: c, note: NOTE });
}));
companies.post('/', requireRole('admin'), validate(companySchema), asyncHandler(async (req, res) => res.status(201).json({ company: await Company.create(req.body) })));
companies.put('/:id', requireRole('admin'), validate(companySchema.partial()), asyncHandler(async (req, res) => {
  const c = await Company.findByIdAndUpdate(req.params.id, { ...req.body, verificationStatus: 'unverified', lastVerifiedAt: null }, { new: true, runValidators: true });
  if (!c) throw new ApiError(404, 'Company not found'); res.json({ company: c });
}));
companies.post('/:id/verify', requireRole('admin'), asyncHandler(async (req, res) => {
  const c = await Company.findByIdAndUpdate(req.params.id, { verificationStatus: 'verified', lastVerifiedAt: new Date() }, { new: true });
  if (!c) throw new ApiError(404, 'Company not found'); res.json({ company: c });
}));
companies.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  if (!(await Company.findByIdAndDelete(req.params.id))) throw new ApiError(404, 'Company not found'); res.json({ message: 'Deleted' });
}));
// Enquiry drafts: stored for the farmer's records; nothing is sent by the platform.
enquiries.post('/', authenticate, requireRole('farmer'), validate(enquirySchema), asyncHandler(async (req, res) => {
  const company = await Company.findOne({ _id: req.body.companyId, verificationStatus: 'verified' });
  if (!company) throw new ApiError(404, 'Company not found');
  const { subject, body } = buildEnquiry({ farmerName: req.user.name, ...req.body });
  const enquiry = await Enquiry.create({ farmer: req.user._id, company: company._id, ...req.body, subject, body });
  await notify(req.user._id, 'enquiry_created', `Enquiry draft created for ${company.name}`, `/companies/${company._id}`);
  res.status(201).json({ enquiry, mailto: company.email ? mailtoLink(company.email, subject, body) : null,
    notice: 'Draft only. Your email app opens with this text; you must review and send it yourself.' });
}));
enquiries.get('/', authenticate, requireRole('farmer'), asyncHandler(async (req, res) => res.json({ items: await Enquiry.find({ farmer: req.user._id }).populate('company', 'name country').sort('-createdAt') })));
