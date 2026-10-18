import { useEffect, useState } from 'react';
import api, { errMsg } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../components/Toast.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Badge, Field } from '../components/ui.jsx';
import { fmtDate } from '../utils/format.js';

const TABS = ['Overview', 'Users', 'Crops', 'Orders', 'Companies', 'Buying requests', 'Enquiries', 'Collection centers', 'Export guides'];
const COMPANY_FIELDS = [
  { name: 'type', label: 'Type', type: 'select', options: ['international_importer', 'indian_exporter'], required: true }, { name: 'name', label: 'Company name', required: true },
  { name: 'country', label: 'Country', required: true }, { name: 'state', label: 'State' }, { name: 'city', label: 'City' },
  { name: 'buyerType', label: 'Buyer type', type: 'select', options: ['importer', 'wholesaler', 'distributor', 'retailer', 'processor', 'exporter', 'other'] },
  { name: 'productsHandled', label: 'Products handled (comma separated)', type: 'list' }, { name: 'productCategories', label: 'Product categories (e.g. vegetables, fruits)', type: 'list' },
  { name: 'businessCategory', label: 'Business category' }, { name: 'minimumOrderQuantity', label: 'Minimum order quantity (only if published)' },
  { name: 'website', label: 'Official website (https://...)' }, { name: 'contactPage', label: 'Contact page URL' }, { name: 'logoUrl', label: 'Logo URL (only where permitted)' },
  { name: 'email', label: 'Public business email' }, { name: 'phone', label: 'Public business phone' }, { name: 'whatsapp', label: 'Public business WhatsApp' }, { name: 'address', label: 'Public address' },
  { name: 'sourceUrl', label: 'Primary source URL (where this was found)', required: true }];
const REQUEST_FIELDS = [
  { name: 'company', label: 'Company', type: 'ref', optionsUrl: '/companies', required: true }, { name: 'crop', label: 'Crop requested', required: true },
  { name: 'quantity', label: 'Required quantity', type: 'number' }, { name: 'unit', label: 'Unit (kg, tonne...)' }, { name: 'quality', label: 'Quality requirements' },
  { name: 'minimumOrderQuantity', label: 'Minimum order quantity (if published)' }, { name: 'deliveryDestination', label: 'Delivery destination' },
  { name: 'requestDate', label: 'Request date', type: 'date', required: true }, { name: 'expiresAt', label: 'Expiration date (if published)', type: 'date' },
  { name: 'sourceUrl', label: 'Official source URL', required: true }];
const CENTER_FIELDS = [{ name: 'name', label: 'Name', required: true }, { name: 'kind', label: 'Kind', type: 'select', options: ['collection_center', 'export_facility', 'cold_storage'] }, { name: 'address', label: 'Address' }, { name: 'state', label: 'State' }, { name: 'city', label: 'City' },
  { name: 'latitude', label: 'Latitude', type: 'number', required: true }, { name: 'longitude', label: 'Longitude', type: 'number', required: true }, { name: 'sourceUrl', label: 'Source URL', required: true }];
const GUIDE_FIELDS = [{ name: 'topic', label: 'Topic', required: true }, { name: 'title', label: 'Title', required: true }, { name: 'content', label: 'Content', type: 'textarea', required: true }, { name: 'sourceName', label: 'Source name', required: true }, { name: 'sourceUrl', label: 'Source URL', required: true }, { name: 'order', label: 'Display order', type: 'number' }];

