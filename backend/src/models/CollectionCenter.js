import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  kind: { type: String, enum: ['collection_center', 'export_facility', 'cold_storage'], default: 'collection_center' },
  address: String, state: { type: String, trim: true }, city: { type: String, trim: true },
  latitude: { type: Number, required: true, min: -90, max: 90 }, longitude: { type: Number, required: true, min: -180, max: 180 },
  sourceUrl: { type: String, required: true },
  verificationStatus: { type: String, enum: ['unverified', 'verified'], default: 'unverified' },
}, { timestamps: true });
schema.index({ name: 1, latitude: 1, longitude: 1 }, { unique: true });
export const CollectionCenter = mongoose.model('CollectionCenter', schema);
