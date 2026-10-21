import mongoose from 'mongoose';
const sourceSchema = new mongoose.Schema({ url: { type: String, required: true }, label: String, checkedAt: Date }, { _id: false });
const companySchema = new mongoose.Schema({
  type: { type: String, enum: ['international_importer', 'indian_exporter'], required: true },
  name: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  state: { type: String, trim: true }, city: { type: String, trim: true },
  buyerType: { type: String, enum: ['importer', 'wholesaler', 'distributor', 'retailer', 'processor', 'exporter', 'other'], default: 'importer' },
  productsHandled: [{ type: String, trim: true, lowercase: true }],
  productCategories: [{ type: String, trim: true, lowercase: true }],
  businessCategory: { type: String, trim: true },
  website: String, email: String, phone: String, whatsapp: String, address: String, contactPage: String, logoUrl: String,
  minimumOrderQuantity: { type: String, trim: true },
  sourceUrl: { type: String, required: true },
  sources: [sourceSchema],
  verificationStatus: { type: String, enum: ['unverified', 'verified', 'rejected'], default: 'unverified' },
  verificationEvidence: String, rejectionReason: String,
  lastVerifiedAt: Date, lastCheckedAt: Date,
}, { timestamps: true });
companySchema.index({ type: 1, country: 1, name: 1 }, { unique: true });
companySchema.index({ productsHandled: 1 });
companySchema.index({ verificationStatus: 1, type: 1, country: 1 });
export const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
