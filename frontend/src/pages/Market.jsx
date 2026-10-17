import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { useToast } from '../components/Toast.jsx';
import CropCard from '../components/CropCard.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Field, Notice } from '../components/ui.jsx';
import { CATEGORIES } from '../utils/format.js';
import { validateCrop } from '../utils/validate.js';

export function Marketplace() {
  const [filters, setFilters] = useState({ q: '', category: '', state: '', minPrice: '', maxPrice: '' });
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({});
  const params = { ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v !== '')), page, limit: 12 };
  const { data, loading, error, reload } = useApi('/crops', params);
  const { rateNote } = useCurrency();
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const submit = (e) => { e.preventDefault(); setPage(1); setApplied(filters); };
  const reset = () => { const z = { q: '', category: '', state: '', minPrice: '', maxPrice: '' }; setFilters(z); setApplied(z); setPage(1); };
  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Fresh produce listed directly by Indian farmers" />
      <form onSubmit={submit} className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <input aria-label="Search crops" placeholder="Search crops..." className="input lg:col-span-2" value={filters.q} onChange={set('q')} />
        <select aria-label="Category" className="input" value={filters.category} onChange={set('category')}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <input aria-label="State" placeholder="State" className="input" value={filters.state} onChange={set('state')} />
        <input aria-label="Min price (INR)" type="number" min="0" placeholder="Min ₹" className="input" value={filters.minPrice} onChange={set('minPrice')} />
        <input aria-label="Max price (INR)" type="number" min="0" placeholder="Max ₹" className="input" value={filters.maxPrice} onChange={set('maxPrice')} />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6"><button className="btn-primary">Search</button><button type="button" className="btn-outline" onClick={reset}>Reset</button></div>
      </form>
      {rateNote && <p className="mb-3 text-xs text-stone-500">{rateNote}</p>}
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Empty title="No crops found" hint="Try changing your search or filters." /> : (
        <>
          <p className="mb-2 text-sm text-stone-500">{data.total} result{data.total === 1 ? '' : 's'}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.items.map((c) => <CropCard key={c._id} crop={c} />)}</div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button className="btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-sm">Page {data.page} of {Math.max(data.pages, 1)}</span>
            <button className="btn-outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}

