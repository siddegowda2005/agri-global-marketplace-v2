import { useState } from 'react';
import api, { errMsg } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { Field, PageHeader, ErrorBox, Notice } from '../components/ui.jsx';

function ModelStatus({ name, label }) {
  const { data, loading } = useApi('/ai/status');
  if (loading || !data) return null;
  const m = data.models?.[name];
  if (!data.reachable) return <div className="mb-3"><ErrorBox message="The AI service cannot be reached. Start it (npm run dev:ai) and check AI_SERVICE_URL in backend/.env." /></div>;
  if (!m?.loaded) return <div className="mb-3"><Notice>The {label} model is not trained yet. An administrator must train it with a real dataset (see ai-service/datasets/README.md) and restart the AI service.</Notice></div>;
  return <p className="mb-3 text-xs text-green-700">{label} model loaded ({m.version})</p>;
}

export function PricePrediction() {
  const [f, setF] = useState({ crop: '', state: '', market: '', date: '' }); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [fe, setFe] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setRes(null);
    if (f.crop.trim().length < 2) return setFe({ crop: 'Enter a crop name' }); setFe({});
    setBusy(true);
    try { const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim() !== '')); setRes((await api.post('/ai/price-prediction', body)).data); }
    catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title="AI price prediction" subtitle="Random Forest regression trained on historical mandi prices" /><ModelStatus name="price_model" label="price" />
      <form onSubmit={submit} noValidate className="card">
        <Field label="Crop (as named in the dataset, e.g. Tomato)" id="crop" error={fe.crop}><input id="crop" className="input" value={f.crop} onChange={set('crop')} /></Field>
        <div className="grid gap-x-3 sm:grid-cols-2"><Field label="State (optional)" id="state"><input id="state" className="input" value={f.state} onChange={set('state')} /></Field><Field label="Market (optional)" id="market"><input id="market" className="input" value={f.market} onChange={set('market')} /></Field></div>
        <Field label="Date (optional, default today)" id="date"><input id="date" type="date" className="input" value={f.date} onChange={set('date')} /></Field>
        <button className="btn-primary" disabled={busy}>{busy ? 'Predicting...' : 'Predict price'}</button>
      </form>
      {err && <div className="mt-4"><ErrorBox message={err} /></div>}
      {res && <PriceResult res={res} />}
    </div>
  );
}
function PriceResult({ res }) {
  const { currency, format, rateNote } = useCurrency(); const conv = format(res.predicted_price); const perKg = format(res.predicted_price / 100);
  const quintal = /quintal/i.test(res.price_unit);
  return (
    <div className="card mt-4 space-y-2" aria-live="polite"><p className="text-sm text-stone-500">Estimated modal market price for {res.prediction_date}</p>
      <p className="text-3xl font-bold text-leaf-700" data-testid="prediction">{res.predicted_price.toLocaleString('en-IN')} <span className="text-sm font-normal">{res.price_unit}</span></p>
      {currency !== 'INR' && conv.converted && <p className="text-sm">≈ {conv.text} per quintal{quintal ? ` (${perKg.text} per kg)` : ''} <span className="text-xs text-stone-500">in {currency}</span></p>}
      {currency === 'INR' && quintal && <p className="text-sm">≈ {perKg.text} per kg</p>}
      {currency !== 'INR' && !conv.converted && <p className="text-xs text-stone-500">{rateNote}</p>}
      <p className="text-xs text-stone-500">Model {res.model_version} · hold-out MAE {res.metrics_on_holdout.mae.toFixed(1)}, RMSE {res.metrics_on_holdout.rmse.toFixed(1)}, R² {res.metrics_on_holdout.r2.toFixed(2)}</p>
      <p className="text-xs text-stone-500">Dataset coverage: {res.training_rows?.toLocaleString('en-IN')} records, {res.coverage?.commodities} commodities, {res.coverage?.states} states, {res.coverage?.markets} markets, {res.data_range[0]} to {res.data_range[1]}</p>
      {res.warnings?.map((w) => <Notice key={w}>{w}</Notice>)}
      <details className="text-xs text-stone-600"><summary className="cursor-pointer font-medium">Limitations</summary><ul className="mt-1 list-disc pl-5">{res.limitations?.map((l) => <li key={l}>{l}</li>)}</ul></details>
      <Notice>{res.disclaimer}</Notice></div>
  );
}
const FIELDS = [['N', 'Nitrogen (N)', 0, 300], ['P', 'Phosphorus (P)', 0, 300], ['K', 'Potassium (K)', 0, 300], ['temperature', 'Temperature (°C)', -10, 60], ['humidity', 'Humidity (%)', 0, 100], ['ph', 'Soil pH', 0, 14], ['rainfall', 'Rainfall (mm)', 0, 5000]];
export function CropRecommendation() {
  const [f, setF] = useState(Object.fromEntries(FIELDS.map(([k]) => [k, '']))); const [fe, setFe] = useState({}); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setRes(null); const v = {};
    FIELDS.forEach(([k, , lo, hi]) => { const n = Number(f[k]); if (f[k] === '' || Number.isNaN(n) || n < lo || n > hi) v[k] = `Enter a value between ${lo} and ${hi}`; });
    setFe(v); if (Object.keys(v).length) return; setBusy(true);
    try { setRes((await api.post('/ai/crop-recommendation', Object.fromEntries(FIELDS.map(([k]) => [k, Number(f[k])])))).data); } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-2xl"><PageHeader title="AI crop recommendation" subtitle="Random Forest classifier using soil nutrients and climate" /><ModelStatus name="crop_model" label="crop recommendation" />
      <form onSubmit={submit} noValidate className="card"><div className="grid gap-x-3 sm:grid-cols-2">{FIELDS.map(([k, label]) => <Field key={k} label={label} id={k} error={fe[k]}><input id={k} type="number" step="any" className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}</div>
        <button className="btn-primary" disabled={busy}>{busy ? 'Analysing...' : 'Recommend crops'}</button></form>
      {err && <div className="mt-4"><ErrorBox message={err} /></div>}
      {res && <div className="card mt-4" aria-live="polite"><h2 className="font-semibold">Recommended crops</h2><ol className="mt-2 space-y-1">{res.recommendations.map((r) => <li key={r.crop} className="flex justify-between capitalize"><span>{r.crop}</span><span className="text-stone-500">{(r.probability * 100).toFixed(1)}% model confidence</span></li>)}</ol>
        <p className="mt-3 text-xs text-stone-500">Most influential features overall: {res.factors_considered.most_influential_features.join(', ')}. Model {res.model_version}; hold-out accuracy {(res.metrics_on_holdout.accuracy * 100).toFixed(1)}%.</p><div className="mt-3"><Notice>{res.note}</Notice></div></div>}
    </div>
  );
}
