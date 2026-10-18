import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { CURRENCIES } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';
const LINKS = {
  public: [['/', 'Home'], ['/marketplace', 'Marketplace'], ['/about', 'About'], ['/contact', 'Contact']],
  farmer: [['/dashboard', 'Dashboard'], ['/marketplace', 'Marketplace'], ['/farmer/crops', 'My Crops'], ['/orders', 'Orders'], ['/ai/price', 'Price AI'], ['/ai/recommend', 'Crop AI'], ['/global-buyers', 'Global Buyers'], ['/enquiries', 'Enquiries'], ['/buyer-finder', 'Buyer Finder'], ['/exporters', 'Exporters'], ['/importers', 'Importers'], ['/export-guidance', 'Export Guide'], ['/collection-centers', 'Centers']],
  buyer: [['/dashboard', 'Dashboard'], ['/marketplace', 'Marketplace'], ['/cart', 'Cart'], ['/orders', 'Orders']],
  admin: [['/dashboard', 'Admin'], ['/marketplace', 'Marketplace'], ['/global-buyers', 'Global Buyers'], ['/importers', 'Importers'], ['/exporters', 'Exporters']],
};
function Bell() {
  const { data } = useApi('/notifications');
  return <NavLink to="/notifications" className="relative rounded-lg px-2 py-1 text-sm hover:bg-leaf-100" aria-label="Notifications">🔔{data?.unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{data.unread}</span>}</NavLink>;
}
export default function Layout() {
  const { user, logout } = useAuth(); const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false); const nav = useNavigate();
  const links = LINKS[user?.role || 'public'];
  const item = ([to, label]) => <NavLink key={to + label} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-leaf-100 text-leaf-900' : 'text-stone-600 hover:bg-stone-100'}`}>{label}</NavLink>;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-extrabold text-leaf-700">🌾 AgriGlobal</Link>
          <nav className="hidden flex-wrap items-center gap-1 lg:flex" aria-label="Main">{links.map(item)}</nav>
          <div className="flex items-center gap-2">
            <select aria-label="Currency" className="rounded-lg border border-stone-300 px-2 py-1 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            {user ? (<><Bell /><Link to="/profile" className="hidden text-sm font-medium sm:block">{user.name.split(' ')[0]}</Link><button className="btn-outline" onClick={() => { logout(); nav('/'); }}>Logout</button></>)
              : (<><Link to="/login" className="btn-outline">Login</Link><Link to="/register" className="btn-primary hidden sm:inline-flex">Register</Link></>)}
            <button className="btn-outline lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
          </div>
        </div>
        {open && <nav className="border-t border-stone-200 px-4 py-2 lg:hidden" aria-label="Mobile">{links.map(item)}{user && item(['/profile', 'Profile'])}{user && item(['/settings', 'Settings'])}{!user && item(['/register', 'Register'])}</nav>}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6"><Outlet /></main>
      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">AgriGlobal - academic project (MIT Thandavapura). Demonstration platform: no payments or shipping are processed.</footer>
    </div>
  );
}
