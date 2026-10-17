import { ExchangeRateCache } from '../models/ExchangeRateCache.js';
import { env } from '../config/env.js';
export const SUPPORTED = ['INR', 'USD', 'AED', 'EUR', 'GBP', 'SAR', 'SGD'];
export const COUNTRY_CURRENCY = { India: 'INR', UAE: 'AED', USA: 'USD', UK: 'GBP', 'Saudi Arabia': 'SAR', Singapore: 'SGD' };
const MAX_CACHE_AGE_MS = 7 * 24 * 3600 * 1000;
const TTL_MS = 6 * 3600 * 1000;
let fetchImpl = (...a) => fetch(...a);
export const setFetch = (fn) => { fetchImpl = fn; };

export async function getRates(now = Date.now()) {
  const cached = await ExchangeRateCache.findOne({ base: 'INR' });
  if (cached && now - cached.fetchedAt.getTime() < TTL_MS) return pack(cached, 'cache');
  try {
    const res = await fetchImpl(env.exchangeUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const rates = {};
    for (const c of SUPPORTED) { const v = data?.rates?.[c]; if (typeof v !== 'number' || !(v > 0)) throw new Error('bad rates payload'); rates[c] = v; }
    const doc = await ExchangeRateCache.findOneAndUpdate({ base: 'INR' }, { rates, fetchedAt: new Date(now) }, { upsert: true, new: true });
    return pack(doc, 'live');
  } catch {
    if (cached && now - cached.fetchedAt.getTime() < MAX_CACHE_AGE_MS) return pack(cached, 'cache');
    return null;
  }
}
const pack = (doc, source) => ({ base: 'INR', rates: Object.fromEntries(doc.rates), fetchedAt: doc.fetchedAt, source });
export function convertFromInr(amountInr, currency, rates) {
  if (!rates || !rates[currency]) return null;
  return Math.round((amountInr * rates[currency] + Number.EPSILON) * 100) / 100;
}
