import mongoose from 'mongoose';
export const CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Other crops'];
const cropSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: CATEGORIES, required: true },
  description: { type: String, trim: true, maxlength: 2000 },
  images: [{ type: String }],
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, enum: ['kg', 'quintal', 'tonne'], default: 'kg' },
  priceInr: { type: Number, required: true, min: 0 },
  location: { type: String, required: true, trim: true },
  state: { type: String, trim: true }, country: { type: String, default: 'India' },
  harvestDate: Date,
  grade: { type: String, enum: ['A', 'B', 'C', 'Ungraded'], default: 'Ungraded' },
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
}, { timestamps: true });
cropSchema.index({ name: 'text', description: 'text' });
cropSchema.index({ category: 1, status: 1, state: 1 });
export const Crop = mongoose.model('Crop', cropSchema);
