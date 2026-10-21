import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../services/api.js', () => {
  const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() };
  return { default: api, TOKEN_KEY: 'agri_token', imgUrl: (p) => p, errMsg: (e) => e?.response?.data?.message || e?.message || 'Something went wrong' };
});
import api from '../services/api.js';
import { renderApp, mockApi, user, RATES } from './utils.jsx';
import { GlobalBuyers } from '../pages/GlobalBuyers.jsx';
import { Enquiry, EnquiryHistory } from '../pages/Enquiries.jsx';
import { MyCrops } from '../pages/Market.jsx';
import { PricePrediction } from '../pages/AI.jsx';

const company = (o = {}) => ({ _id: 'k1', name: 'Alpha Fresh Imports', country: 'UAE', city: 'Dubai', buyerType: 'importer', productsHandled: ['tomato'], website: 'https://example.com', email: 'buy@example.com', phone: null, whatsapp: null, lastVerifiedAt: '2026-10-01T00:00:00Z', buyingStatus: 'Potential Buyer', activeRequests: [], ...o });
const list = (items) => ({ items, total: items.length, page: 1, pages: 1, note: 'Listing is not a purchase commitment.' });
const Where = () => { const l = useLocation(); return <p data-testid="where">{l.pathname}{l.search}</p>; };
const farmerRoutes = { '/currency/rates': RATES, '/auth/me': { user: user('farmer') } };
const page = (ui, route = '/global-buyers') => renderApp(<><Routes><Route path="/global-buyers" element={ui} /></Routes><Where /></>, { route, loggedInAs: 'farmer' });
beforeEach(() => { vi.clearAllMocks(); });

