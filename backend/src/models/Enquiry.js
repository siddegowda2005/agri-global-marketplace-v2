import mongoose from 'mongoose';
export const ENQUIRY_STATUSES = ['draft', 'submitted', 'delivery_attempted', 'delivered', 'failed'];
const schema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop' },
  cropName: { type: String, required: true }, quantity: Number, unit: String, location: String,
  expectedPriceInr: Number, grade: String, message: String,
  contactPreference: { type: String, enum: ['email', 'phone', 'whatsapp', 'any'], default: 'any' },
  subject: String, body: String,
  status: { type: String, enum: ENQUIRY_STATUSES, default: 'draft' },
  history: [{ status: String, at: Date, note: String, _id: false }],
  note: { type: String, default: 'Draft only. The platform does not send emails.' },
}, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
export const Enquiry = mongoose.model('Enquiry', schema);
