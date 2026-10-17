export const COUNTRIES = ['India', 'UAE', 'USA', 'UK', 'Saudi Arabia', 'Singapore'];
export const CURRENCIES = ['INR', 'USD', 'AED', 'EUR', 'GBP', 'SAR', 'SGD'];
export const COUNTRY_CURRENCY = { India: 'INR', UAE: 'AED', USA: 'USD', UK: 'GBP', 'Saudi Arabia': 'SAR', Singapore: 'SGD' };
export const CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Other crops'];
export const ORDER_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Confirmed', 'Ready for Collection', 'Completed', 'Cancelled'];
const SYMBOL = { INR: '₹', USD: '$', AED: 'AED ', EUR: '€', GBP: '£', SAR: 'SAR ', SGD: 'S$' };
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Convert an INR amount. Returns null when no valid rate exists (caller falls back to INR). */
export function convert(amountInr, currency, rates) {
  if (currency === 'INR') return round2(amountInr);
  const r = rates?.[currency];
  return typeof r === 'number' && r > 0 ? round2(amountInr * r) : null;
}
export const money = (v, c) => `${SYMBOL[c] || c + ' '}${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function haversineKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '-');
export const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);
