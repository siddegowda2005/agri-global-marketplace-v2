import { Crop } from '../models/Crop.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../middleware/http.js';
import { notify } from './notify.js';

export async function placeOrder(buyer, { cropId, quantity, idempotencyKey, note }) {
  const existing = await Order.findOne({ buyer: buyer._id, idempotencyKey });
  if (existing) return { order: existing, duplicate: true };
  // Atomic reservation: only succeeds if enough stock remains (prevents overselling).
  const crop = await Crop.findOneAndUpdate(
    { _id: cropId, status: 'available', quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } }, { new: true });
  if (!crop) {
    const c = await Crop.findById(cropId);
    if (!c) throw new ApiError(404, 'Crop not found');
    throw new ApiError(409, c.status !== 'available' ? 'Crop is not available' : `Only ${c.quantity} ${c.unit} available`);
  }
  try {
    const order = await Order.create({
      buyer: buyer._id, farmer: crop.farmer, crop: crop._id, cropName: crop.name, quantity, unit: crop.unit,
      unitPriceInr: crop.priceInr, totalInr: Math.round(crop.priceInr * quantity * 100) / 100,
      buyerCountry: buyer.country, buyerCurrency: buyer.currency, note, idempotencyKey,
    });
    await notify(crop.farmer, 'new_order', `New order for ${quantity} ${crop.unit} of ${crop.name}`, `/orders/${order._id}`);
    return { order, duplicate: false };
  } catch (err) {
    await Crop.updateOne({ _id: crop._id }, { $inc: { quantity } });
    if (err.code === 11000) { const o = await Order.findOne({ buyer: buyer._id, idempotencyKey }); if (o) return { order: o, duplicate: true }; }
    throw err;
  }
}

const FARMER_FLOW = { Pending: ['Accepted', 'Rejected'], Accepted: ['Confirmed', 'Cancelled'], Confirmed: ['Ready for Collection', 'Cancelled'], 'Ready for Collection': ['Completed'] };
const BUYER_FLOW = { Pending: ['Cancelled'], Accepted: ['Cancelled'] };

export async function changeStatus(user, orderId, to) {
  const order = await Order.findById(orderId);
  const owns = order && String(user.role === 'farmer' ? order.farmer : order.buyer) === String(user._id);
  if (!order || !owns) throw new ApiError(404, 'Order not found');
  const flow = user.role === 'farmer' ? FARMER_FLOW : BUYER_FLOW;
  if (!flow[order.status]?.includes(to)) throw new ApiError(409, `Cannot change status from ${order.status} to ${to}`);
  const releases = to === 'Rejected' || to === 'Cancelled';
  // Compare-and-set on current status so concurrent updates cannot double-restore stock.
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status },
    { status: to, ...(releases ? { stockRestored: true } : {}) }, { new: true });
  if (!updated) throw new ApiError(409, 'Order was changed by someone else; refresh and retry');
  if (releases && !order.stockRestored) await Crop.updateOne({ _id: order.crop }, { $inc: { quantity: order.quantity } });
  const other = user.role === 'farmer' ? order.buyer : order.farmer;
  await notify(other, 'order_status', `Order for ${order.cropName} is now ${to}`, `/orders/${order._id}`);
  return updated;
}
