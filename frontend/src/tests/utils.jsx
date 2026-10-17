import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import api from '../services/api.js';
import { ToastProvider } from '../components/Toast.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { CurrencyProvider } from '../context/CurrencyContext.jsx';

/** routes: { '/url': data | (config) => data }. Unknown GETs reject like a 404. */
export function mockApi(routes = {}) {
  const handler = (method) => (url, ...args) => {
    const r = routes[`${method} ${url}`] ?? (method === 'GET' ? routes[url] : undefined);
    if (r === undefined) return Promise.reject({ response: { status: 404, data: { message: `No mock for ${method} ${url}` } } });
    if (r instanceof Error || r?.__reject) return Promise.reject(r.__reject || r);
    return Promise.resolve({ data: typeof r === 'function' ? r(...args) : r });
  };
  api.get.mockImplementation(handler('GET')); api.post.mockImplementation(handler('POST'));
  api.put.mockImplementation(handler('PUT')); api.patch.mockImplementation(handler('PATCH')); api.delete.mockImplementation(handler('DELETE'));
}
export const user = (role = 'farmer', extra = {}) => ({ _id: 'u1', name: 'Test User', email: 't@example.com', role, country: 'India', currency: 'INR', ...extra });
export function renderApp(ui, { route = '/', loggedInAs = null } = {}) {
  if (loggedInAs) localStorage.setItem('agri_token', 't');
  return render(<MemoryRouter initialEntries={[route]}><ToastProvider><AuthProvider><CurrencyProvider>{ui}</CurrencyProvider></AuthProvider></ToastProvider></MemoryRouter>);
}
export const RATES = { available: true, base: 'INR', source: 'live', fetchedAt: '2026-10-17T10:00:00.000Z', rates: { INR: 1, USD: 0.012, AED: 0.044, EUR: 0.011, GBP: 0.0095, SAR: 0.045, SGD: 0.016 } };
export { vi };
