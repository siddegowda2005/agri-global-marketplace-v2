import { Router } from 'express';
import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Crop } from '../models/Crop.js';
import { asyncHandler, ApiError, validate, objectId } from '../middleware/http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { orderSchema, statusSchema, cartItemSchema, checkoutSchema } from '../validators/schemas.js';
import { placeOrder, changeStatus } from '../services/orders.js';
export const ORDER_NOTICE = 'Order enquiry and confirmation only. Actual export and payment arrangements are handled outside this platform.';
export const orders = Router();
export const cart = Router();
orders.use(authenticate);
orders.post('/', requireRole('buyer'), validate(orderSchema), asyncHandler(async (req, res) => {
  const { order, duplicate } = await placeOrder(req.user, req.body);
  res.status(duplicate ? 200 : 201).json({ order, duplicate, notice: ORDER_NOTICE });
}));
orders.post('/checkout', requireRole('buyer'), validate(checkoutSchema), asyncHandler(async (req, res) => {
  const c = await Cart.findOne({ buyer: req.user._id });
  if (!c || !c.items.length) throw new ApiError(400, 'Cart is empty');
  const placed = [], failed = [];
  for (const item of c.items) {
    try {
      const { order } = await placeOrder(req.user, { cropId: item.crop, quantity: item.quantity, idempotencyKey: `${req.body.idempotencyKey}:${item.crop}`, note: req.body.note });
      placed.push(order);
    } catch (e) { failed.push({ cropId: item.crop, message: e.message }); }
  }
  const placedCrops = new Set(placed.map((o) => String(o.crop)));
  c.items = c.items.filter((i) => !placedCrops.has(String(i.crop))); await c.save();
  res.status(placed.length ? 201 : 409).json({ orders: placed, failed, notice: ORDER_NOTICE });
}));
orders.get('/', asyncHandler(async (req, res) => {
  const f = req.user.role === 'farmer' ? { farmer: req.user._id } : req.user.role === 'buyer' ? { buyer: req.user._id } : {};
  if (req.query.status) f.status = String(req.query.status);
  res.json({ items: await Order.find(f).populate('buyer', 'name country').populate('farmer', 'name').sort('-createdAt').limit(200) });
}));
orders.get('/:id', asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Order not found');
  const o = await Order.findById(req.params.id).populate('buyer', 'name country email').populate('farmer', 'name phone');
  const id = String(req.user._id);
  if (!o || (req.user.role !== 'admin' && String(o.buyer._id) !== id && String(o.farmer._id) !== id)) throw new ApiError(404, 'Order not found');
  res.json({ order: o, notice: ORDER_NOTICE });
}));
orders.patch('/:id/status', requireRole('farmer', 'buyer'), validate(statusSchema), asyncHandler(async (req, res) => {
  if (!objectId.safeParse(req.params.id).success) throw new ApiError(404, 'Order not found');
  res.json({ order: await changeStatus(req.user, req.params.id, req.body.status) });
}));

cart.use(authenticate, requireRole('buyer'));
cart.get('/', asyncHandler(async (req, res) => {
  const c = await Cart.findOne({ buyer: req.user._id }).populate('items.crop');
  res.json({ items: (c?.items || []).filter((i) => i.crop) });
}));
cart.put('/items', validate(cartItemSchema), asyncHandler(async (req, res) => {
  const crop = await Crop.findById(req.body.cropId);
  if (!crop || crop.status !== 'available') throw new ApiError(404, 'Crop not available');
  if (req.body.quantity > crop.quantity) throw new ApiError(409, `Only ${crop.quantity} ${crop.unit} available`);
  const c = (await Cart.findOne({ buyer: req.user._id })) || new Cart({ buyer: req.user._id, items: [] });
  const line = c.items.find((i) => String(i.crop) === req.body.cropId);
  if (line) line.quantity = req.body.quantity; else c.items.push({ crop: crop._id, quantity: req.body.quantity });
  await c.save(); res.json({ items: c.items });
}));
cart.delete('/items/:cropId', asyncHandler(async (req, res) => {
  await Cart.updateOne({ buyer: req.user._id }, { $pull: { items: { crop: req.params.cropId } } });
  res.json({ message: 'Removed' });
}));
