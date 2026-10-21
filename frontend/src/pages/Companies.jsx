import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Badge, Notice, Field } from '../components/ui.jsx';
import { Logo } from './GlobalBuyers.jsx';
import { COUNTRIES, safeUrl, fmtDate } from '../utils/format.js';

export function CompanyDirectory({ type }) {
  const exporter = type === 'indian_exporter';
  const [f, setF] = useState({ country: '', state: '', city: '', product: '', q: '' }); const [applied, setApplied] = useState({});
  const params = { type, ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v)) };
  const { data, loading, error, reload } = useApi('/companies', params);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const quick = (patch) => { setF({ ...f, ...patch }); setApplied((a) => ({ ...a, ...patch })); };
  return (
    <div><PageHeader title={exporter ? 'Indian exporter directory' : 'International importer directory'} subtitle={exporter ? 'Exporters are not confirmed buyers. Many do not buy directly from individual farmers.' : 'Verified companies that publicly list the products they handle'} />
      {!exporter && <p className="mb-3 text-sm text-stone-600">Looking for a buyer for your crop? Try <Link className="text-leaf-700 underline" to="/global-buyers">Global Buyers</Link> for filters by crop, country and verified buying requests.</p>}
      {exporter && <div className="mb-3 flex flex-wrap items-center gap-2 text-sm"><span className="text-stone-500">Priority:</span>
        <button type="button" className="btn-outline" onClick={() => quick({ state: 'Karnataka', city: '' })}>Karnataka</button>
        <button type="button" className="btn-outline" onClick={() => quick({ state: 'Karnataka', city: 'Mysuru' })}>Mysuru (Karnataka)</button>
        {(applied.state || applied.city) && <button type="button" className="text-leaf-700 underline" onClick={() => quick({ state: '', city: '' })}>Clear</button>}
      </div>}
      <form className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search" onSubmit={(e) => { e.preventDefault(); setApplied(f); }}>
        {exporter ? <input aria-label="State" placeholder="State (e.g. Karnataka)" className="input" value={f.state} onChange={set('state')} /> : <select aria-label="Country" className="input" value={f.country} onChange={set('country')}><option value="">All countries</option>{COUNTRIES.filter((c) => c !== 'India').map((c) => <option key={c}>{c}</option>)}</select>}
        {!exporter && <input aria-label="State / region" placeholder="State / region" className="input" value={f.state} onChange={set('state')} />}
        <input aria-label="District / city" placeholder={exporter ? 'District / city (e.g. Mysuru)' : 'City / district'} className="input" value={f.city} onChange={set('city')} /><input aria-label="Crop / product" placeholder="Crop / product" className="input" value={f.product} onChange={set('product')} /><input aria-label="Company name" placeholder="Company name" className="input" value={f.q} onChange={set('q')} /><button className="btn-primary">Search</button></form>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Empty title="No companies found" hint="Records are added and verified by the admin from public sources. None are pre-populated." /> : (
        <><div className="mb-3"><Notice>{data.note}</Notice></div>
          <p className="mb-2 text-sm text-stone-500">{data.items.length} compan{data.items.length === 1 ? 'y' : 'ies'} shown</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((c) => { const web = safeUrl(c.website), src = safeUrl(c.sourceUrl); return (
            <div key={c._id} className="card flex flex-col gap-3">
              <div className="flex items-start gap-3"><Logo c={c} />
                <div className="min-w-0 flex-1"><Link to={`/companies/${c._id}`} className="font-semibold hover:underline">{c.name}</Link><p className="text-sm text-stone-500">{[c.city, c.state, c.country].filter(Boolean).join(', ')}</p></div>
                <Badge>{c.verificationStatus}</Badge></div>
              <p className="text-xs text-stone-600">Handles: {c.productsHandled.join(', ') || '-'}</p>
              <p className="text-xs text-stone-500">Last verified: {c.lastVerifiedAt ? fmtDate(c.lastVerifiedAt) : 'Not recorded'}</p>
              <div className="mt-auto flex flex-wrap gap-2"><Link to={`/companies/${c._id}`} className="btn-outline">View details</Link>
                {web && <a className="btn-outline" href={web} target="_blank" rel="noopener noreferrer">Official website</a>}
                {src && <a className="btn-outline" href={src} target="_blank" rel="noopener noreferrer">Source</a>}</div>
            </div>); })}</div></>)}
    </div>
  );
}
export function CompanyDetails() {
  const { id } = useParams(); const { user } = useAuth(); const { data, loading, error, reload } = useApi(`/companies/${id}`);
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const c = data.company; const web = safeUrl(c.website), contact = safeUrl(c.contactPage), src = safeUrl(c.sourceUrl);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-start gap-4"><Logo c={c} size="h-16 w-16" /><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold text-leaf-900">{c.name}</h1><p className="text-stone-500">{[c.city, c.state, c.country].filter(Boolean).join(', ')}</p></div><Badge>{c.verificationStatus}</Badge></div>
      <div className="card space-y-2 text-sm"><p><b>Type:</b> {c.type === 'indian_exporter' ? 'Indian exporter' : 'International importer'}</p><p><b>Category:</b> {c.businessCategory || '-'}</p><p><b>Products handled:</b> {c.productsHandled.join(', ') || '-'}</p>
        <p><b>Website:</b> {web ? <a className="text-leaf-700 underline" href={web} target="_blank" rel="noopener noreferrer">{web}</a> : 'Not publicly available'}</p>
        <p><b>Address:</b> {c.address || 'Not publicly available'}</p><p><b>Public email:</b> {c.email || 'Not publicly available'}</p><p><b>Public phone:</b> {c.phone || 'Not publicly available'}</p><p><b>WhatsApp:</b> {c.whatsapp || 'Not publicly available'}</p>
        <p><b>Contact page:</b> {contact ? <a className="text-leaf-700 underline" href={contact} target="_blank" rel="noopener noreferrer">{contact}</a> : 'Not publicly available'}</p>
        <p><b>Verification evidence:</b> {c.verificationEvidence || 'Not recorded'}</p>
        <p><b>Source:</b> {src ? <a className="text-leaf-700 underline" href={src} target="_blank" rel="noopener noreferrer">{src}</a> : '-'}</p><p><b>Last verified:</b> {fmtDate(c.lastVerifiedAt)}</p></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {web && <a className="btn-outline" href={web} target="_blank" rel="noopener noreferrer">Visit official website</a>}
        {c.email && user?.role === 'farmer' && <Link className="btn-outline" to={`/enquiry/${c._id}`}>Send email (opens your mail app)</Link>}
        {c.phone && <a className="btn-outline" href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}>Call company</a>}
        {contact && <a className="btn-outline" href={contact} target="_blank" rel="noopener noreferrer">Open contact page</a>}
        {user?.role === 'farmer' && <Link className="btn-primary" to={`/enquiry/${c._id}`}>Generate business enquiry</Link>}
      </div>
      <div className="mt-4"><Notice>{data.note} Nothing is sent automatically by this platform.</Notice></div>
    </div>
  );
}
export function BuyerFinder() {
  const [f, setF] = useState({ crop: '', country: '' }); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const crops = useApi('/crops/mine');
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setRes(null); if (f.crop.trim().length < 2) return setErr('Enter or choose a crop'); setBusy(true);
    try { setRes((await api.get('/companies/match', { params: { crop: f.crop.trim(), ...(f.country && { country: f.country }) } })).data); } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  return (
    <div><PageHeader title="International buyer finder" subtitle="Rule-based matching against verified company records" />
      <form onSubmit={submit} className="card mb-4 grid gap-3 sm:grid-cols-3" noValidate>
        <div><input aria-label="Crop" list="mycrops" placeholder="Crop (e.g. Tomato)" className="input" value={f.crop} onChange={(e) => setF({ ...f, crop: e.target.value })} /><datalist id="mycrops">{(crops.data?.items || []).map((c) => <option key={c._id} value={c.name} />)}</datalist></div>
        <select aria-label="Target country" className="input" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option value="">Any country</option>{COUNTRIES.filter((c) => c !== 'India').map((c) => <option key={c}>{c}</option>)}</select><button className="btn-primary" disabled={busy}>{busy ? 'Searching...' : 'Find companies'}</button></form>
      {err && <ErrorBox message={err} />}
      {res && (!res.items.length ? <Empty title="No matching verified companies" hint="Only verified records that publicly list this product are shown." /> : <><div className="mb-3"><Notice>{res.note}</Notice></div><div className="space-y-3">{res.items.map(({ company, score, reasons }) => { const web = safeUrl(company.website), src = safeUrl(company.sourceUrl); return (
        <div key={company._id} className="card"><div className="flex flex-wrap items-center justify-between gap-2"><Link to={`/companies/${company._id}`} className="font-semibold text-leaf-700">{company.name}</Link><span className="rounded bg-leaf-100 px-2 py-0.5 text-xs">Match score {score}/100</span></div><p className="text-sm text-stone-500">{company.city ? `${company.city}, ` : ''}{company.country}</p>
          {company.productsHandled?.length > 0 && <p className="mt-1 text-xs text-stone-600">Handles: {company.productsHandled.join(', ')}</p>}
          <ul className="mt-2 list-disc pl-5 text-sm text-stone-700">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <div className="mt-2 flex flex-wrap gap-2">{web && <a className="btn-outline" href={web} target="_blank" rel="noopener noreferrer">Official website</a>}{src && <a className="btn-outline" href={src} target="_blank" rel="noopener noreferrer">Source</a>}<Link className="btn-outline" to={`/companies/${company._id}`}>View details</Link></div></div>); })}</div></>)}
    </div>
  );
}
