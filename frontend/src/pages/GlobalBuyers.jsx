import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Badge, Notice } from '../components/ui.jsx';
import { CATEGORIES, BUYER_TYPES, GLOBAL_COUNTRIES, NA, flag, safeUrl, fmtDate } from '../utils/format.js';

const Row = ({ label, children }) => <div className="flex gap-2 text-sm"><dt className="w-28 shrink-0 text-stone-500">{label}</dt><dd className="min-w-0 break-words">{children}</dd></div>;
const waLink = (n) => { const d = String(n || '').replace(/\D/g, ''); return d.length >= 7 ? `https://wa.me/${d}` : null; };

/** Public business contact methods only; anything not on record reads "Not publicly available". */
export function ContactPanel({ c }) {
  const contact = safeUrl(c.contactPage), wa = waLink(c.whatsapp);
  return (
    <dl className="space-y-1 rounded-lg bg-stone-50 p-3" aria-label={`Contact details for ${c.name}`}>
      <Row label="Email">{c.email ? <a className="text-leaf-700 underline" href={`mailto:${c.email}`}>{c.email}</a> : NA}</Row>
      <Row label="Phone">{c.phone ? <a className="text-leaf-700 underline" href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}>{c.phone}</a> : NA}</Row>
      <Row label="WhatsApp">{wa ? <a className="text-leaf-700 underline" href={wa} target="_blank" rel="noopener noreferrer">{c.whatsapp}</a> : NA}</Row>
      <Row label="Address">{c.address || NA}</Row>
      <Row label="Contact page">{contact ? <a className="text-leaf-700 underline" href={contact} target="_blank" rel="noopener noreferrer">Open contact page</a> : NA}</Row>
    </dl>
  );
}
export function Logo({ c, size = 'h-12 w-12' }) {
  const src = safeUrl(c.logoUrl);
  return src ? <img src={src} alt={`${c.name} logo`} referrerPolicy="no-referrer" className={`${size} rounded-lg border border-stone-200 bg-white object-contain`} />
    : <div aria-hidden="true" className={`${size} flex items-center justify-center rounded-lg bg-leaf-100 text-lg font-bold text-leaf-700`}>{c.name.slice(0, 1).toUpperCase()}</div>;
}
function BuyerCard({ c, crop, cropId }) {
  const [showContact, setShowContact] = useState(false); const { user } = useAuth(); const web = safeUrl(c.website);
  const q = new URLSearchParams({ ...(crop && { crop }), ...(cropId && { cropId }) }).toString();
  return (
    <article className="card flex flex-col gap-3" aria-label={c.name}>
      <div className="flex items-start gap-3"><Logo c={c} />
        <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{c.name}</h3><p className="text-sm text-stone-500"><span aria-label={c.country}>{flag(c.country)}</span> {[c.city, c.country].filter(Boolean).join(', ')}</p></div>
        <Badge>{c.buyingStatus}</Badge></div>
      <dl className="space-y-1"><Row label="Buyer type"><span className="capitalize">{c.buyerType || 'importer'}</span></Row><Row label="Products">{c.productsHandled?.length ? c.productsHandled.join(', ') : NA}</Row>
        <Row label="Min. order">{c.minimumOrderQuantity || NA}</Row><Row label="Last verified">{c.lastVerifiedAt ? fmtDate(c.lastVerifiedAt) : NA}</Row></dl>
      {c.activeRequests?.length > 0 && <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-900">{c.activeRequests.slice(0, 2).map((r) => <p key={r._id}>Verified request: {r.crop}{r.quantity ? ` · ${r.quantity} ${r.unit || ''}` : ''}{r.expiresAt ? ` · until ${new Date(r.expiresAt).toLocaleDateString()}` : ''}</p>)}</div>}
      {showContact && <ContactPanel c={c} />}
      <div className="mt-auto flex flex-wrap gap-2">
        <Link to={`/global-buyers/${c._id}${q ? `?${q}` : ''}`} className="btn-outline">View Company Details</Link>
        {web ? <a className="btn-outline" href={web} target="_blank" rel="noopener noreferrer">Visit Official Website</a> : <button className="btn-outline" disabled title={NA}>Visit Official Website</button>}
        <button className="btn-outline" aria-expanded={showContact} onClick={() => setShowContact(!showContact)}>Contact Buyer</button>
        {user?.role === 'farmer' && <Link to={`/enquiry/${c._id}${q ? `?${q}` : ''}`} className="btn-primary">Send Enquiry</Link>}
      </div>
    </article>
  );
}
function RequestCard({ r }) {
  const src = safeUrl(r.sourceUrl); const co = r.company || {};
  return (
    <article className="card space-y-1 text-sm" aria-label={`Buying request for ${r.crop}`}>
      <div className="flex items-start justify-between gap-2"><h3 className="font-semibold capitalize">{r.crop}</h3><Badge>active</Badge></div>
      <p><Link className="text-leaf-700 underline" to={`/global-buyers/${co._id}`}>{co.name}</Link> · {flag(co.country)} {co.country}</p>
      <dl className="space-y-1"><Row label="Quantity">{r.quantity ? `${r.quantity} ${r.unit || ''}` : NA}</Row><Row label="Quality">{r.quality || NA}</Row><Row label="Min. order">{r.minimumOrderQuantity || NA}</Row><Row label="Destination">{r.deliveryDestination || NA}</Row>
        <Row label="Requested">{fmtDate(r.requestDate)}</Row><Row label="Expires">{r.expiresAt ? fmtDate(r.expiresAt) : 'No expiry published'}</Row><Row label="Last checked">{fmtDate(r.lastCheckedAt)}</Row>
        <Row label="Source">{src ? <a className="text-leaf-700 underline" href={src} target="_blank" rel="noopener noreferrer">Official source</a> : NA}</Row></dl>
    </article>
  );
}
const Pager = ({ data, page, setPage }) => data.pages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button className="btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="text-sm">Page {data.page} of {data.pages}</span><button className="btn-outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>;

const EMPTY = { crop: '', country: '', q: '', buyerType: '', status: '', category: '' };
export function GlobalBuyers() {
  const [sp, setSp] = useSearchParams(); const tab = sp.get('tab') === 'requests' ? 'requests' : 'companies';
  const [form, setForm] = useState({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, sp.get(k) || ''])) });
  const page = Number(sp.get('page')) || 1; const cropId = sp.get('cropId') || '';
  useEffect(() => { setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, sp.get(k) || ''])) }); }, [sp]);
  const applied = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, sp.get(k)]).filter(([, v]) => v));
  const params = tab === 'requests' ? { ...(applied.crop && { crop: applied.crop }), ...(applied.country && { country: applied.country }), page, limit: 12 } : { ...applied, page, limit: 12 };
  const { data, loading, error, reload } = useApi(tab === 'requests' ? '/global-buyers/requests' : '/global-buyers', params);
  const push = (next) => setSp(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  const submit = (e) => { e.preventDefault(); push({ ...form, tab: tab === 'requests' ? 'requests' : '', cropId: form.crop === sp.get('crop') ? cropId : '' }); };
  const setPage = (p) => push({ ...applied, tab: tab === 'requests' ? 'requests' : '', cropId, page: p });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const hasFilters = Object.keys(applied).length > 0;
  return (
    <div>
      <PageHeader title="Global Buyers" subtitle="Find genuine international agricultural companies for your crop" />
      <div className="mb-4 flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === 'companies'} className={tab === 'companies' ? 'btn-primary' : 'btn-outline'} onClick={() => push({ ...applied, cropId })}>Importers &amp; Buyers</button>
        <button role="tab" aria-selected={tab === 'requests'} className={tab === 'requests' ? 'btn-primary' : 'btn-outline'} onClick={() => push({ crop: applied.crop, country: applied.country, tab: 'requests', cropId })}>Active Buying Requests</button>
      </div>
      <form onSubmit={submit} className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Global buyer filters">
        <input aria-label="Crop" placeholder="Crop (e.g. tomato)" className="input lg:col-span-2" value={form.crop} onChange={set('crop')} />
        <select aria-label="Country" className="input" value={form.country} onChange={set('country')}><option value="">All countries</option>{GLOBAL_COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
        {tab === 'companies' && <>
          <input aria-label="Company name" placeholder="Company name" className="input" value={form.q} onChange={set('q')} />
          <select aria-label="Buyer type" className="input" value={form.buyerType} onChange={set('buyerType')}><option value="">All buyer types</option>{BUYER_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}</select>
          <select aria-label="Buying status" className="input" value={form.status} onChange={set('status')}><option value="">Any status</option><option value="currently_buying">Currently Buying</option><option value="potential">Potential Buyer</option></select>
          <select aria-label="Product category" className="input lg:col-span-2" value={form.category} onChange={set('category')}><option value="">All product categories</option>{CATEGORIES.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}</select></>}
        <div className="flex gap-2 lg:col-span-4"><button className="btn-primary">Search</button><button type="button" className="btn-outline" disabled={!hasFilters} onClick={() => { setForm(EMPTY); push({ tab: tab === 'requests' ? 'requests' : '' }); }}>Clear filters</button></div>
      </form>
      {applied.crop && cropId && <p className="mb-3 text-sm text-stone-600">Showing buyers for your listing: <b>{applied.crop}</b></p>}
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : tab === 'requests' ? (
        !data.items.length ? <Empty title="No verified active buying requests available." hint="Requests appear only after an admin verifies them against a cited source, and they disappear when they expire or go stale." /> : <>
          <div className="mb-3"><Notice>Only verified requests that have not expired and were re-checked within {data.staleAfterDays} days are shown.</Notice></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((r) => <RequestCard key={r._id} r={r} />)}</div><Pager data={data} page={page} setPage={setPage} /></>
      ) : !data.items.length ? <Empty title="No companies match your filters" hint="Records are added by the admin from public sources and shown only after verification. Try fewer filters." />
        : <><div className="mb-3"><Notice>{data.note}</Notice></div><p className="mb-2 text-sm text-stone-500">{data.total} compan{data.total === 1 ? 'y' : 'ies'}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((c) => <BuyerCard key={c._id} c={c} crop={applied.crop} cropId={cropId} />)}</div><Pager data={data} page={page} setPage={setPage} /></>}
    </div>
  );
}
export function GlobalBuyerDetails() {
  const { id } = useParams(); const [sp] = useSearchParams(); const { user } = useAuth(); const { data, loading, error, reload } = useApi(`/global-buyers/${id}`);
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const c = data.company; const web = safeUrl(c.website); const q = sp.toString();
  const sources = (c.sources?.length ? c.sources : [{ url: c.sourceUrl, label: 'Source' }]).filter((s) => safeUrl(s.url));
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-start gap-4"><Logo c={c} size="h-16 w-16" /><div className="flex-1"><h1 className="text-2xl font-bold text-leaf-900">{c.name}</h1><p className="text-stone-500">{flag(c.country)} {[c.city, c.country].filter(Boolean).join(', ')}</p></div><Badge>{c.buyingStatus}</Badge></div>
      <div className="card space-y-1"><dl className="space-y-1"><Row label="Buyer type"><span className="capitalize">{c.buyerType}</span></Row><Row label="Business category">{c.businessCategory || NA}</Row><Row label="Products">{c.productsHandled?.length ? c.productsHandled.join(', ') : NA}</Row><Row label="Categories">{c.productCategories?.length ? c.productCategories.join(', ') : NA}</Row><Row label="Min. order">{c.minimumOrderQuantity || NA}</Row>
        <Row label="Website">{web ? <a className="text-leaf-700 underline" href={web} target="_blank" rel="noopener noreferrer">{web}</a> : NA}</Row></dl></div>
      <h2 className="mb-2 mt-5 font-semibold">Public contact details</h2><ContactPanel c={c} />
      <h2 className="mb-2 mt-5 font-semibold">Verification</h2>
      <div className="card space-y-1 text-sm"><Row label="Status"><Badge>{c.verificationStatus}</Badge></Row><Row label="Last verified">{fmtDate(c.lastVerifiedAt)}</Row><Row label="Last checked">{fmtDate(c.lastCheckedAt)}</Row><Row label="Evidence">{c.verificationEvidence || NA}</Row>
        <Row label="Sources">{sources.length ? <ul>{sources.map((s) => <li key={s.url}><a className="text-leaf-700 underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.label || s.url}</a></li>)}</ul> : NA}</Row></div>
      <h2 className="mb-2 mt-5 font-semibold">Active buying requests</h2>
      {c.activeRequests.length ? <div className="grid gap-3 sm:grid-cols-2">{c.activeRequests.map((r) => <RequestCard key={r._id} r={{ ...r, company: { _id: c._id, name: c.name, country: c.country } }} />)}</div> : <p className="text-sm text-stone-500">No verified active buying requests available.</p>}
      <div className="mt-5 flex flex-wrap gap-2">{user?.role === 'farmer' && <Link className="btn-primary" to={`/enquiry/${c._id}${q ? `?${q}` : ''}`}>Send Enquiry</Link>}<Link className="btn-outline" to="/global-buyers">Back to Global Buyers</Link></div>
      <div className="mt-4"><Notice>{data.note} An enquiry is stored in AgriGlobal only; it is not delivered to the company by this platform.</Notice></div>
    </div>
  );
}
