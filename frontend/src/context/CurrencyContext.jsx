import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { convert, money } from '../utils/format.js';
const Ctx = createContext(null);
export const useCurrency = () => useContext(Ctx);
export function CurrencyProvider({ children }) {
  const { user } = useAuth() || {};
  const [currency, setCurrencyState] = useState(localStorage.getItem('agri_currency') || 'INR');
  const [info, setInfo] = useState({ available: false, rates: null, fetchedAt: null, source: null });
  useEffect(() => { if (user?.currency) setCurrencyState(user.currency); }, [user?.currency]);
  useEffect(() => { api.get('/currency/rates').then((r) => setInfo(r.data.available ? r.data : { available: false })).catch(() => setInfo({ available: false })); }, []);
  const setCurrency = useCallback((c) => { localStorage.setItem('agri_currency', c); setCurrencyState(c); }, []);
  /** Format an INR price in the selected currency; falls back to INR when no valid rate exists. */
  const format = useCallback((inr) => {
    const v = convert(inr, currency, info.rates);
    return v === null ? { text: money(inr, 'INR'), converted: false } : { text: money(v, currency), converted: currency !== 'INR' };
  }, [currency, info.rates]);
  const rateNote = currency === 'INR' ? null
    : info.available && info.rates?.[currency] ? `Converted from INR using exchange rates fetched ${new Date(info.fetchedAt).toLocaleString()} (${info.source}). Indicative only.`
    : 'Exchange rate unavailable - showing original INR prices.';
  return <Ctx.Provider value={{ currency, setCurrency, format, rateNote, info }}>{children}</Ctx.Provider>;
}
