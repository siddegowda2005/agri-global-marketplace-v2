import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true },
  phone: { type: String, trim: true, maxlength: 30 },
  country: { type: String, trim: true, default: 'India' },
  currency: { type: String, enum: ['INR', 'USD', 'AED', 'EUR', 'GBP', 'SAR', 'SGD'], default: 'INR' },
  state: { type: String, trim: true }, city: { type: String, trim: true },
  organization: { type: String, trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });
userSchema.methods.toSafe = function () {
  const o = this.toObject(); delete o.passwordHash; delete o.__v; return o;
};
export const User = mongoose.models.User || mongoose.model('User', userSchema);