describe('Global Buyers page', () => {
  it('applies the crop from the URL automatically and shows card details with Not publicly available fallbacks', async () => {
    mockApi({ ...farmerRoutes, '/global-buyers': list([company()]) });
    page(<GlobalBuyers />, '/global-buyers?crop=tomato&cropId=c1');
    expect(await screen.findByText('Alpha Fresh Imports')).toBeInTheDocument();
    const call = api.get.mock.calls.find((c) => c[0] === '/global-buyers'); expect(call[1].params).toMatchObject({ crop: 'tomato' });
    const card = screen.getByLabelText('Alpha Fresh Imports');
    expect(screen.getByLabelText('Crop')).toHaveValue('tomato'); expect(within(card).getByText('Potential Buyer')).toBeInTheDocument(); expect(within(card).queryByText('Currently Buying')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Contact Buyer' }));
    const panel = screen.getByLabelText(/contact details for alpha/i); expect(within(panel).getByRole('link', { name: 'buy@example.com' })).toHaveAttribute('href', 'mailto:buy@example.com');
    expect(within(panel).getAllByText('Not publicly available').length).toBeGreaterThanOrEqual(3);
  });
  it('all four card buttons work and link to the right places', async () => {
    mockApi({ ...farmerRoutes, '/global-buyers': list([company()]) }); page(<GlobalBuyers />, '/global-buyers?crop=tomato&cropId=c1');
    await screen.findByText('Alpha Fresh Imports');
    expect(screen.getByRole('link', { name: 'Visit Official Website' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByRole('link', { name: 'View Company Details' })).toHaveAttribute('href', expect.stringContaining('/global-buyers/k1'));
    expect(await screen.findByRole('link', { name: 'Send Enquiry' })).toHaveAttribute('href', expect.stringContaining('/enquiry/k1?crop=tomato&cropId=c1'));
  });
  it('disables the website button and refuses unsafe URLs', async () => {
    mockApi({ ...farmerRoutes, '/global-buyers': list([company({ website: 'javascript:alert(1)' })]) }); page(<GlobalBuyers />);
    await screen.findByText('Alpha Fresh Imports'); expect(screen.queryByRole('link', { name: 'Visit Official Website' })).toBeNull(); expect(screen.getByRole('button', { name: 'Visit Official Website' })).toBeDisabled();
  });
  it('marks Currently Buying only when the API returns a verified active request', async () => {
    mockApi({ ...farmerRoutes, '/global-buyers': list([company({ buyingStatus: 'Currently Buying', activeRequests: [{ _id: 'r1', crop: 'tomato', quantity: 5000, unit: 'kg' }] })]) }); page(<GlobalBuyers />);
    expect(await screen.findByText('Currently Buying')).toBeInTheDocument(); expect(screen.getByText(/Verified request: tomato/)).toBeInTheDocument();
  });
  it('filters are sent together, and Clear filters resets them', async () => {
    mockApi({ ...farmerRoutes, '/global-buyers': list([]) }); page(<GlobalBuyers />);
    await screen.findByText(/no companies match/i);
    await userEvent.type(screen.getByLabelText('Crop'), 'mango'); await userEvent.selectOptions(screen.getByLabelText('Country'), 'UAE'); await userEvent.selectOptions(screen.getByLabelText('Buyer type'), 'wholesaler'); await userEvent.selectOptions(screen.getByLabelText('Buying status'), 'currently_buying');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => { const last = api.get.mock.calls.filter((c) => c[0] === '/global-buyers').at(-1); expect(last[1].params).toMatchObject({ crop: 'mango', country: 'UAE', buyerType: 'wholesaler', status: 'currently_buying' }); });
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => { const last = api.get.mock.calls.filter((c) => c[0] === '/global-buyers').at(-1); expect(last[1].params).toEqual({ page: 1, limit: 12 }); });
  });
  it('shows an error with retry', async () => { mockApi(farmerRoutes); page(<GlobalBuyers />); expect(await screen.findByRole('alert')).toBeInTheDocument(); });
  it('Active Buying Requests tab shows the required empty message', async () => {
    mockApi({ ...farmerRoutes, '/global-buyers/requests': { items: [], total: 0, page: 1, pages: 0, staleAfterDays: 30 } }); page(<GlobalBuyers />, '/global-buyers?tab=requests');
    expect(await screen.findByText('No verified active buying requests available.')).toBeInTheDocument();
  });
  it('Active Buying Requests tab lists request details', async () => {
    mockApi({ ...farmerRoutes, '/global-buyers/requests': { items: [{ _id: 'r1', crop: 'tomato', quantity: 5000, unit: 'kg', quality: 'Grade A', deliveryDestination: 'Dubai', requestDate: '2026-10-10', expiresAt: '2026-11-10', lastCheckedAt: '2026-10-15', sourceUrl: 'https://example.com/req', company: { _id: 'k1', name: 'Alpha Fresh Imports', country: 'UAE' } }], total: 1, page: 1, pages: 1, staleAfterDays: 30 } });
    page(<GlobalBuyers />, '/global-buyers?tab=requests'); const card = await screen.findByLabelText('Buying request for tomato');
    expect(within(card).getByText('Grade A')).toBeInTheDocument(); expect(within(card).getByRole('link', { name: 'Official source' })).toHaveAttribute('href', 'https://example.com/req');
  });
});
describe('Find International Buyers from a crop listing', () => {
  it('links the crop name and id into Global Buyers', async () => {
    mockApi({ ...farmerRoutes, '/crops/mine': { items: [{ _id: 'c9', name: 'Tomato', quantity: 500, unit: 'kg', priceInr: 28, location: 'Mysuru', status: 'available' }] } });
    renderApp(<MyCrops />, { loggedInAs: 'farmer' }); expect(await screen.findByRole('link', { name: 'Find International Buyers' })).toHaveAttribute('href', '/global-buyers?crop=Tomato&cropId=c9');
  });
});
describe('Enquiry form', () => {
  const co = { company: company(), note: 'n' };
  const open = () => renderApp(<Routes><Route path="/enquiry/:companyId" element={<Enquiry />} /></Routes>, { route: '/enquiry/k1?crop=Tomato&cropId=c9', loggedInAs: 'farmer' });
  it('validates, then submits internally and states it was not delivered', async () => {
    mockApi({ ...farmerRoutes, '/companies/k1': co, '/crops/mine': { items: [{ _id: 'c9', name: 'Tomato', quantity: 500, unit: 'kg', priceInr: 28, location: 'Mysuru', state: 'Karnataka', country: 'India', grade: 'A' }] },
      'POST /enquiries': { enquiry: { status: 'submitted', subject: 'S', body: 'Body text' }, notice: 'Saved in AgriGlobal as submitted. It has NOT been delivered to the company.', mailto: 'mailto:buy@example.com' } });
    open(); await screen.findByDisplayValue('500'); await userEvent.clear(screen.getByLabelText('Available quantity')); await userEvent.click(screen.getByRole('button', { name: 'Submit enquiry' }));
    expect(await screen.findByText(/positive quantity/i)).toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Available quantity'), '500'); await userEvent.click(screen.getByRole('button', { name: 'Submit enquiry' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/enquiries', expect.objectContaining({ companyId: 'k1', cropId: 'c9', submit: true, expectedPriceInr: 28, grade: 'A' })));
    expect(await screen.findByText(/NOT been delivered/)).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Open in my email app' })).toHaveAttribute('href', expect.stringMatching(/^mailto:buy@example.com/));
  });
  it('saves a draft with submit=false', async () => {
    mockApi({ ...farmerRoutes, '/companies/k1': co, '/crops/mine': { items: [] }, 'POST /enquiries': { enquiry: { status: 'draft', subject: 'S', body: 'B' }, notice: 'Draft only.' } });
    open(); await userEvent.type(await screen.findByLabelText('Available quantity'), '10'); await userEvent.type(screen.getByLabelText('Your location'), 'Mysuru'); await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/enquiries', expect.objectContaining({ submit: false })));
  });
});
describe('Enquiry history', () => {
  const items = [{ _id: 'e1', cropName: 'Tomato', quantity: 5, unit: 'kg', status: 'submitted', createdAt: '2026-10-10', company: { name: 'Alpha', country: 'UAE' }, history: [{ status: 'submitted', at: '2026-10-10', note: 'Submitted internally' }] }, { _id: 'e2', cropName: 'Onion', quantity: 9, unit: 'kg', status: 'draft', createdAt: '2026-10-11', company: { name: 'Beta', country: 'UK' }, history: [] }];
  it('shows honest status labels and only offers actions for drafts', async () => {
    mockApi({ ...farmerRoutes, '/enquiries': { items }, 'POST /enquiries/e2/submit': { enquiry: {} } });
    renderApp(<EnquiryHistory />, { loggedInAs: 'farmer' });
    const row = await screen.findByLabelText('Enquiry Tomato');
    expect(within(row).getByText('Submitted internally (not delivered)')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Submit' })).toHaveLength(1); expect(screen.getAllByLabelText(/^Enquiry /).every((el) => !/delivered \(confirmed\)/i.test(el.textContent))).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' })); await waitFor(() => expect(api.post).toHaveBeenCalledWith('/enquiries/e2/submit'));
  });
  it('filters by status', async () => {
    mockApi({ ...farmerRoutes, '/enquiries': { items } }); renderApp(<EnquiryHistory />, { loggedInAs: 'farmer' }); await screen.findByLabelText('Enquiry Tomato');
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'draft'); expect(screen.queryByLabelText('Enquiry Tomato')).toBeNull(); expect(screen.getByLabelText('Enquiry Onion')).toBeInTheDocument();
  });
});
describe('AI price result details', () => {
  const res = { predicted_price: 1442.8, price_unit: 'INR per quintal', prediction_date: '2026-10-17', model_version: 'v1', metrics_on_holdout: { mae: 24, rmse: 30, r2: 0.98 }, data_range: ['2022-01-01', '2023-08-23'], training_rows: 1200, coverage: { commodities: 2, states: 1, markets: 1 }, warnings: ['Training data spans only 100 days'], limitations: ['Not live'], disclaimer: 'Not a live market price.' };
  it('shows unit, per-kg value, coverage, warnings and limitations; converts to the selected currency', async () => {
    localStorage.setItem('agri_currency', 'AED');
    mockApi({ '/currency/rates': RATES, '/ai/status': { reachable: true, models: { price_model: { loaded: true, version: 'v1' } } }, 'POST /ai/price-prediction': res });
    renderApp(<PricePrediction />, { loggedInAs: null }); await userEvent.type(screen.getByLabelText(/^Crop/), 'Tomato'); await userEvent.click(screen.getByRole('button', { name: /predict/i }));
    expect(await screen.findByTestId('prediction')).toHaveTextContent('INR per quintal'); expect(await screen.findByText(/AED 63\.48 per quintal/)).toBeInTheDocument();
    expect(screen.getByText(/1,200 records, 2 commodities/)).toBeInTheDocument(); expect(screen.getByText(/spans only 100 days/)).toBeInTheDocument(); expect(screen.getByText('Limitations')).toBeInTheDocument();
  });
  it('tells the user when the model is not trained', async () => {
    mockApi({ '/currency/rates': RATES, '/ai/status': { reachable: true, models: { price_model: { loaded: false } } } }); renderApp(<PricePrediction />);
    expect(await screen.findByText(/not trained yet/i)).toBeInTheDocument();
  });
  it('tells the user when the AI service is unreachable', async () => { mockApi({ '/currency/rates': RATES, '/ai/status': { reachable: false, models: {} } }); renderApp(<PricePrediction />); expect(await screen.findByText(/cannot be reached/i)).toBeInTheDocument(); });
});
