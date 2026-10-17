import mongoose from 'mongoose';
const companySchema = new mongoose.Schema({
  type: { type: String, enum: ['international_importer', 'indian_exporter'], required: true },
  name: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  state: { type: String, trim: true }, city: { type: String, trim: true },
  productsHandled: [{ type: String, trim: true, lowercase: true }],
  businessCategory: { type: String, trim: true },
  website: String, email: String, phone: String, address: String, contactPage: String,
  sourceUrl: { type: String, required: true },
  verificationStatus: { type: String, enum: ['unverified', 'verified'], default: 'unverified' },
  lastVerifiedAt: Date,
}, { timestamps: true });
companySchema.index({ type: 1, country: 1, name: 1 }, { unique: true });
companySchema.index({ productsHandled: 1 });
export const Company = mongoose.model('Company', companySchema);