function Resource({ base, listUrl, fields, columns, canVerify, evidence, extra }) {
  const { data, loading, error, reload } = useApi(listUrl); const { toast } = useToast();
  const [form, setForm] = useState(null); const [editId, setEditId] = useState(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState({}); const [refs, setRefs] = useState({});
  useEffect(() => { fields.filter((f) => f.optionsUrl).forEach((f) => api.get(f.optionsUrl).then((r) => setRefs((s) => ({ ...s, [f.name]: r.data.items.map((i) => ({ value: i._id, label: `${i.name} (${i.country})` })) }))).catch(() => {})); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const initial = (f, item) => {
    const v = item?.[f.name];
    if (f.type === 'list') return (v || []).join(', ');
    if (f.type === 'date') return v ? String(v).slice(0, 10) : '';
    if (f.type === 'ref') return v?._id || v || '';
    return v ?? (f.type === 'select' ? f.options[0] : '');
  };
  const open = (item) => { setEditId(item?._id || null); setForm(Object.fromEntries(fields.map((f) => [f.name, initial(f, item)]))); setErrs({}); };
  const save = async (e) => {
    e.preventDefault(); const v = {}; fields.forEach((f) => { if (f.required && String(form[f.name]).trim() === '') v[f.name] = 'Required'; }); setErrs(v); if (Object.keys(v).length) return;
    const body = {}; fields.forEach((f) => { const val = form[f.name]; if (val === '' && !f.required) return; body[f.name] = f.type === 'list' ? val.split(',').map((x) => x.trim()).filter(Boolean) : f.type === 'number' ? Number(val) : typeof val === 'string' ? val.trim() : val; });
    setBusy(true);
    try { if (editId) await api.put(`${base}/${editId}`, body); else await api.post(base, body); toast('Saved'); setForm(null); reload(); } catch (e2) { toast(errMsg(e2), 'error'); } finally { setBusy(false); }
  };
  const act = async (fn, msg) => { try { await fn(); toast(msg); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  const verify = (it) => {
    let payload;
    if (evidence) { const ev = window.prompt('Verification evidence: what did you check, and where? (min 10 characters)'); if (!ev) return; payload = { evidence: ev }; }
    return act(() => api.post(`${base}/${it._id}/verify`, payload), 'Verified');
  };
  const input = (f) => {
    const id = `f-${f.name}`; const val = form[f.name]; const on = (e) => setForm({ ...form, [f.name]: e.target.value });
    if (f.type === 'select') return <select id={id} className="input" value={val} onChange={on}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>;
    if (f.type === 'ref') return <select id={id} className="input" value={val} onChange={on}><option value="">Choose...</option>{(refs[f.name] || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
    if (f.type === 'textarea') return <textarea id={id} rows="4" className="input" value={val} onChange={on} />;
    return <input id={id} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} step="any" className="input" value={val} onChange={on} />;
  };
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div><button className="btn-primary mb-3" onClick={() => open(null)}>+ Add new</button>
      {form && <form onSubmit={save} noValidate className="card mb-4 grid gap-x-3 sm:grid-cols-2">{fields.map((f) => <Field key={f.name} label={f.label} id={`f-${f.name}`} error={errs[f.name]}>{input(f)}</Field>)}
        <div className="flex gap-2 sm:col-span-2"><button className="btn-primary" disabled={busy}>Save</button><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button></div>{canVerify && editId && <p className="text-xs text-amber-700 sm:col-span-2">Editing resets verification. Re-verify after checking the source.</p>}</form>}
      {!data.items.length ? <Empty title="No records" hint="Add records from official public sources." /> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><tbody>{data.items.map((it) => <tr key={it._id} className="border-b"><td className="p-2">{columns(it)}</td><td className="space-x-2 whitespace-nowrap text-right">
        {canVerify && <button className={it.verificationStatus === 'verified' ? 'btn-outline' : 'btn-primary'} onClick={() => verify(it)}>{it.verificationStatus === 'verified' ? 'Re-verify' : 'Verify'}</button>}{extra?.(it, act)}
        <button className="btn-outline" onClick={() => open(it)}>Edit</button><button className="btn-danger" onClick={() => window.confirm('Delete this record?') && act(() => api.delete(`${base}/${it._id}`), 'Deleted')}>Delete</button></td></tr>)}</tbody></table></div>}
    </div>
  );
}
function Duplicates() {
  const [groups, setGroups] = useState(null); const { toast } = useToast();
  const check = async () => { try { setGroups((await api.get('/companies/duplicates')).data.groups); } catch (e) { toast(errMsg(e), 'error'); } };
  return <div className="mb-4"><button className="btn-outline" onClick={check}>Check for duplicate companies</button>
    {groups && (groups.length ? <ul className="card mt-2 space-y-2 text-sm">{groups.map((g) => <li key={g.key}><b>{g.key.startsWith('host:') ? 'Same website' : 'Similar name'}:</b> {g.items.map((i) => `${i.name} (${i.country})`).join(' / ')}</li>)}</ul> : <p className="mt-2 text-sm text-stone-500">No duplicates found.</p>)}</div>;
}
function AdminEnquiries() {
  const { data, loading, error, reload } = useApi('/enquiries/admin/all'); const { toast } = useToast();
  const set = async (e, status) => { const note = window.prompt('Note (e.g. how it was delivered)') ?? ''; try { await api.patch(`/enquiries/admin/${e._id}/status`, { status, note }); toast('Status updated'); reload(); } catch (er) { toast(errMsg(er), 'error'); } };
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  return !data.items.length ? <Empty title="No enquiries" /> : <div className="space-y-3">{data.items.map((e) => <div key={e._id} className="card text-sm"><div className="flex flex-wrap justify-between gap-2"><p><b>{e.cropName}</b> {e.quantity} {e.unit} → {e.company?.name} ({e.company?.country})</p><Badge>{e.status}</Badge></div>
    <p className="text-xs text-stone-500">Farmer: {e.farmer?.name} · {e.farmer?.email}{e.farmer?.phone ? ` · ${e.farmer.phone}` : ''} · prefers {e.contactPreference} · {fmtDate(e.createdAt)}</p>
    {e.status !== 'draft' && <div className="mt-2 flex flex-wrap gap-2">{['delivery_attempted', 'delivered', 'failed'].map((st) => <button key={st} className="btn-outline" onClick={() => set(e, st)}>Mark {st.replace('_', ' ')}</button>)}</div>}</div>)}</div>;
}
function Users() {
  const { data, loading, error, reload } = useApi('/admin/users'); const { toast } = useToast();
  const toggle = async (u) => { try { await api.patch(`/admin/users/${u._id}`, { active: !u.active }); toast('Updated'); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b text-stone-500"><tr><th className="p-2">Name</th><th>Email</th><th>Role</th><th>Country</th><th>Status</th><th></th></tr></thead><tbody>{data.items.map((u) => <tr key={u._id} className="border-b"><td className="p-2">{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.country}</td><td>{u.active ? 'Active' : 'Disabled'}</td><td>{u.role !== 'admin' && <button className={u.active ? 'btn-danger' : 'btn-primary'} onClick={() => toggle(u)}>{u.active ? 'Disable' : 'Enable'}</button>}</td></tr>)}</tbody></table></div>;
}
function AllCrops() {
  const { data, loading, error, reload } = useApi('/admin/crops'); const { toast } = useToast();
  const del = async (c) => { if (!window.confirm(`Delete "${c.name}"?`)) return; try { await api.delete(`/crops/${c._id}`); toast('Deleted'); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  return !data.items.length ? <Empty title="No crops" /> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><tbody>{data.items.map((c) => <tr key={c._id} className="border-b"><td className="p-2">{c.name} <span className="text-xs text-stone-500">by {c.farmer?.name}</span></td><td>{c.quantity} {c.unit}</td><td>₹{c.priceInr}</td><td>{c.status}</td><td><button className="btn-danger" onClick={() => del(c)}>Delete</button></td></tr>)}</tbody></table></div>;
}
function AllOrders() {
  const { data, loading, error, reload } = useApi('/admin/orders'); if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  return !data.items.length ? <Empty title="No orders" /> : <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><tbody>{data.items.map((o) => <tr key={o._id} className="border-b"><td className="p-2">{o.cropName} × {o.quantity} {o.unit}</td><td>₹{o.totalInr}</td><td><Badge>{o.status}</Badge></td><td className="text-xs text-stone-500">{fmtDate(o.createdAt)}</td></tr>)}</tbody></table></div>;
}
function Overview() {
  const { data, loading, error, reload } = useApi('/admin/stats'); if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const L = { farmers: 'Farmers', buyers: 'Buyers', crops: 'Crop listings', orders: 'Orders', companies: 'Companies', verifiedCompanies: 'Verified companies' };
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{Object.entries(L).map(([k, l]) => <div key={k} className="card text-center"><p className="text-3xl font-bold text-leaf-700">{data[k]}</p><p className="text-xs text-stone-500">{l}</p></div>)}</div>;
}
export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');
  return (
    <div><PageHeader title="Admin dashboard" />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'btn-primary' : 'btn-outline'} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'Overview' && <Overview />}{tab === 'Users' && <Users />}{tab === 'Crops' && <AllCrops />}{tab === 'Orders' && <AllOrders />}
      {tab === 'Companies' && <><Duplicates /><Resource key="co" base="/companies" listUrl="/companies" fields={COMPANY_FIELDS} canVerify evidence
        extra={(c, act) => c.verificationStatus !== 'rejected' && <button className="btn-outline" onClick={() => { const r = window.prompt('Reason for rejecting (min 5 characters)'); if (r) act(() => api.post(`/companies/${c._id}/reject`, { reason: r }), 'Rejected'); }}>Reject</button>}
        columns={(c) => <div><b>{c.name}</b> <Badge>{c.verificationStatus}</Badge><div className="text-xs text-stone-500">{c.type} · {c.buyerType} · {c.country}{c.lastVerifiedAt ? ` · verified ${fmtDate(c.lastVerifiedAt)}` : ''}</div>{c.verificationEvidence && <div className="text-xs text-stone-500">Evidence: {c.verificationEvidence}</div>}{c.rejectionReason && <div className="text-xs text-red-600">Rejected: {c.rejectionReason}</div>}</div>} /></>}
      {tab === 'Buying requests' && <Resource key="br" base="/buying-requests" listUrl="/buying-requests/all" fields={REQUEST_FIELDS} canVerify evidence
        extra={(r, act) => r.status === 'open' && <>{r.verificationStatus === 'verified' && <button className="btn-outline" onClick={() => act(() => api.post(`/buying-requests/${r._id}/recheck`), 'Marked re-checked')}>Re-checked today</button>}<button className="btn-outline" onClick={() => act(() => api.post(`/buying-requests/${r._id}/close`), 'Closed')}>Close</button></>}
        columns={(r) => <div><b className="capitalize">{r.crop}</b> <Badge>{r.state}</Badge><div className="text-xs text-stone-500">{r.company?.name} ({r.company?.country}) · requested {fmtDate(r.requestDate)}{r.expiresAt ? ` · expires ${fmtDate(r.expiresAt)}` : ''}{r.lastCheckedAt ? ` · checked ${fmtDate(r.lastCheckedAt)}` : ''}</div></div>} />}
      {tab === 'Enquiries' && <AdminEnquiries />}
      {tab === 'Collection centers' && <Resource key="ce" base="/collection-centers" listUrl="/collection-centers/all" fields={CENTER_FIELDS} canVerify columns={(c) => <div><b>{c.name}</b> <Badge>{c.verificationStatus}</Badge><div className="text-xs text-stone-500">{c.city}, {c.state} ({c.latitude}, {c.longitude})</div></div>} />}
      {tab === 'Export guides' && <Resource key="eg" base="/export-guides" listUrl="/export-guides" fields={GUIDE_FIELDS} columns={(g) => <div><b>{g.title}</b><div className="text-xs text-stone-500">{g.topic} · {g.sourceName}</div></div>} />}
    </div>
  );
}
