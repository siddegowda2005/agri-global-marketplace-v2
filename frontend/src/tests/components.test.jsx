import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';

vi.mock('../services/api.js', () => {
  const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() };
  return { default: api, TOKEN_KEY: 'agri_token', imgUrl: (p) => p, errMsg: (e) => e?.response?.data?.message || e?.message || 'Something went wrong' };
});
import api from '../services/api.js';
import { renderApp, mockApi, user, RATES } from './utils.jsx';
import { Login, Register } from '../pages/Auth.jsx';
import { Marketplace } from '../pages/Market.jsx';
import { Cart } from '../pages/Orders.jsx';
import { PricePrediction } from '../pages/AI.jsx';
import { CompanyDetails } from '../pages/Companies.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

beforeEach(() => { vi.clearAllMocks(); mockApi({ '/currency/rates': RATES }); });

describe('Login', () => {
  it('shows validation errors and does not call the API', async () => {
    renderApp(<Login />); await userEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
  });
  it('submits credentials and stores the token', async () => {
    mockApi({ '/currency/rates': RATES, 'POST /auth/login': { token: 'abc', user: user('buyer') } });
    renderApp(<Login />); await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co'); await userEvent.type(screen.getByLabelText(/password/i), 'Passw0rd1');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.co', password: 'Passw0rd1' })); expect(localStorage.getItem('agri_token')).toBe('abc');
  });
  it('shows a server error message', async () => {
    mockApi({ '/currency/rates': RATES, 'POST /auth/login': { __reject: { response: { data: { message: 'Invalid email or password' } } } } });
    renderApp(<Login />); await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co'); await userEvent.type(screen.getByLabelText(/password/i), 'x');
    await userEvent.click(screen.getByRole('button', { name: /login/i })); expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
describe('Register', () => {
  it('validates password rules', async () => {
    renderApp(<Register />); await userEvent.type(screen.getByLabelText('Full name'), 'Asha K'); await userEvent.type(screen.getByLabelText('Email'), 'a@b.co'); await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: /register/i })); expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
  });
  it('sends role, country and the matching currency', async () => {
    mockApi({ '/currency/rates': RATES, 'POST /auth/register': { token: 't', user: user('buyer') } });
    renderApp(<Register />); await userEvent.click(screen.getByLabelText('buyer')); await userEvent.type(screen.getByLabelText('Full name'), 'Asha K'); await userEvent.type(screen.getByLabelText('Email'), 'a@b.co'); await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd1');
    await userEvent.selectOptions(screen.getByLabelText('Country'), 'UAE'); await userEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalled()); const body = api.post.mock.calls[0][1];
    expect(body).toMatchObject({ role: 'buyer', country: 'UAE', currency: 'AED' }); expect(body.phone).toBeUndefined();
  });
});
describe('ProtectedRoute', () => {
  const tree = (roles) => <Routes><Route path="/" element={<ProtectedRoute roles={roles}><p>secret</p></ProtectedRoute>} /><Route path="/login" element={<p>login page</p>} /></Routes>;
  it('redirects anonymous users to login', async () => { renderApp(tree(['admin'])); expect(await screen.findByText('login page')).toBeInTheDocument(); });
  it('denies the wrong role', async () => {
    mockApi({ '/currency/rates': RATES, '/auth/me': { user: user('buyer') } }); renderApp(tree(['admin']), { loggedInAs: 'buyer' });
    expect(await screen.findByText(/access denied/i)).toBeInTheDocument(); expect(screen.queryByText('secret')).toBeNull();
  });
  it('allows the right role', async () => { mockApi({ '/currency/rates': RATES, '/auth/me': { user: user('admin') } }); renderApp(tree(['admin']), { loggedInAs: 'admin' }); expect(await screen.findByText('secret')).toBeInTheDocument(); });
});
const crop = { _id: 'c1', name: 'Tomato', category: 'Vegetables', priceInr: 30, unit: 'kg', quantity: 100, location: 'Mysuru', state: 'Karnataka', images: [] };
describe('Marketplace', () => {
  it('renders crops, converts prices to the selected currency and shows the rate timestamp', async () => {
    localStorage.setItem('agri_currency', 'AED'); mockApi({ '/currency/rates': RATES, '/crops': { items: [crop], total: 1, page: 1, pages: 1 } });
    renderApp(<Marketplace />); expect(await screen.findByText('Tomato')).toBeInTheDocument();
    expect(await screen.findByText(/AED 1\.32/)).toBeInTheDocument(); expect(screen.getByText(/exchange rates fetched/i)).toBeInTheDocument();
  });
  it('falls back to INR when exchange rates are unavailable', async () => {
    localStorage.setItem('agri_currency', 'AED'); mockApi({ '/currency/rates': { available: false }, '/crops': { items: [crop], total: 1, page: 1, pages: 1 } });
    renderApp(<Marketplace />); expect(await screen.findByText(/₹30\.00/)).toBeInTheDocument(); expect(screen.getByText(/exchange rate unavailable/i)).toBeInTheDocument(); expect(screen.queryByText(/AED/)).toBeNull();
  });
  it('sends search and filter params', async () => {
    mockApi({ '/currency/rates': RATES, '/crops': { items: [], total: 0, page: 1, pages: 0 } }); renderApp(<Marketplace />);
    await userEvent.type(screen.getByLabelText('Search crops'), 'rice'); await userEvent.selectOptions(screen.getByLabelText('Category'), 'Grains'); await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => { const last = api.get.mock.calls.filter((c) => c[0] === '/crops').at(-1); expect(last[1].params).toMatchObject({ q: 'rice', category: 'Grains' }); });
    expect(await screen.findByText(/no crops found/i)).toBeInTheDocument();
  });
  it('shows an error with retry', async () => { mockApi({ '/currency/rates': RATES }); renderApp(<Marketplace />); expect(await screen.findByRole('alert')).toHaveTextContent(/no mock/i); });
});
describe('Cart', () => {
  it('shows subtotal and updates quantity via the API', async () => {
    mockApi({ '/currency/rates': RATES, '/cart': { items: [{ quantity: 2, crop: crop }] }, 'PUT /cart/items': { items: [] } });
    renderApp(<Cart />); expect(await screen.findByTestId('subtotal')).toHaveTextContent('₹60.00');
    await userEvent.click(screen.getByLabelText('Increase')); await waitFor(() => expect(api.put).toHaveBeenCalledWith('/cart/items', { cropId: 'c1', quantity: 3 }));
  });
  it('places an order with an idempotency key and shows the no-payment notice', async () => {
    mockApi({ '/currency/rates': RATES, '/cart': { items: [{ quantity: 2, crop }] }, 'POST /orders/checkout': { orders: [], failed: [] } });
    renderApp(<Cart />); await userEvent.click(await screen.findByRole('button', { name: /place order/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/orders/checkout', expect.objectContaining({ idempotencyKey: expect.any(String) }))); expect(screen.getByText(/handled outside this platform/i)).toBeInTheDocument();
  });
  it('shows empty state', async () => { mockApi({ '/currency/rates': RATES, '/cart': { items: [] } }); renderApp(<Cart />); expect(await screen.findByText(/cart is empty/i)).toBeInTheDocument(); });
});
describe('AI price prediction', () => {
  it('validates input before calling the API', async () => { renderApp(<PricePrediction />); await userEvent.click(screen.getByRole('button', { name: /predict/i })); expect(await screen.findByText(/enter a crop name/i)).toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled(); });
  it('displays a real model response with disclaimer', async () => {
    mockApi({ '/currency/rates': RATES, 'POST /ai/price-prediction': { predicted_price: 1442.8, price_unit: 'INR per quintal', prediction_date: '2026-10-17', model_version: 'v1', metrics_on_holdout: { mae: 24, rmse: 30, r2: 0.98 }, data_range: ['2022-01-01', '2023-08-23'], disclaimer: 'Not a live market price.' } });
    renderApp(<PricePrediction />); await userEvent.type(screen.getByLabelText(/^Crop/), 'Tomato'); await userEvent.click(screen.getByRole('button', { name: /predict/i }));
    expect(await screen.findByTestId('prediction')).toHaveTextContent('1,442.8'); expect(screen.getByText(/not a live market price/i)).toBeInTheDocument();
  });
  it('shows the service-unavailable message instead of fake data', async () => {
    mockApi({ '/currency/rates': RATES, 'POST /ai/price-prediction': { __reject: { response: { status: 503, data: { message: 'AI service is currently unavailable' } } } } });
    renderApp(<PricePrediction />); await userEvent.type(screen.getByLabelText(/^Crop/), 'Tomato'); await userEvent.click(screen.getByRole('button', { name: /predict/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i); expect(screen.queryByTestId('prediction')).toBeNull();
  });
});
describe('CompanyDetails contact options', () => {
  const co = { _id: 'k1', name: 'Test Importer', type: 'international_importer', country: 'UAE', city: 'Dubai', productsHandled: ['tomato'], website: 'https://example.com', contactPage: 'javascript:alert(1)', email: 'p@example.com', phone: '+971 4 123 4567', sourceUrl: 'https://example.com/src', verificationStatus: 'verified', lastVerifiedAt: '2026-10-01' };
  it('renders safe links only and farmer-only enquiry actions', async () => {
    mockApi({ '/currency/rates': RATES, '/auth/me': { user: user('farmer') }, '/companies/k1': { company: co, note: 'Listing is not a purchase commitment.' } });
    renderApp(<Routes><Route path="/c/:id" element={<CompanyDetails />} /></Routes>, { route: '/c/k1', loggedInAs: 'farmer' });
    expect(await screen.findByRole('link', { name: /visit official website/i })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByRole('link', { name: /call company/i })).toHaveAttribute('href', 'tel:+97141234567');
    expect(screen.queryByRole('link', { name: /open contact page/i })).toBeNull();
    expect(await screen.findByRole('link', { name: /generate business enquiry/i })).toHaveAttribute('href', '/enquiry/k1');
  });
  it('hides enquiry actions from buyers', async () => {
    mockApi({ '/currency/rates': RATES, '/auth/me': { user: user('buyer') }, '/companies/k1': { company: co, note: 'n' } });
    renderApp(<Routes><Route path="/c/:id" element={<CompanyDetails />} /></Routes>, { route: '/c/k1', loggedInAs: 'buyer' });
    await screen.findByRole('link', { name: /visit official website/i }); expect(screen.queryByRole('link', { name: /generate business enquiry/i })).toBeNull();
  });
});
