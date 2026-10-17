import mongoose from 'mongoose';
const cartSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{ crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true }, quantity: { type: Number, required: true, min: 0.001 } }],
}, { timestamps: true });
export const Cart = mongoose.model('Cart', cartSchema);
