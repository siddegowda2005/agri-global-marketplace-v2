import { useState } from 'react';
import api, { errMsg } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../components/Toast.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Badge, Field } from '../components/ui.jsx';
import { fmtDate } from '../utils/format.js';

const TABS = ['Overview', 'Users', 'Crops', 'Orders', 'Companies', 'Collection centers', 'Export guides'];
const COMPANY_FIELDS = [
  { name: 'type', label: 'Type', type: 'select', options: ['international_importer', 'indian_exporter'], required: true }, { name: 'name', label: 'Company name', required: true },
  { name: 'country', label: 'Country', required: true }, { name: 'state', label: 'State' }, { name: 'city', label: 'City' }, { name: 'productsHandled', label: 'Products handled (comma separated)', type: 'list' },
  { name: 'businessCategory', label: 'Business category' }, { name: 'website', label: 'Official website (https://...)' }, { name: 'contactPage', label: 'Contact page URL' },
  { name: 'email', label: 'Public business email' }, { name: 'phone', label: 'Public business phone' }, { name: 'address', label: 'Public address' }, { name: 'sourceUrl', label: 'Source URL (where this was found)', required: true }];
const CENTER_FIELDS = [{ name: 'name', label: 'Name', required: true }, { name: 'kind', label: 'Kind', type: 'select', options: ['collection_center', 'export_facility', 'cold_storage'] }, { name: 'address', label: 'Address' }, { name: 'state', label: 'State' }, { name: 'city', label: 'City' },
  { name: 'latitude', label: 'Latitude', type: 'number', required: true }, { name: 'longitude', label: 'Longitude', type: 'number', required: true }, { name: 'sourceUrl', label: 'Source URL', required: true }];
const GUIDE_FIELDS = [{ name: 'topic', label: 'Topic', required: true }, { name: 'title', label: 'Title', required: true }, { name: 'content', label: 'Content', type: 'textarea', required: true }, { name: 'sourceName', label: 'Source name', required: true }, { name: 'sourceUrl', label: 'Source URL', required: true }, { name: 'order', label: 'Display order', type: 'number' }];

function Resource({ base, listUrl, fields, columns, canVerify }) {
  const { data, loading, error, reload } = useApi(listUrl); const { toast } = useToast();
  const [form, setForm] = useState(null); const [editId, setEditId] = useState(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState({});
  const open = (item) => { setEditId(item?._id || null); setForm(Object.fromEntries(fields.map((f) => [f.name, f.type === 'list' ? (item?.[f.name] || []).join(', ') : item?.[f.name] ?? (f.type === 'select' ? f.options[0] : '')]))); setErrs({}); };
  const save = async (e) => {
    e.preventDefault(); const v = {}; fields.forEach((f) => { if (f.required && String(form[f.name]).trim() === '') v[f.name] = 'Required'; }); setErrs(v); if (Object.keys(v).length) return;
    const body = {}; fields.forEach((f) => { const val = form[f.name]; if (val === '' && !f.required) return; body[f.name] = f.type === 'list' ? val.split(',').map((s) => s.trim()).filter(Boolean) : f.type === 'number' ? Number(val) : typeof val === 'string' ? val.trim() : val; });
    setBusy(true);
    try { if (editId) await api.put(`${base}/${editId}`, body); else await api.post(base, body); toast('Saved'); setForm(null); reload(); } catch (e2) { toast(errMsg(e2), 'error'); } finally { setBusy(false); }
  };
  const act = async (fn, msg) => { try { await fn(); toast(msg); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div><button className="btn-primary mb-3" onClick={() => open(null)}>+ Add new</button>
      {form && <form onSubmit={save} noValidate className="card mb-4 grid gap-x-3 sm:grid-cols-2">{fields.map((f) => <Field key={f.name} label={f.label} id={`f-${f.name}`} error={errs[f.name]}>{f.type === 'select' ? <select id={`f-${f.name}`} className="input" value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>{f.options.map((o) => <option key={o}>{o}</option>)}</select> : f.type === 'textarea' ? <textarea id={`f-${f.name}`} rows="4" className="input" value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} /> : <input id={`f-${f.name}`} type={f.type === 'number' ? 'number' : 'text'} step="any" className="input" value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />}</Field>)}
        <div className="flex gap-2 sm:col-span-2"><button className="btn-primary" disabled={busy}>Save</button><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button></div>{canVerify && editId && <p className="text-xs text-amber-700 sm:col-span-2">Editing a company resets it to unverified. Re-verify after checking its source.</p>}</form>}
      {!data.items.length ? <Empty title="No records" hint="Add records from official public sources." /> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><tbody>{data.items.map((it) => <tr key={it._id} className="border-b"><td className="p-2">{columns(it)}</td><td className="space-x-2 whitespace-nowrap text-right">{canVerify && it.verificationStatus !== 'verified' && <button className="btn-primary" onClick={() => act(() => api.post(`${base}/${it._id}/verify`), 'Verified')}>Verify</button>}<button className="btn-outline" onClick={() => open(it)}>Edit</button><button className="btn-danger" onClick={() => window.confirm('Delete this record?') && act(() => api.delete(`${base}/${it._id}`), 'Deleted')}>Delete</button></td></tr>)}</tbody></table></div>}
    </div>
  );
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
      {tab === 'Companies' && <Resource key="co" base="/companies" listUrl="/companies" fields={COMPANY_FIELDS} canVerify columns={(c) => <div><b>{c.name}</b> <Badge>{c.verificationStatus}</Badge><div className="text-xs text-stone-500">{c.type} · {c.country}{c.lastVerifiedAt ? ` · verified ${fmtDate(c.lastVerifiedAt)}` : ''}</div></div>} />}
      {tab === 'Collection centers' && <Resource key="ce" base="/collection-centers" listUrl="/collection-centers/all" fields={CENTER_FIELDS} canVerify columns={(c) => <div><b>{c.name}</b> <Badge>{c.verificationStatus}</Badge><div className="text-xs text-stone-500">{c.city}, {c.state} ({c.latitude}, {c.longitude})</div></div>} />}
      {tab === 'Export guides' && <Resource key="eg" base="/export-guides" listUrl="/export-guides" fields={GUIDE_FIELDS} columns={(g) => <div><b>{g.title}</b><div className="text-xs text-stone-500">{g.topic} · {g.sourceName}</div></div>} />}
    </div>
  );
}
