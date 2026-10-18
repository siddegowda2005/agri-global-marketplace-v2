import mongoose from 'mongoose';
export const STALE_DAYS = 30;
const schema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  crop: { type: String, required: true, trim: true, lowercase: true },
  quantity: Number, unit: { type: String, trim: true },
  quality: String, minimumOrderQuantity: String, deliveryDestination: String,
  requestDate: { type: Date, required: true }, expiresAt: Date,
  sourceUrl: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  verificationStatus: { type: String, enum: ['unverified', 'verified'], default: 'unverified' },
  verificationEvidence: String, lastCheckedAt: Date,
}, { timestamps: true });
schema.index({ crop: 1, status: 1, verificationStatus: 1 });
/** Mongo filter for requests that may be shown as "active": verified, open, not expired, and re-checked recently. */
export const activeFilter = (now = new Date()) => ({
  status: 'open', verificationStatus: 'verified',
  lastCheckedAt: { $gte: new Date(now.getTime() - STALE_DAYS * 86400000) },
  $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
});
export function requestState(r, now = new Date()) {
  if (r.status === 'closed') return 'closed';
  if (r.expiresAt && r.expiresAt <= now) return 'expired';
  if (r.verificationStatus !== 'verified') return 'unverified';
  if (!r.lastCheckedAt || r.lastCheckedAt < new Date(now.getTime() - STALE_DAYS * 86400000)) return 'stale';
  return 'active';
}
export const BuyingRequest = mongoose.model('BuyingRequest', schema);
