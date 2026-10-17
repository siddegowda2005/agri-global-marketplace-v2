import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  cropName: { type: String, required: true }, quantity: Number, unit: String, location: String,
  subject: String, body: String,
  note: { type: String, default: 'Draft only. The platform does not send emails.' },
}, { timestamps: true });
export const Enquiry = mongoose.model('Enquiry', schema);
