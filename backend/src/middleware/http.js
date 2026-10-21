import { z } from 'zod';
export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const r = schema.safeParse(req[source]);
    if (!r.success) {
      return next(new ApiError(400, 'Validation failed', r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))));
    }
    req[source] = r.data; next();
  };
}
export function notFound(_req, _res, next) { next(new ApiError(404, 'Route not found')); }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large' });
  if (err.name === 'MulterError') return res.status(400).json({ message: `Upload error: ${err.message}` });
  if (err instanceof ApiError) return res.status(err.status).json({ message: err.message, details: err.details });
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate record' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: 'Invalid data' });
  if (process.env.NODE_ENV !== 'test') console.error(err.message);
  res.status(500).json({ message: 'Internal server error' });
}
// Strip Mongo operator keys ($...) and dotted keys from user input (NoSQL injection guard).
export function sanitize(req, _res, next) {
  const clean = (o) => {
    if (Array.isArray(o)) return o.map(clean);
    if (o && typeof o === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(o)) { if (k.startsWith('$') || k.includes('.')) continue; out[k] = clean(v); }
      return out;
    }
    return o;
  };
  if (req.body) req.body = clean(req.body);
  if (req.query) { const q = clean(req.query); for (const k of Object.keys(req.query)) delete req.query[k]; Object.assign(req.query, q); }
  next();
}
