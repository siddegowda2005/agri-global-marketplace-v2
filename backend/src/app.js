import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { env } from './config/env.js';
import { sanitize, notFound, errorHandler } from './middleware/http.js';
import { UPLOAD_DIR, useGridFs } from './middleware/upload.js';
import { openImage } from './services/filestore.js';
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
  const origins = env.clientOrigin.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: origins.length ? origins : true, credentials: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitize);
  if (process.env.NODE_ENV !== 'test') {
    // Rate limits stay on, but the defaults are high enough that normal local use
    // (registering, logging in, demoing) never locks the app out. Override with
    // RATE_LIMIT_MAX / AUTH_RATE_LIMIT_MAX if you need stricter values.
    const windowMs = 15 * 60 * 1000;
    app.use(rateLimit({ windowMs, limit: Number(process.env.RATE_LIMIT_MAX || 3000), standardHeaders: true, legacyHeaders: false }));
    app.use('/api/auth', rateLimit({
      windowMs, limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 300), standardHeaders: true, legacyHeaders: false,
      message: { message: 'Too many authentication attempts. Please wait a few minutes and try again.' },
    }));
  }
  app.use('/uploads', express.static(UPLOAD_DIR, { setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));
  if (useGridFs) {
    // Static missed (ephemeral disk), so read the image back from MongoDB GridFS.
    app.get('/uploads/:name', (req, res) => {
      let stream;
      try { stream = openImage(path.basename(req.params.name)); }
      catch { res.status(404).json({ message: 'Image not found' }); return; }
      res.setHeader('X-Content-Type-Options', 'nosniff');
      stream.on('file', (f) => { if (f?.contentType && !res.headersSent) res.setHeader('Content-Type', f.contentType); });
      stream.on('error', () => { if (!res.headersSent) res.status(404).json({ message: 'Image not found' }); else res.end(); });
      stream.pipe(res);
    });
  }
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
