/** Normalise a crop search term so "tomatoes" matches stored "tomato". */
export function stem(q) {
  let s = String(q || '').trim().toLowerCase();
  if (s.length > 3 && s.endsWith('oes')) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  return s;
}
export const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; } };
export const nameKey = (n) => String(n || '').toLowerCase().replace(/\b(ltd|llc|inc|co|company|limited|pvt|private|gmbh|bv|pte|fze|fzco|trading|general)\b/g, '').replace(/[^a-z0-9]/g, '');

const COUNTRY_ALIASES = { 'united arab emirates': 'UAE', uae: 'UAE', 'u.a.e': 'UAE', 'united kingdom': 'UK', uk: 'UK', 'great britain': 'UK', england: 'UK', 'united states': 'USA', 'united states of america': 'USA', usa: 'USA', us: 'USA',
  'saudi arabia': 'Saudi Arabia', ksa: 'Saudi Arabia', 'kingdom of saudi arabia': 'Saudi Arabia', holland: 'Netherlands', 'the netherlands': 'Netherlands' };
/** Canonical country names so filters work regardless of how a record spells them. */
export const normCountry = (c) => { const t = String(c || '').trim(); return COUNTRY_ALIASES[t.toLowerCase()] || t; };
