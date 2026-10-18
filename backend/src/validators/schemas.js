import { z } from 'zod';
import { CATEGORIES } from '../models/Crop.js';
import { objectId } from '../middleware/http.js';
import { normCountry } from '../services/matching_extra.js';
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
const BUYER_TYPES = ['importer', 'wholesaler', 'distributor', 'retailer', 'processor', 'exporter', 'other'];
const lowerList = z.array(z.string().trim().toLowerCase().min(1).max(60)).max(50).default([]);
export const companySchema = z.object({
  type: z.enum(['international_importer', 'indian_exporter']), name: z.string().trim().min(2).max(200),
  country: z.string().trim().min(2).max(60).transform(normCountry), state: z.string().trim().max(60).optional(), city: z.string().trim().max(60).optional(),
  buyerType: z.enum(BUYER_TYPES).default('importer'),
  productsHandled: lowerList, productCategories: lowerList,
  businessCategory: z.string().trim().max(100).optional(), minimumOrderQuantity: z.string().trim().max(100).optional(),
  website: httpUrl.optional(), contactPage: httpUrl.optional(), logoUrl: httpUrl.optional(), sourceUrl: httpUrl,
  sources: z.array(z.object({ url: httpUrl, label: z.string().max(100).optional(), checkedAt: z.coerce.date().optional() })).max(10).optional(),
  email: z.string().email().optional(), phone: z.string().max(40).optional(), whatsapp: z.string().max(40).optional(), address: z.string().max(300).optional(),
  lastCheckedAt: z.coerce.date().optional(),
}).strict();
export const evidenceSchema = z.object({ evidence: z.string().trim().min(10, 'Describe what you checked (min 10 characters)').max(1000) }).strict();
export const rejectSchema = z.object({ reason: z.string().trim().min(5).max(500) }).strict();
export const buyingRequestSchema = z.object({
  company: objectId, crop: z.string().trim().min(2).max(60), quantity: z.coerce.number().positive().optional(), unit: z.string().trim().max(20).optional(),
  quality: z.string().max(300).optional(), minimumOrderQuantity: z.string().max(100).optional(), deliveryDestination: z.string().max(200).optional(),
  requestDate: z.coerce.date(), expiresAt: z.coerce.date().optional(), sourceUrl: httpUrl,
}).strict();
export const enquirySchema = z.object({
  companyId: objectId, cropId: objectId.optional(), cropName: z.string().trim().min(2).max(100), quantity: z.coerce.number().positive(), unit: z.enum(['kg', 'quintal', 'tonne']).default('kg'),
  location: z.string().trim().min(2).max(120), expectedPriceInr: z.coerce.number().min(0).max(1e8).optional(), grade: z.string().trim().max(30).optional(),
  message: z.string().trim().max(2000).optional(), contactPreference: z.enum(['email', 'phone', 'whatsapp', 'any']).default('any'), submit: z.boolean().default(false),
}).strict();
export const aiPriceSchema = z.object({ crop: z.string().min(2).max(60), market: z.string().max(80).optional(), state: z.string().max(60).optional(), date: z.string().optional() });
export const aiCropSchema = z.object({ N: z.coerce.number(), P: z.coerce.number(), K: z.coerce.number(), temperature: z.coerce.number(), humidity: z.coerce.number(), ph: z.coerce.number(), rainfall: z.coerce.number() });
