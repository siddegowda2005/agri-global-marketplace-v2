import { Router } from 'express';
import { Crop } from '../models/Crop.js';
import { Order } from '../models/Order.js';
import { asyncHandler, ApiError, validate, objectId } from '../middleware/http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { uploadImages, removeFiles } from '../middleware/upload.js';
import { cropSchema, cropUpdateSchema, cropQuerySchema } from '../validators/schemas.js';
import { notify } from '../services/notify.js';
const r = Router();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const urls = (files = []) => files.map((f) => `/uploads/${f.filename}`);

r.get('/', validate(cropQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const { q, category, state, minPrice, maxPrice, page, limit } = req.query;
  const f = { status: 'available', quantity: { $gt: 0 } };
  if (q) f.$or = [{ name: new RegExp(esc(q), 'i') }, { description: new RegExp(esc(q), 'i') }];
  if (category) f.category = category;
  if (state) f.state = new RegExp(`^${esc(state)}$`, 'i');
  if (minPrice !== undefined || maxPrice !== undefined) f.priceInr = { ...(minPrice !== undefined && { $gte: minPrice }), ...(maxPrice !== undefined && { $lte: maxPrice }) };
  const [items, total] = await Promise.all([
    Crop.find(f).populate('farmer', 'name city state').sort('-createdAt').skip((page - 1) * limit).limit(limit), Crop.countDocuments(f)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));
r.get('/mine', authenticate, requireRole('farmer'), asyncHandler(async (req, res) => res.json({ items: await Crop.find({ farmer: req.user._id }).sort('-createdAt') })));
r.get('/:id', asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Crop not found');
  const crop = await Crop.findById(req.params.id).populate('farmer', 'name city state country');
  if (!crop) throw new ApiError(404, 'Crop not found');
  res.json({ crop });
}));
r.post('/', authenticate, requireRole('farmer'), (req, res, next) => uploadImages(req, res, next), validate(cropSchema), asyncHandler(async (req, res) => {
  const crop = await Crop.create({ ...req.body, images: urls(req.files), farmer: req.user._id });
  res.status(201).json({ crop });
}));
async function ownCrop(req) {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Crop not found');
  const crop = await Crop.findById(req.params.id);
  if (!crop) throw new ApiError(404, 'Crop not found');
  if (req.user.role !== 'admin' && String(crop.farmer) !== String(req.user._id)) throw new ApiError(403, 'You can only modify your own crops');
  return crop;
}
r.put('/:id', authenticate, requireRole('farmer'), (req, res, next) => uploadImages(req, res, next), validate(cropUpdateSchema), asyncHandler(async (req, res) => {
  const crop = await ownCrop(req);
  const { keepImages, ...fields } = req.body;
  const keep = keepImages === undefined ? crop.images : crop.images.filter((i) => keepImages.split(',').includes(i));
  const dropped = crop.images.filter((i) => !keep.includes(i));
  Object.assign(crop, fields, { images: [...keep, ...urls(req.files)].slice(0, 5) });
  await crop.save(); removeFiles(dropped);
  await notify(crop.farmer, 'crop_updated', `Your listing "${crop.name}" was updated`, `/crops/${crop._id}`);
  res.json({ crop });
}));
r.delete('/:id', authenticate, requireRole('farmer', 'admin'), asyncHandler(async (req, res) => {
  const crop = await ownCrop(req);
  if (await Order.exists({ crop: crop._id, status: { $in: ['Pending', 'Accepted', 'Confirmed', 'Ready for Collection'] } }))
    throw new ApiError(409, 'Crop has active orders; resolve them before deleting');
  await crop.deleteOne(); removeFiles(crop.images);
  res.json({ message: 'Crop deleted' });
}));
export default r;
