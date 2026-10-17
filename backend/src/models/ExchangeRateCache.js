import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  base: { type: String, default: 'INR', unique: true },
  rates: { type: Map, of: Number, required: true },
  fetchedAt: { type: Date, required: true },
}, { timestamps: true });
export const ExchangeRateCache = mongoose.model('ExchangeRateCache', schema);
