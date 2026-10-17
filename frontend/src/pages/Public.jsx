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
export function Home() {
  const { user } = useAuth();
  return (
    <div>
      <section className="rounded-2xl bg-gradient-to-br from-leaf-700 to-leaf-500 px-6 py-14 text-center text-white sm:px-12">
        <h1 className="text-3xl font-extrabold sm:text-5xl">Sell your harvest to the world</h1>
        <p className="mx-auto mt-4 max-w-2xl text-leaf-50">An AI-assisted marketplace connecting Indian farmers with national and international buyers, without middlemen.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/marketplace" className="btn bg-white text-leaf-700 hover:bg-leaf-50">Browse crops</Link>
          {!user && <Link to="/register" className="btn border border-white text-white hover:bg-white/10">Create account</Link>}
        </div>
      </section>
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([i, t, d]) => <div key={t} className="card"><div className="text-3xl">{i}</div><h3 className="mt-2 font-semibold">{t}</h3><p className="mt-1 text-sm text-stone-600">{d}</p></div>)}
      </section>
      <p className="mt-8 text-center text-xs text-stone-500">Orders are enquiries and confirmations only. Payment and export arrangements happen outside this platform.</p>
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
