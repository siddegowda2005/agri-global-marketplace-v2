import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/ui.jsx';
const FEATURES = [
  ['🛒', 'Direct marketplace', 'Farmers list crops with photos, quantity and location. Buyers browse and order directly.'],
  ['💱', 'Multi-currency prices', 'Prices are stored in INR and shown in INR, USD, AED, EUR, GBP, SAR or SGD using live exchange rates.'],
  ['🤖', 'Machine-learning insights', 'Random Forest models for price estimation and crop recommendation, trained on real datasets.'],
  ['🌍', 'Company directory', 'Admin-verified importers and Indian exporters with publicly sourced contact details.'],
  ['📦', 'Export guidance', 'Educational pointers to official sources such as APEDA and DGFT.'],
  ['📍', 'Collection centers', 'Verified collection and export facilities on an OpenStreetMap map.'],
];
const STEPS = [['1', 'List your crop', 'Add quantity, price, location and photos in minutes.'], ['2', 'Check the market', 'Use price and crop-recommendation models trained on real data.'], ['3', 'Reach buyers', 'Search verified international importers and verified buying requests.'], ['4', 'Sell and track', 'Receive orders, accept them and update their status.']];
export function Home() {
  const { user } = useAuth();
  return (
    <div>
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-leaf-900 via-leaf-700 to-leaf-500 px-6 py-16 text-white sm:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 text-[12rem] opacity-10">🌾</div>
        <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">AI-POWERED · FARMER-FIRST · GLOBAL</p>
        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">Sell your harvest to the world, without middlemen</h1>
        <p className="mt-4 max-w-2xl text-leaf-50">AgriGlobal connects Indian farmers with national and international buyers, estimates market prices with machine learning, and points you to genuine, source-verified importers.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/marketplace" className="btn bg-white text-leaf-700 hover:bg-leaf-50">Browse crops</Link>
          {user?.role === 'farmer' ? <Link to="/global-buyers" className="btn border border-white text-white hover:bg-white/10">Find global buyers</Link> : !user && <Link to="/register" className="btn border border-white text-white hover:bg-white/10">Create free account</Link>}
        </div>
      </section>
      <section className="mt-10" aria-label="How it works"><h2 className="mb-4 text-xl font-bold text-leaf-900">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{STEPS.map(([n, t, d]) => <li key={n} className="card"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-600 font-bold text-white">{n}</span><h3 className="mt-2 font-semibold">{t}</h3><p className="mt-1 text-sm text-stone-600">{d}</p></li>)}</ol></section>
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([i, t, d]) => <div key={t} className="card transition hover:-translate-y-0.5 hover:shadow-md"><div className="text-3xl">{i}</div><h3 className="mt-2 font-semibold">{t}</h3><p className="mt-1 text-sm text-stone-600">{d}</p></div>)}
      </section>
      <p className="mt-8 text-center text-xs text-stone-500">Orders are enquiries and confirmations only. Payment and export arrangements happen outside this platform. Company listings are not guarantees of purchase.</p>
    </div>
  );
}
export function About() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="About AgriGlobal" />
      <div className="card space-y-3 text-sm leading-6 text-stone-700">
        <p>Farmers often receive low prices because of intermediaries and limited access to markets. AgriGlobal is a final-year B.E. Artificial Intelligence and Data Science project (Maharaja Institute of Technology Thandavapura, VTU) that explores a direct farmer-to-buyer marketplace with machine-learning support.</p>
        <h2 className="font-semibold text-leaf-900">What it does</h2>
        <ul className="list-disc pl-5"><li>Crop listings with images, quantity, price and location</li><li>Cart and order workflow with stock validation</li><li>Price estimation and crop recommendation using trained Random Forest models</li><li>Directory of verified importers and Indian exporters</li><li>Educational export guidance and collection-center map</li></ul>
        <h2 className="font-semibold text-leaf-900">Limits</h2>
        <p>This is an academic demonstration. It does not process payments or arrange shipping. Model outputs are estimates from historical data, not live market prices. A listed company is not a confirmed buyer.</p>
      </div>
    </div>
  );
}
export function Contact() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Contact" subtitle="Project team and institution" />
      <div className="card text-sm leading-6">
        <p className="font-semibold">Department of Artificial Intelligence and Data Science</p>
        <p>Maharaja Institute of Technology Thandavapura</p>
        <p>NH 766, Nanjangud Taluk, Mysuru - 571 302, Karnataka, India</p>
        <p className="mt-2 text-stone-500">Affiliated to Visvesvaraya Technological University, Belagavi. Project guide: Dr Swarnalatha K, Head of Department.</p>
      </div>
    </div>
  );
}
