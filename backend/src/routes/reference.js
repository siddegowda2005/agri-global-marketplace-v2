import { Router } from 'express';
import { z } from 'zod';
import { CollectionCenter } from '../models/CollectionCenter.js';
import { ExportGuide } from '../models/ExportGuide.js';
import { asyncHandler, ApiError, validate, objectId } from '../middleware/http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const httpUrl = z.string().url().refine((u) => /^https?:\/\//i.test(u), 'Must be http(s)');
const centerSchema = z.object({ name: z.string().trim().min(2).max(150), kind: z.enum(['collection_center', 'export_facility', 'cold_storage']).default('collection_center'),
  address: z.string().max(300).optional(), state: z.string().max(60).optional(), city: z.string().max(60).optional(),
  latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180), sourceUrl: httpUrl }).strict();
const guideSchema = z.object({ topic: z.string().trim().min(2).max(80), title: z.string().trim().min(3).max(150), content: z.string().trim().min(10).max(5000),
  sourceName: z.string().trim().min(2).max(120), sourceUrl: httpUrl, order: z.coerce.number().int().default(0) }).strict();

function crud(model, schema, { publicFilter = {}, sort = 'name' } = {}) {
  const r = Router();
  r.get('/', asyncHandler(async (req, res) => {
    const f = { ...publicFilter };
    if (req.query.state) f.state = String(req.query.state);
    res.json({ items: await model.find(f).sort(sort).limit(500) });
  }));
  const adminOnly = [authenticate, requireRole('admin')];
  r.get('/all', ...adminOnly, asyncHandler(async (_req, res) => res.json({ items: await model.find().sort(sort).limit(500) })));
  r.post('/', ...adminOnly, validate(schema), asyncHandler(async (req, res) => res.status(201).json({ item: await model.create(req.body) })));
  r.put('/:id', ...adminOnly, validate(schema.partial()), asyncHandler(async (req, res) => {
    if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Not found');
    const it = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!it) throw new ApiError(404, 'Not found'); res.json({ item: it });
  }));
  r.delete('/:id', ...adminOnly, asyncHandler(async (req, res) => {
    if (!objectId.safeParse(req.params.id).success || !(await model.findByIdAndDelete(req.params.id))) throw new ApiError(404, 'Not found');
    res.json({ message: 'Deleted' });
  }));
  return r;
}
export const centers = crud(CollectionCenter, centerSchema, { publicFilter: { verificationStatus: 'verified' } });
centers.post('/:id/verify', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const it = objectId.safeParse(req.params.id).success && await CollectionCenter.findByIdAndUpdate(req.params.id, { verificationStatus: 'verified' }, { new: true });
  if (!it) throw new ApiError(404, 'Not found'); res.json({ item: it });
}));
export const guides = crud(ExportGuide, guideSchema, { sort: 'order' });
