import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Home, About, Contact } from './pages/Public.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboards.jsx';
import { Marketplace, CropDetails, CropForm, MyCrops } from './pages/Market.jsx';
import { Cart, OrderConfirmation, OrderList, OrderDetails } from './pages/Orders.jsx';
import { PricePrediction, CropRecommendation } from './pages/AI.jsx';
import { CompanyDirectory, CompanyDetails, BuyerFinder, Enquiry } from './pages/Companies.jsx';
import { ExportGuidance, CollectionCenters } from './pages/Reference.jsx';
import { Notifications, Profile, Settings } from './pages/Account.jsx';
const P = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;
const ANY = ['farmer', 'buyer', 'admin'];
export default function App() {
  return (
    <Routes><Route element={<Layout />}>
      <Route path="/" element={<Home />} /><Route path="/about" element={<About />} /><Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
      <Route path="/marketplace" element={<Marketplace />} /><Route path="/crops/:id" element={<CropDetails />} />
      <Route path="/dashboard" element={P(ANY, <Dashboard />)} />
      <Route path="/farmer/crops" element={P(['farmer'], <MyCrops />)} /><Route path="/farmer/crops/new" element={P(['farmer'], <CropForm />)} /><Route path="/farmer/crops/:id/edit" element={P(['farmer'], <CropForm />)} />
      <Route path="/cart" element={P(['buyer'], <Cart />)} /><Route path="/order-confirmation" element={P(['buyer'], <OrderConfirmation />)} />
      <Route path="/orders" element={P(ANY, <OrderList />)} /><Route path="/orders/:id" element={P(ANY, <OrderDetails />)} />
      <Route path="/ai/price" element={P(['farmer'], <PricePrediction />)} /><Route path="/ai/recommend" element={P(['farmer'], <CropRecommendation />)} />
      <Route path="/buyer-finder" element={P(['farmer'], <BuyerFinder />)} />
      <Route path="/exporters" element={P(ANY, <CompanyDirectory key="ex" type="indian_exporter" />)} /><Route path="/importers" element={P(ANY, <CompanyDirectory key="im" type="international_importer" />)} />
      <Route path="/companies/:id" element={P(ANY, <CompanyDetails />)} /><Route path="/enquiry/:companyId" element={P(['farmer'], <Enquiry />)} />
      <Route path="/export-guidance" element={<ExportGuidance />} /><Route path="/collection-centers" element={<CollectionCenters />} />
      <Route path="/notifications" element={P(ANY, <Notifications />)} /><Route path="/profile" element={P(ANY, <Profile />)} /><Route path="/settings" element={P(ANY, <Settings />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route></Routes>
  );
}
