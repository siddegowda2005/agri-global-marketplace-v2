import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Badge, Notice, Field } from '../components/ui.jsx';
import { COUNTRIES, safeUrl, fmtDate } from '../utils/format.js';

export function CompanyDirectory({ type }) {
  const exporter = type === 'indian_exporter';
  const [f, setF] = useState({ country: '', state: '', city: '', product: '', q: '' }); const [applied, setApplied] = useState({});
  const params = { type, ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v)) };
  const { data, loading, error, reload } = useApi('/companies', params);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div><PageHeader title={exporter ? 'Indian exporter directory' : 'International importer directory'} subtitle={exporter ? 'Exporters are not confirmed buyers. Many do not buy directly from individual farmers.' : 'Verified companies that publicly list the products they handle'} />
      <form className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="search" onSubmit={(e) => { e.preventDefault(); setApplied(f); }}>
        {exporter ? <input aria-label="State" placeholder="State" className="input" value={f.state} onChange={set('state')} /> : <select aria-label="Country" className="input" value={f.country} onChange={set('country')}><option value="">All countries</option>{COUNTRIES.filter((c) => c !== 'India').map((c) => <option key={c}>{c}</option>)}</select>}
        <input aria-label="City" placeholder="City" className="input" value={f.city} onChange={set('city')} /><input aria-label="Crop / product" placeholder="Crop / product" className="input" value={f.product} onChange={set('product')} /><input aria-label="Company name" placeholder="Company name" className="input" value={f.q} onChange={set('q')} /><button className="btn-primary">Search</button></form>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Empty title="No companies found" hint="Records are added and verified by the admin from public sources. None are pre-populated." /> : (
        <><div className="mb-3"><Notice>{data.note}</Notice></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((c) => <Link key={c._id} to={`/companies/${c._id}`} className="card hover:shadow-md"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{c.name}</h3><Badge>{c.verificationStatus}</Badge></div><p className="text-sm text-stone-500">{[c.city, c.state, c.country].filter(Boolean).join(', ')}</p><p className="mt-2 text-xs text-stone-600">Handles: {c.productsHandled.join(', ') || '-'}</p></Link>)}</div></>)}
    </div>
  );
}
export function CompanyDetails() {
  const { id } = useParams(); const { user } = useAuth(); const { data, loading, error, reload } = useApi(`/companies/${id}`);
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const c = data.company; const web = safeUrl(c.website), contact = safeUrl(c.contactPage), src = safeUrl(c.sourceUrl);
  return (
    <div className="mx-auto max-w-3xl"><PageHeader title={c.name} subtitle={[c.city, c.state, c.country].filter(Boolean).join(', ')}><Badge>{c.verificationStatus}</Badge></PageHeader>
      <div className="card space-y-2 text-sm"><p><b>Type:</b> {c.type === 'indian_exporter' ? 'Indian exporter' : 'International importer'}</p><p><b>Category:</b> {c.businessCategory || '-'}</p><p><b>Products handled:</b> {c.productsHandled.join(', ') || '-'}</p>
        {c.address && <p><b>Address:</b> {c.address}</p>}{c.email && <p><b>Public email:</b> {c.email}</p>}{c.phone && <p><b>Public phone:</b> {c.phone}</p>}
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
      {res && (!res.items.length ? <Empty title="No matching verified companies" hint="Only verified records that publicly list this product are shown." /> : <><div className="mb-3"><Notice>{res.note}</Notice></div><div className="space-y-3">{res.items.map(({ company, score, reasons }) => <div key={company._id} className="card"><div className="flex flex-wrap items-center justify-between gap-2"><Link to={`/companies/${company._id}`} className="font-semibold text-leaf-700">{company.name}</Link><span className="rounded bg-leaf-100 px-2 py-0.5 text-xs">Match score {score}/100</span></div><p className="text-sm text-stone-500">{company.city ? `${company.city}, ` : ''}{company.country}</p><ul className="mt-2 list-disc pl-5 text-sm text-stone-700">{reasons.map((r) => <li key={r}>{r}</li>)}</ul></div>)}</div></>)}
    </div>
  );
}
export function Enquiry() {
  const { companyId } = useParams(); const { toast } = useToast(); const { user } = useAuth(); const company = useApi(`/companies/${companyId}`); const mine = useApi('/crops/mine'); const past = useApi('/enquiries');
  const [f, setF] = useState({ cropName: '', quantity: '', unit: 'kg', location: [user.city, user.state, 'India'].filter(Boolean).join(', ') }); const [draft, setDraft] = useState(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fill = (e) => { const c = (mine.data?.items || []).find((x) => x._id === e.target.value); if (c) setF({ ...f, cropName: c.name, quantity: String(c.quantity), unit: c.unit, location: [c.location, c.state, c.country].filter(Boolean).join(', ') }); };
  const submit = async (e) => {
    e.preventDefault(); const v = {};
    if (f.cropName.trim().length < 2) v.cropName = 'Crop is required'; if (!(Number(f.quantity) > 0)) v.quantity = 'Enter a positive quantity'; if (f.location.trim().length < 2) v.location = 'Location is required';
    setErrs(v); if (Object.keys(v).length) return; setBusy(true);
    try { const { data } = await api.post('/enquiries', { companyId, cropName: f.cropName.trim(), quantity: Number(f.quantity), unit: f.unit, location: f.location.trim() }); setDraft({ subject: data.enquiry.subject, body: data.enquiry.body }); toast('Draft created. Review it before sending.'); past.reload(); }
    catch (e2) { toast(errMsg(e2), 'error'); } finally { setBusy(false); }
  };
  if (company.loading) return <Spinner />; if (company.error) return <ErrorBox message={company.error} />;
  const c = company.data.company;
  const mailto = draft && c.email ? `mailto:${c.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}` : null;
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title="Business enquiry" subtitle={`To: ${c.name}`} />
      <form onSubmit={submit} noValidate className="card">
        {mine.data?.items?.length > 0 && <Field label="Prefill from my crop" id="prefill"><select id="prefill" className="input" defaultValue="" onChange={fill}><option value="">Choose...</option>{mine.data.items.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select></Field>}
        <Field label="Crop" id="cropName" error={errs.cropName}><input id="cropName" className="input" value={f.cropName} onChange={set('cropName')} /></Field>
        <div className="grid gap-x-3 sm:grid-cols-2"><Field label="Quantity" id="quantity" error={errs.quantity}><input id="quantity" type="number" min="0" step="any" className="input" value={f.quantity} onChange={set('quantity')} /></Field><Field label="Unit" id="unit"><select id="unit" className="input" value={f.unit} onChange={set('unit')}><option>kg</option><option>quintal</option><option>tonne</option></select></Field></div>
        <Field label="Your location" id="location" error={errs.location}><input id="location" className="input" value={f.location} onChange={set('location')} /></Field>
        <button className="btn-primary" disabled={busy}>Generate enquiry draft</button></form>
      {draft && <div className="card mt-4"><Field label="Subject" id="subject"><input id="subject" className="input" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></Field><Field label="Message (edit as needed)" id="body"><textarea id="body" rows="12" className="input font-mono" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
        {mailto ? <a className="btn-primary" href={mailto}>Open in my email app</a> : <p className="text-sm text-stone-500">This company has no public email on record. Use its website or contact page.</p>}
        <div className="mt-3"><Notice>Draft only. The platform does not send emails; opening your email app does not mean a message was sent.</Notice></div></div>}
      {past.data?.items?.length > 0 && <div className="mt-6"><h2 className="mb-2 font-semibold">Your recent enquiry drafts</h2><ul className="space-y-1 text-sm">{past.data.items.slice(0, 10).map((x) => <li key={x._id} className="card py-2">{x.cropName} → {x.company?.name} <span className="text-xs text-stone-500">({fmtDate(x.createdAt)})</span></li>)}</ul></div>}
    </div>
  );
}
