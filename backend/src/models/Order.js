import mongoose from 'mongoose';
export const STATUSES = ['Pending', 'Accepted', 'Rejected', 'Confirmed', 'Ready for Collection', 'Completed', 'Cancelled'];
const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  cropName: String,
  quantity: { type: Number, required: true, min: 0.001 },
  unit: String,
  unitPriceInr: { type: Number, required: true },
  totalInr: { type: Number, required: true },
  buyerCountry: String, buyerCurrency: String,
  note: { type: String, maxlength: 1000 },
  status: { type: String, enum: STATUSES, default: 'Pending' },
  stockRestored: { type: Boolean, default: false },
  idempotencyKey: { type: String, required: true },
}, { timestamps: true });
orderSchema.index({ buyer: 1, idempotencyKey: 1 }, { unique: true });
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
