import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Field, PageHeader } from '../components/ui.jsx';
import { errMsg } from '../services/api.js';
import { validateLogin, validateRegister } from '../utils/validate.js';
import { COUNTRIES, COUNTRY_CURRENCY } from '../utils/format.js';

export function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const loc = useLocation(); const { toast } = useToast();
  const [f, setF] = useState({ email: '', password: '' }); const [errs, setErrs] = useState({}); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); const v = validateLogin(f); setErrs(v); if (Object.keys(v).length) return;
    setBusy(true);
    try { await login(f.email.trim(), f.password); nav(loc.state?.from || '/dashboard', { replace: true }); }
    catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-md"><PageHeader title="Login" />
      <form onSubmit={submit} noValidate className="card">
        <Field label="Email" id="email" error={errs.email}><input id="email" type="email" autoComplete="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password" id="password" error={errs.password}><input id="password" type="password" autoComplete="current-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in...' : 'Login'}</button>
        <p className="mt-3 text-center text-sm text-stone-500">New here? <Link className="text-leaf-700 underline" to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
export function Register() {
  const { register } = useAuth(); const nav = useNavigate(); const { toast } = useToast();
  const [f, setF] = useState({ role: 'buyer', name: '', email: '', password: '', country: 'India', phone: '', state: '', city: '', organization: '' });
  const [errs, setErrs] = useState({}); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); const v = validateRegister(f); setErrs(v); if (Object.keys(v).length) return;
    setBusy(true);
    const payload = Object.fromEntries(Object.entries({ ...f, name: f.name.trim(), email: f.email.trim(), currency: COUNTRY_CURRENCY[f.country] }).filter(([, v2]) => v2 !== ''));
    try { await register(payload); toast('Account created'); nav('/dashboard', { replace: true }); }
    catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-lg"><PageHeader title="Create account" />
      <form onSubmit={submit} noValidate className="card">
        <fieldset className="mb-3"><legend className="mb-1 text-sm font-medium">I am a</legend>
          <div className="flex gap-4">{['farmer', 'buyer'].map((r) => <label key={r} className="flex items-center gap-2 text-sm capitalize"><input type="radio" name="role" value={r} checked={f.role === r} onChange={set('role')} />{r}</label>)}</div></fieldset>
        <Field label="Full name" id="name" error={errs.name}><input id="name" className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Email" id="email" error={errs.email}><input id="email" type="email" className="input" value={f.email} onChange={set('email')} /></Field>
        <Field label="Password" id="password" error={errs.password} hint="At least 8 characters, with a letter and a digit"><input id="password" type="password" autoComplete="new-password" className="input" value={f.password} onChange={set('password')} /></Field>
        <Field label="Country" id="country"><select id="country" className="input" value={f.country} onChange={set('country')}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="State (optional)" id="state"><input id="state" className="input" value={f.state} onChange={set('state')} /></Field>
          <Field label="City (optional)" id="city"><input id="city" className="input" value={f.city} onChange={set('city')} /></Field>
        </div>
        <Field label="Phone (optional)" id="phone"><input id="phone" className="input" value={f.phone} onChange={set('phone')} /></Field>
        {f.role === 'buyer' && <Field label="Organization (optional)" id="org"><input id="org" className="input" value={f.organization} onChange={set('organization')} /></Field>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating...' : 'Register'}</button>
        <p className="mt-3 text-center text-sm text-stone-500">Already registered? <Link className="text-leaf-700 underline" to="/login">Login</Link></p>
      </form>
    </div>
  );
}
