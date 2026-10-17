import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  topic: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, maxlength: 5000 },
  sourceName: { type: String, required: true }, sourceUrl: { type: String, required: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ title: 1 }, { unique: true });
export const ExportGuide = mongoose.model('ExportGuide', schema);
