import 'dotenv/config';
export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agri_marketplace',
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  aiUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  exchangeUrl: process.env.EXCHANGE_RATE_URL || 'https://open.er-api.com/v6/latest/INR',
  uploadStorage: process.env.UPLOAD_STORAGE || '',
};
if (!env.jwtSecret) throw new Error('JWT_SECRET must be set in production');
