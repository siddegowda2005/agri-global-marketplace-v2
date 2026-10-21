import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Badge, Notice, Field } from '../components/ui.jsx';
import { ENQUIRY_STATUS_LABEL, fmtDate } from '../utils/format.js';

export function Enquiry() {
  const { companyId } = useParams(); const [sp] = useSearchParams(); const { toast } = useToast(); const { user } = useAuth();
  const company = useApi(`/companies/${companyId}`); const mine = useApi('/crops/mine');
  const [f, setF] = useState({ cropName: sp.get('crop') || '', quantity: '', unit: 'kg', location: [user?.city, user?.state, 'India'].filter(Boolean).join(', '), expectedPriceInr: '', grade: '', message: '', contactPreference: 'any', cropId: sp.get('cropId') || '' });
  const [result, setResult] = useState(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fillFrom = (c) => setF((s) => ({ ...s, cropId: c._id, cropName: c.name, quantity: String(c.quantity), unit: c.unit, expectedPriceInr: String(c.priceInr), grade: c.grade && c.grade !== 'Ungraded' ? c.grade : '', location: [c.location, c.state, c.country].filter(Boolean).join(', ') }));
  useEffect(() => { const id = sp.get('cropId'); const c = id && mine.data?.items?.find((x) => x._id === id); if (c) fillFrom(c); }, [mine.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async (submit) => {
    const v = {};
    if (f.cropName.trim().length < 2) v.cropName = 'Crop is required'; if (!(Number(f.quantity) > 0)) v.quantity = 'Enter a positive quantity'; if (f.location.trim().length < 2) v.location = 'Location is required';
    if (f.expectedPriceInr !== '' && !(Number(f.expectedPriceInr) >= 0)) v.expectedPriceInr = 'Enter a valid price';
    setErrs(v); if (Object.keys(v).length) return; setBusy(true);
    const body = { companyId, cropName: f.cropName.trim(), quantity: Number(f.quantity), unit: f.unit, location: f.location.trim(), contactPreference: f.contactPreference, submit,
      ...(f.cropId && { cropId: f.cropId }), ...(f.expectedPriceInr !== '' && { expectedPriceInr: Number(f.expectedPriceInr) }), ...(f.grade.trim() && { grade: f.grade.trim() }), ...(f.message.trim() && { message: f.message.trim() }) };
    try { const { data } = await api.post('/enquiries', body); setResult({ ...data, draft: { subject: data.enquiry.subject, body: data.enquiry.body } }); toast(submit ? 'Enquiry saved (not delivered)' : 'Draft saved'); }
    catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };
  if (company.loading) return <Spinner />; if (company.error) return <ErrorBox message={company.error} />;
  const c = company.data.company;
  const mailto = result && c.email ? `mailto:${c.email}?subject=${encodeURIComponent(result.draft.subject)}&body=${encodeURIComponent(result.draft.body)}` : null;
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title="Send enquiry" subtitle={`To: ${c.name}`} />
      <Notice>Enquiries are saved in AgriGlobal only. This platform does not email or message companies, so nothing is delivered unless you send it yourself.</Notice>
      <form onSubmit={(e) => { e.preventDefault(); send(true); }} noValidate className="card mt-3">
        {mine.data?.items?.length > 0 && <Field label="Prefill from my crop" id="prefill"><select id="prefill" className="input" value={f.cropId} onChange={(e) => { const x = mine.data.items.find((i) => i._id === e.target.value); if (x) fillFrom(x); }}><option value="">Choose...</option>{mine.data.items.map((x) => <option key={x._id} value={x._id}>{x.name} ({x.quantity} {x.unit})</option>)}</select></Field>}
        <Field label="Crop" id="cropName" error={errs.cropName}><input id="cropName" className="input" value={f.cropName} onChange={set('cropName')} /></Field>
        <div className="grid gap-x-3 sm:grid-cols-2"><Field label="Available quantity" id="quantity" error={errs.quantity}><input id="quantity" type="number" min="0" step="any" className="input" value={f.quantity} onChange={set('quantity')} /></Field><Field label="Unit" id="unit"><select id="unit" className="input" value={f.unit} onChange={set('unit')}><option>kg</option><option>quintal</option><option>tonne</option></select></Field>
          <Field label="Expected price (INR per unit)" id="expectedPriceInr" error={errs.expectedPriceInr}><input id="expectedPriceInr" type="number" min="0" step="any" className="input" value={f.expectedPriceInr} onChange={set('expectedPriceInr')} /></Field><Field label="Quality / grade" id="grade"><input id="grade" className="input" value={f.grade} onChange={set('grade')} placeholder="e.g. Grade A" /></Field></div>
        <Field label="Your location" id="location" error={errs.location}><input id="location" className="input" value={f.location} onChange={set('location')} /></Field>
        <Field label="Message (optional)" id="message"><textarea id="message" rows="4" maxLength={2000} className="input" value={f.message} onChange={set('message')} /></Field>
        <Field label="Preferred contact method" id="pref" hint="Your contact details are kept private and shown only to admins."><select id="pref" className="input" value={f.contactPreference} onChange={set('contactPreference')}><option value="any">Any</option><option value="email">Email</option><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option></select></Field>
        <div className="flex flex-wrap gap-2"><button type="button" className="btn-outline" disabled={busy} onClick={() => send(false)}>Save as draft</button><button className="btn-primary" disabled={busy}>Submit enquiry</button></div></form>
      {result && <div className="card mt-4" aria-live="polite"><div className="mb-2 flex items-center gap-2"><Badge>{result.enquiry.status}</Badge><span className="text-sm">{ENQUIRY_STATUS_LABEL[result.enquiry.status]}</span></div><Notice>{result.notice}</Notice>
        <Field label="Message you can send yourself (editable)" id="body"><textarea id="body" rows="10" className="input mt-3 font-mono" value={result.draft.body} onChange={(e) => setResult({ ...result, draft: { ...result.draft, body: e.target.value } })} /></Field>
        <div className="flex flex-wrap gap-2">{mailto ? <a className="btn-outline" href={mailto}>Open in my email app</a> : <span className="text-sm text-stone-500">No public email on record for this company.</span>}<Link className="btn-primary" to="/enquiries">View enquiry history</Link></div></div>}
    </div>
  );
}
export function EnquiryHistory() {
  const { data, loading, error, reload } = useApi('/enquiries'); const { toast } = useToast(); const [status, setStatus] = useState('');
  const act = async (fn, msg) => { try { await fn(); toast(msg); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const items = data.items.filter((e) => !status || e.status === status);
  return (
    <div className="mx-auto max-w-3xl"><PageHeader title="Enquiry history" subtitle="Statuses reflect what this platform actually knows">
      <select aria-label="Filter by status" className="input w-52" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(ENQUIRY_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></PageHeader>
      {!items.length ? <Empty title="No enquiries yet"><Link className="btn-primary mt-3" to="/global-buyers">Find international buyers</Link></Empty> : <div className="space-y-3">{items.map((e) => (
        <article key={e._id} className="card" aria-label={`Enquiry ${e.cropName}`}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{e.cropName} · {e.quantity} {e.unit}</p><p className="text-sm text-stone-500">To {e.company?.name} ({e.company?.country}) · {fmtDate(e.createdAt)}</p></div><div className="text-right"><Badge>{e.status}</Badge><p className="mt-1 text-xs text-stone-500">{ENQUIRY_STATUS_LABEL[e.status]}</p></div></div>
          {e.history?.length > 0 && <ul className="mt-2 border-l-2 border-stone-200 pl-3 text-xs text-stone-600">{e.history.map((h, i) => <li key={i}>{fmtDate(h.at)} - {ENQUIRY_STATUS_LABEL[h.status] || h.status}{h.note ? `: ${h.note}` : ''}</li>)}</ul>}
          {e.status === 'draft' && <div className="mt-3 flex gap-2"><button className="btn-primary" onClick={() => act(() => api.post(`/enquiries/${e._id}/submit`), 'Submitted internally')}>Submit</button><button className="btn-danger" onClick={() => window.confirm('Delete this draft?') && act(() => api.delete(`/enquiries/${e._id}`), 'Draft deleted')}>Delete draft</button></div>}
        </article>))}</div>}
    </div>
  );
}
