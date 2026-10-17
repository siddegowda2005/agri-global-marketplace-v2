import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Badge, Notice } from '../components/ui.jsx';
import { newKey, fmtDate } from '../utils/format.js';
const NOTICE = 'Order enquiry and confirmation only. Actual export and payment arrangements are handled outside this platform.';

export function Cart() {
  const { data, loading, error, reload } = useApi('/cart'); const { format } = useCurrency(); const { toast } = useToast(); const nav = useNavigate();
  const [busy, setBusy] = useState(false); const [key] = useState(newKey); const [note, setNote] = useState('');
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const items = data.items; const subtotal = items.reduce((s, i) => s + i.crop.priceInr * i.quantity, 0);
  const setQty = async (i, q) => { if (!(q > 0)) return; try { await api.put('/cart/items', { cropId: i.crop._id, quantity: q }); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  const remove = async (i) => { try { await api.delete(`/cart/items/${i.crop._id}`); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  const checkout = async () => {
    setBusy(true);
    try { const { data: d } = await api.post('/orders/checkout', { idempotencyKey: key, note: note || undefined }); nav('/order-confirmation', { state: d }); }
    catch (e) { const d = e.response?.data; if (d?.failed?.length) toast(d.failed.map((f) => f.message).join('; '), 'error'); else toast(errMsg(e), 'error'); reload(); }
    finally { setBusy(false); }
  };
  return (
    <div><PageHeader title="Shopping cart" />
      {!items.length ? <Empty title="Your cart is empty"><Link to="/marketplace" className="btn-primary mt-3">Browse marketplace</Link></Empty> : (
        <div className="grid gap-6 lg:grid-cols-3"><div className="space-y-3 lg:col-span-2">
          {items.map((i) => <div key={i.crop._id} className="card flex flex-wrap items-center justify-between gap-3"><div><Link to={`/crops/${i.crop._id}`} className="font-semibold text-leaf-700">{i.crop.name}</Link><p className="text-xs text-stone-500">{format(i.crop.priceInr).text} / {i.crop.unit} · {i.crop.quantity} {i.crop.unit} in stock</p></div>
            <div className="flex items-center gap-2"><button className="btn-outline" aria-label="Decrease" onClick={() => setQty(i, i.quantity - 1)}>−</button><span aria-label="Quantity" className="w-14 text-center">{i.quantity}</span><button className="btn-outline" aria-label="Increase" onClick={() => setQty(i, i.quantity + 1)}>+</button></div>
            <div className="text-right"><p className="font-semibold">{format(i.crop.priceInr * i.quantity).text}</p><button className="text-xs text-red-600 underline" onClick={() => remove(i)}>Remove</button></div></div>)}</div>
          <div className="card h-fit"><h2 className="font-semibold">Summary</h2><p className="mt-2 flex justify-between"><span>Subtotal</span><strong data-testid="subtotal">{format(subtotal).text}</strong></p>
            <textarea aria-label="Note to farmer" placeholder="Note to farmer (optional)" rows="2" className="input mt-3" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            <button className="btn-primary mt-3 w-full" disabled={busy} onClick={checkout}>{busy ? 'Placing...' : 'Place order (no payment)'}</button><div className="mt-3"><Notice>{NOTICE}</Notice></div></div></div>)}
    </div>
  );
}
export function OrderConfirmation() {
  const { state } = useLocation(); const { format } = useCurrency();
  if (!state?.orders) return <Empty title="No recent order"><Link to="/orders" className="btn-outline mt-3">View my orders</Link></Empty>;
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title="Order placed" subtitle="Farmers have been notified and will accept or reject." />
      <div className="space-y-3">{state.orders.map((o) => <div key={o._id} className="card flex justify-between"><div><p className="font-semibold">{o.cropName}</p><p className="text-xs text-stone-500">{o.quantity} {o.unit}</p></div><div className="text-right"><p>{format(o.totalInr).text}</p><Badge>{o.status}</Badge></div></div>)}
        {state.failed?.length > 0 && <ErrorBox message={`Some items could not be ordered: ${state.failed.map((f) => f.message).join('; ')}`} />}
        <Notice>{state.notice || NOTICE}</Notice><Link to="/orders" className="btn-primary">Track my orders</Link></div>
    </div>
  );
}
export function OrderList() {
  const { user } = useAuth(); const [status, setStatus] = useState(''); const { format } = useCurrency();
  const { data, loading, error, reload } = useApi('/orders', status ? { status } : undefined);
  return (
    <div><PageHeader title={user.role === 'farmer' ? 'Incoming orders' : 'My orders'}>
      <select aria-label="Filter by status" className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['Pending', 'Accepted', 'Rejected', 'Confirmed', 'Ready for Collection', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}</select></PageHeader>
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.items.length ? <Empty title="No orders yet" /> : (
        <div className="space-y-3">{data.items.map((o) => <Link key={o._id} to={`/orders/${o._id}`} className="card flex flex-wrap items-center justify-between gap-2 hover:shadow-md"><div><p className="font-semibold">{o.cropName} · {o.quantity} {o.unit}</p><p className="text-xs text-stone-500">{user.role === 'farmer' ? `Buyer: ${o.buyer?.name} (${o.buyer?.country})` : `Farmer: ${o.farmer?.name}`} · {fmtDate(o.createdAt)}</p></div><div className="text-right"><p>{format(o.totalInr).text}</p><Badge>{o.status}</Badge></div></Link>)}</div>)}
    </div>
  );
}
const NEXT = { farmer: { Pending: ['Accepted', 'Rejected'], Accepted: ['Confirmed', 'Cancelled'], Confirmed: ['Ready for Collection', 'Cancelled'], 'Ready for Collection': ['Completed'] }, buyer: { Pending: ['Cancelled'], Accepted: ['Cancelled'] } };
export function OrderDetails() {
  const { id } = useParams(); const { user } = useAuth(); const { data, loading, error, reload } = useApi(`/orders/${id}`); const { format } = useCurrency(); const { toast } = useToast();
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const o = data.order; const actions = NEXT[user.role]?.[o.status] || [];
  const act = async (status) => { try { await api.patch(`/orders/${id}/status`, { status }); toast(`Order ${status.toLowerCase()}`); reload(); } catch (e) { toast(errMsg(e), 'error'); reload(); } };
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title={`Order: ${o.cropName}`}><Badge>{o.status}</Badge></PageHeader>
      <div className="card space-y-1 text-sm"><p>Quantity: {o.quantity} {o.unit}</p><p>Unit price: {format(o.unitPriceInr).text}</p><p className="font-semibold">Total: {format(o.totalInr).text} <span className="font-normal text-stone-500">(₹{o.totalInr} original)</span></p>
        <p>Buyer: {o.buyer?.name} ({o.buyer?.country})</p><p>Farmer: {o.farmer?.name}</p><p>Placed: {fmtDate(o.createdAt)}</p>{o.note && <p>Note: {o.note}</p>}</div>
      {actions.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{actions.map((a) => <button key={a} className={['Rejected', 'Cancelled'].includes(a) ? 'btn-danger' : 'btn-primary'} onClick={() => act(a)}>{['Rejected', 'Cancelled'].includes(a) ? a === 'Rejected' ? 'Reject' : 'Cancel order' : a === 'Accepted' ? 'Accept' : `Mark ${a}`}</button>)}</div>}
      <div className="mt-4"><Notice>{data.notice || NOTICE}</Notice></div>
    </div>
  );
}
