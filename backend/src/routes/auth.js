import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { asyncHandler, ApiError, validate } from '../middleware/http.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { registerSchema, loginSchema, profileSchema } from '../validators/schemas.js';
import { COUNTRY_CURRENCY } from '../services/currency.js';
const r = Router();
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
r.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  if (await User.exists({ email: data.email })) throw new ApiError(409, 'Email already registered');
  data.currency = data.currency || COUNTRY_CURRENCY[data.country] || 'INR';
  const user = await User.create({ ...data, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: signToken(user), user: user.toSafe() });
}));
r.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  const ok = await bcrypt.compare(req.body.password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok || !user.active) throw new ApiError(401, 'Invalid email or password');
  res.json({ token: signToken(user), user: user.toSafe() });
}));
r.get('/me', authenticate, (req, res) => res.json({ user: req.user.toSafe() }));
r.patch('/me', authenticate, validate(profileSchema), asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body); await req.user.save(); res.json({ user: req.user.toSafe() });
}));
export default r;