export function CropDetails() {
  const { id } = useParams(); const { data, loading, error, reload } = useApi(`/crops/${id}`);
  const { user } = useAuth(); const { format, rateNote } = useCurrency(); const { toast } = useToast(); const nav = useNavigate();
  const [qty, setQty] = useState(1); const [busy, setBusy] = useState(false);
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const c = data.crop; const p = format(c.priceInr);
  const qtyOk = Number(qty) > 0 && Number(qty) <= c.quantity;
  const addToCart = async () => {
    setBusy(true);
    try { await api.put('/cart/items', { cropId: c._id, quantity: Number(qty) }); toast('Added to cart'); nav('/cart'); }
    catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl bg-leaf-50 text-7xl">{c.images?.[0] ? <img src={imgUrl(c.images[0])} alt={c.name} className="h-full w-full object-cover" /> : '🌱'}</div>
        {c.images?.length > 1 && <div className="flex gap-2">{c.images.slice(1).map((i) => <img key={i} src={imgUrl(i)} alt="" className="h-20 w-20 rounded-lg object-cover" />)}</div>}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{c.name}</h1><p className="text-sm text-stone-500">{c.category} · Grade {c.grade}</p>
        <p className="mt-3 text-3xl font-bold text-leaf-700">{p.text}<span className="text-sm font-normal text-stone-500"> / {c.unit}</span></p>
        {p.converted && <p className="text-xs text-stone-500">Original: ₹{c.priceInr} / {c.unit}. {rateNote}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm"><dt className="text-stone-500">Available</dt><dd>{c.quantity} {c.unit}</dd><dt className="text-stone-500">Location</dt><dd>{c.location}{c.state ? `, ${c.state}` : ''}, {c.country}</dd>{c.harvestDate && <><dt className="text-stone-500">Harvest date</dt><dd>{new Date(c.harvestDate).toLocaleDateString()}</dd></>}<dt className="text-stone-500">Farmer</dt><dd>{c.farmer?.name}{c.farmer?.city ? ` (${c.farmer.city})` : ''}</dd></dl>
        {c.description && <p className="mt-4 text-sm text-stone-700">{c.description}</p>}
        <div className="mt-6">
          {!user ? <Link to="/login" state={{ from: `/crops/${c._id}` }} className="btn-primary">Login to order</Link>
            : user.role === 'buyer' ? (<div className="flex flex-wrap items-end gap-3"><Field label={`Quantity (${c.unit})`} id="qty"><input id="qty" type="number" min="0" step="any" className="input w-32" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
              <button className="btn-primary mb-3" disabled={!qtyOk || busy} onClick={addToCart}>Add to cart</button>{!qtyOk && <p role="alert" className="mb-3 text-xs text-red-600">Enter 0 &lt; qty ≤ {c.quantity}</p>}</div>)
              : user.role === 'farmer' && String(c.farmer?._id) === String(user._id) ? <Link to={`/farmer/crops/${c._id}/edit`} className="btn-outline">Edit listing</Link> : <p className="text-sm text-stone-500">Only buyers can order.</p>}
        </div>
      </div>
    </div>
  );
}

const EMPTY = { name: '', category: 'Vegetables', description: '', quantity: '', unit: 'kg', priceInr: '', location: '', state: '', country: 'India', harvestDate: '', grade: 'Ungraded', status: 'available' };
export function CropForm() {
  const { id } = useParams(); const edit = !!id; const nav = useNavigate(); const { toast } = useToast();
  const existing = useApi(edit ? `/crops/${id}` : null);
  const [f, setF] = useState(EMPTY); const [files, setFiles] = useState([]); const [keep, setKeep] = useState([]); const [errs, setErrs] = useState({}); const [busy, setBusy] = useState(false);
  useEffect(() => { const c = existing.data?.crop; if (c) { setF({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, c[k] ?? EMPTY[k]])), harvestDate: c.harvestDate ? c.harvestDate.slice(0, 10) : '' }); setKeep(c.images || []); } }, [existing.data]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickFiles = (e) => {
    const list = [...e.target.files]; const bad = list.find((x) => !['image/jpeg', 'image/png', 'image/webp'].includes(x.type) || x.size > 3 * 1024 * 1024);
    if (bad) { toast('Images must be JPEG, PNG or WebP and under 3 MB', 'error'); e.target.value = ''; return; }
    if (list.length + keep.length > 5) { toast('Maximum 5 images per crop', 'error'); e.target.value = ''; return; }
    setFiles(list);
  };
  const submit = async (e) => {
    e.preventDefault(); const v = validateCrop(f); setErrs(v); if (Object.keys(v).length) return;
    const fd = new FormData();
    Object.entries(f).forEach(([k, val]) => { if (val !== '') fd.append(k, val); });
    if (edit) fd.append('keepImages', keep.join(','));
    files.forEach((x) => fd.append('images', x));
    setBusy(true);
    try { if (edit) await api.put(`/crops/${id}`, fd); else await api.post('/crops', fd); toast(edit ? 'Crop updated' : 'Crop added'); nav('/farmer/crops'); }
    catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  if (edit && existing.loading) return <Spinner />; if (edit && existing.error) return <ErrorBox message={existing.error} />;
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title={edit ? 'Edit crop' : 'Add crop'} />
      <form onSubmit={submit} noValidate className="card">
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Crop name" id="name" error={errs.name}><input id="name" className="input" value={f.name} onChange={set('name')} /></Field>
          <Field label="Category" id="category" error={errs.category}><select id="category" className="input" value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Quantity" id="quantity" error={errs.quantity}><input id="quantity" type="number" min="0" step="any" className="input" value={f.quantity} onChange={set('quantity')} /></Field>
          <Field label="Unit" id="unit"><select id="unit" className="input" value={f.unit} onChange={set('unit')}><option>kg</option><option>quintal</option><option>tonne</option></select></Field>
          <Field label="Price per unit (INR)" id="priceInr" error={errs.priceInr}><input id="priceInr" type="number" min="0" step="any" className="input" value={f.priceInr} onChange={set('priceInr')} /></Field>
          <Field label="Quality grade" id="grade"><select id="grade" className="input" value={f.grade} onChange={set('grade')}>{['A', 'B', 'C', 'Ungraded'].map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="Location (village/city)" id="location" error={errs.location}><input id="location" className="input" value={f.location} onChange={set('location')} /></Field>
          <Field label="State" id="state"><input id="state" className="input" value={f.state} onChange={set('state')} /></Field>
          <Field label="Harvest date" id="harvestDate"><input id="harvestDate" type="date" className="input" value={f.harvestDate} onChange={set('harvestDate')} /></Field>
          <Field label="Availability" id="status"><select id="status" className="input" value={f.status} onChange={set('status')}><option value="available">Available</option><option value="unavailable">Unavailable</option></select></Field>
        </div>
        <Field label="Description" id="description"><textarea id="description" rows="3" className="input" value={f.description} onChange={set('description')} /></Field>
        {edit && keep.length > 0 && <div className="mb-3 flex flex-wrap gap-2">{keep.map((i) => <div key={i} className="relative"><img src={imgUrl(i)} alt="" className="h-16 w-16 rounded object-cover" /><button type="button" aria-label="Remove image" className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white" onClick={() => setKeep(keep.filter((k) => k !== i))}>×</button></div>)}</div>}
        <Field label="Images (JPEG/PNG/WebP, max 3 MB each, up to 5)" id="images"><input id="images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pickFiles} /></Field>
        <div className="flex gap-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save crop'}</button><button type="button" className="btn-outline" onClick={() => nav(-1)}>Cancel</button></div>
      </form>
    </div>
  );
}

export function MyCrops() {
  const { data, loading, error, reload } = useApi('/crops/mine'); const { toast } = useToast(); const { format } = useCurrency();
  const del = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try { await api.delete(`/crops/${c._id}`); toast('Crop deleted'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  return (
    <div><PageHeader title="My crops"><Link to="/farmer/crops/new" className="btn-primary">+ Add crop</Link></PageHeader>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Empty title="No crops yet" hint="Add your first crop listing to start selling." /> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b text-stone-500"><tr><th className="p-2">Crop</th><th>Qty</th><th>Price</th><th>Status</th><th></th></tr></thead>
          <tbody>{data.items.map((c) => <tr key={c._id} className="border-b"><td className="p-2"><Link className="font-medium text-leaf-700" to={`/crops/${c._id}`}>{c.name}</Link><div className="text-xs text-stone-500">{c.location}</div></td><td>{c.quantity} {c.unit}</td><td>{format(c.priceInr).text}</td><td>{c.status}</td>
            <td className="space-x-2 text-right"><Link className="btn-outline" to={`/farmer/crops/${c._id}/edit`}>Edit</Link><button className="btn-danger" onClick={() => del(c)}>Delete</button></td></tr>)}</tbody></table></div>)}
    </div>
  );
}
