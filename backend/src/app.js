import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { sanitize, notFound, errorHandler } from './middleware/http.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import auth from './routes/auth.js';
import crops from './routes/crops.js';
import { orders, cart } from './routes/orders.js';
import { companies, enquiries } from './routes/companies.js';
import { notifications, currency, ai, admin } from './routes/misc.js';
import { centers, guides } from './routes/reference.js';
import { globalBuyers, buyingRequests } from './routes/globalBuyers.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigin.split(','), credentials: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitize);
  if (process.env.NODE_ENV !== 'test') {
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
    app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
  }
  app.use('/uploads', express.static(UPLOAD_DIR, { setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', auth);
  app.use('/api/crops', crops);
  app.use('/api/orders', orders);
  app.use('/api/cart', cart);
  app.use('/api/companies', companies);
  app.use('/api/enquiries', enquiries);
  app.use('/api/notifications', notifications);
  app.use('/api/currency', currency);
  app.use('/api/ai', ai);
  app.use('/api/admin', admin);
  app.use('/api/global-buyers', globalBuyers);
  app.use('/api/buying-requests', buyingRequests);
  app.use('/api/collection-centers', centers);
  app.use('/api/export-guides', guides);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
