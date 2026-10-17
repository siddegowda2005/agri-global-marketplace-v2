import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from './http.js';
export const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
export const authenticate = asyncHandler(async (req, _res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');
  let payload;
  try { payload = jwt.verify(token, env.jwtSecret); } catch { throw new ApiError(401, 'Invalid or expired token'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new ApiError(401, 'Account unavailable');
  req.user = user; next();
});
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'You do not have permission for this action'));
