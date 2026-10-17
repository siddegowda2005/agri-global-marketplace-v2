import { z } from 'zod';
import { CATEGORIES } from '../models/Crop.js';
import { objectId } from '../middleware/http.js';
const CURRENCIES = ['INR', 'USD', 'AED', 'EUR', 'GBP', 'SAR', 'SGD'];
const COUNTRIES = ['India', 'UAE', 'USA', 'UK', 'Saudi Arabia', 'Singapore'];
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100).regex(/[A-Za-z]/, 'Must contain a letter').regex(/\d/, 'Must contain a digit'),
  role: z.enum(['farmer', 'buyer']),
  phone: z.string().trim().max(30).optional(),
  country: z.enum(COUNTRIES).default('India'),
  currency: z.enum(CURRENCIES).optional(),
  state: z.string().trim().max(60).optional(), city: z.string().trim().max(60).optional(),
  organization: z.string().trim().max(120).optional(),
}).strict();
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(100) }).strict();
export const profileSchema = registerSchema.pick({ name: true, phone: true, country: true, currency: true, state: true, city: true, organization: true }).partial().strict();
export const cropSchema = z.object({
  name: z.string().trim().min(2).max(100), category: z.enum(CATEGORIES),
  description: z.string().trim().max(2000).optional(),
  quantity: z.coerce.number().min(0).max(1e9), unit: z.enum(['kg', 'quintal', 'tonne']).default('kg'),
  priceInr: z.coerce.number().min(0).max(1e8),
  location: z.string().trim().min(2).max(120), state: z.string().trim().max(60).optional(),
  country: z.string().trim().max(60).default('India'),
  harvestDate: z.coerce.date().optional(), grade: z.enum(['A', 'B', 'C', 'Ungraded']).default('Ungraded'),
  status: z.enum(['available', 'unavailable']).default('available'),
}).strip();
export const cropUpdateSchema = cropSchema.partial().extend({ keepImages: z.string().optional() });
export const cropQuerySchema = z.object({
  q: z.string().trim().max(100).optional(), category: z.enum(CATEGORIES).optional(), state: z.string().trim().max(60).optional(),
  minPrice: z.coerce.number().min(0).optional(), maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(12),
});
export const orderSchema = z.object({ cropId: objectId, quantity: z.coerce.number().positive().max(1e9), idempotencyKey: z.string().min(8).max(100), note: z.string().max(1000).optional() }).strict();
export const statusSchema = z.object({ status: z.enum(['Accepted', 'Rejected', 'Confirmed', 'Ready for Collection', 'Completed', 'Cancelled']) }).strict();
export const cartItemSchema = z.object({ cropId: objectId, quantity: z.coerce.number().positive().max(1e9) }).strict();
export const checkoutSchema = z.object({ idempotencyKey: z.string().min(8).max(100), note: z.string().max(1000).optional() }).strict();
const httpUrl = z.string().url().refine((u) => /^https?:\/\//i.test(u), 'Must be http(s)');
export const companySchema = z.object({
  type: z.enum(['international_importer', 'indian_exporter']), name: z.string().trim().min(2).max(200),
  country: z.string().trim().min(2).max(60), state: z.string().trim().max(60).optional(), city: z.string().trim().max(60).optional(),
  productsHandled: z.array(z.string().trim().toLowerCase().min(1).max(60)).max(50).default([]),
  businessCategory: z.string().trim().max(100).optional(),
  website: httpUrl.optional(), contactPage: httpUrl.optional(), sourceUrl: httpUrl,
  email: z.string().email().optional(), phone: z.string().max(40).optional(), address: z.string().max(300).optional(),
}).strict();
export const enquirySchema = z.object({ companyId: objectId, cropName: z.string().trim().min(2).max(100), quantity: z.coerce.number().positive(), unit: z.enum(['kg', 'quintal', 'tonne']).default('kg'), location: z.string().trim().min(2).max(120) }).strict();
export const aiPriceSchema = z.object({ crop: z.string().min(2).max(60), market: z.string().max(80).optional(), state: z.string().max(60).optional(), date: z.string().optional() });
export const aiCropSchema = z.object({ N: z.coerce.number(), P: z.coerce.number(), K: z.coerce.number(), temperature: z.coerce.number(), humidity: z.coerce.number(), ph: z.coerce.number(), rainfall: z.coerce.number() });
