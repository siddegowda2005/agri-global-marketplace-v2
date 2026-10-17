import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner, ErrorBox, PageHeader } from '../components/ui.jsx';
import AdminDashboard from './Admin.jsx';
const Stat = ({ label, value }) => <div className="card text-center"><p className="text-3xl font-bold text-leaf-700">{value}</p><p className="text-xs text-stone-500">{label}</p></div>;
const Tile = ({ to, children }) => <Link to={to} className="card font-medium hover:shadow-md">{children}</Link>;
function FarmerDash() {
  const crops = useApi('/crops/mine'); const orders = useApi('/orders');
  if (crops.loading || orders.loading) return <Spinner />; if (crops.error || orders.error) return <ErrorBox message={crops.error || orders.error} />;
  const pending = orders.data.items.filter((o) => o.status === 'Pending').length;
  return (<div><div className="grid gap-4 sm:grid-cols-3"><Stat label="My listings" value={crops.data.items.length} /><Stat label="Pending orders" value={pending} /><Stat label="Total orders" value={orders.data.items.length} /></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Tile to="/farmer/crops/new">➕ Add a crop</Tile><Tile to="/farmer/crops">🌾 Manage my crops</Tile><Tile to="/orders">📦 Incoming orders</Tile><Tile to="/ai/price">📈 Price prediction</Tile><Tile to="/ai/recommend">🌱 Crop recommendation</Tile><Tile to="/buyer-finder">🌍 Find international buyers</Tile><Tile to="/exporters">🏭 Indian exporters</Tile><Tile to="/export-guidance">📘 Export guidance</Tile><Tile to="/collection-centers">📍 Collection centers</Tile></div></div>);
}
function BuyerDash() {
  const orders = useApi('/orders'); const cart = useApi('/cart');
  if (orders.loading || cart.loading) return <Spinner />; if (orders.error || cart.error) return <ErrorBox message={orders.error || cart.error} />;
  return (<div><div className="grid gap-4 sm:grid-cols-3"><Stat label="Cart items" value={cart.data.items.length} /><Stat label="Active orders" value={orders.data.items.filter((o) => !['Completed', 'Cancelled', 'Rejected'].includes(o.status)).length} /><Stat label="All orders" value={orders.data.items.length} /></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><Tile to="/marketplace">🛒 Browse marketplace</Tile><Tile to="/cart">🧺 My cart</Tile><Tile to="/orders">📦 Order history</Tile></div></div>);
}
export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'admin') return <AdminDashboard />;
  return <div><PageHeader title={`${user.role === 'farmer' ? 'Farmer' : 'Buyer'} dashboard`} subtitle={`Welcome, ${user.name}`} />{user.role === 'farmer' ? <FarmerDash /> : <BuyerDash />}</div>;
}
