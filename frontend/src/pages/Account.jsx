import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Field } from '../components/ui.jsx';
import { COUNTRIES, CURRENCIES, COUNTRY_CURRENCY, fmtDate } from '../utils/format.js';

export function Notifications() {
  const { data, loading, error, reload } = useApi('/notifications'); const { toast } = useToast();
  const read = async (n) => { if (n.read) return; try { await api.patch(`/notifications/${n._id}/read`); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  const readAll = async () => { try { await api.post('/notifications/read-all'); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title="Notifications" subtitle="In-app only. No SMS or email is sent.">{data?.unread > 0 && <button className="btn-outline" onClick={readAll}>Mark all read</button>}</PageHeader>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Empty title="No notifications" /> : <ul className="space-y-2">{data.items.map((n) => <li key={n._id} className={`card flex items-start justify-between gap-3 ${n.read ? 'opacity-70' : 'border-leaf-500'}`}><div><p className="text-sm">{!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-leaf-600" aria-label="Unread" />}{n.message}</p><p className="text-xs text-stone-500">{fmtDate(n.createdAt)}</p></div><div className="flex gap-2">{n.link?.startsWith('/') && <Link className="text-xs text-leaf-700 underline" to={n.link} onClick={() => read(n)}>Open</Link>}{!n.read && <button className="text-xs underline" onClick={() => read(n)}>Mark read</button>}</div></li>)}</ul>}
    </div>
  );
}
export function Profile() {
  const { user, updateUser } = useAuth(); const { toast } = useToast();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', state: user.state || '', city: user.city || '', organization: user.organization || '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); if (f.name.trim().length < 2) return setErr('Name is required'); setErr(''); setBusy(true);
    try { const { data } = await api.patch('/auth/me', { ...f, name: f.name.trim() }); updateUser(data.user); toast('Profile saved'); } catch (e2) { toast(errMsg(e2), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-lg"><PageHeader title="Profile" subtitle={`${user.email} · ${user.role}`} />
      <form onSubmit={save} noValidate className="card"><Field label="Name" id="name" error={err}><input id="name" className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Phone" id="phone"><input id="phone" className="input" value={f.phone} onChange={set('phone')} /></Field><div className="grid gap-x-3 sm:grid-cols-2"><Field label="State" id="state"><input id="state" className="input" value={f.state} onChange={set('state')} /></Field><Field label="City" id="city"><input id="city" className="input" value={f.city} onChange={set('city')} /></Field></div>
        <Field label="Organization" id="org"><input id="org" className="input" value={f.organization} onChange={set('organization')} /></Field><button className="btn-primary" disabled={busy}>Save profile</button></form>
    </div>
  );
}
export function Settings() {
  const { user, updateUser } = useAuth(); const { setCurrency, currency, rateNote, info } = useCurrency(); const { toast } = useToast();
  const [country, setCountry] = useState(user.country); const [cur, setCur] = useState(user.currency || currency);
  const save = async (e) => {
    e.preventDefault();
    try { const { data } = await api.patch('/auth/me', { country, currency: cur }); updateUser(data.user); setCurrency(cur); toast('Settings saved'); } catch (e2) { toast(errMsg(e2), 'error'); }
  };
  return (
    <div className="mx-auto max-w-lg"><PageHeader title="Settings" />
      <form onSubmit={save} className="card"><Field label="Country" id="country"><select id="country" className="input" value={country} onChange={(e) => { setCountry(e.target.value); setCur(COUNTRY_CURRENCY[e.target.value] || cur); }}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Display currency" id="currency" hint="Prices are stored in INR and converted for display only."><select id="currency" className="input" value={cur} onChange={(e) => setCur(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <p className="mb-3 text-xs text-stone-500">{info.available ? `Latest rates fetched ${fmtDate(info.fetchedAt)} (${info.source}).` : 'Exchange rates are currently unavailable; INR prices will be shown.'}{cur !== 'INR' && rateNote ? '' : ''}</p><button className="btn-primary">Save settings</button></form>
    </div>
  );
}
