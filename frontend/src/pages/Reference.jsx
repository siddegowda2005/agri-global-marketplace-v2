import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import MapView from '../components/MapView.jsx';
import { Spinner, ErrorBox, Empty, PageHeader, Notice } from '../components/ui.jsx';
import { haversineKm, safeUrl } from '../utils/format.js';
export function ExportGuidance() {
  const { data, loading, error, reload } = useApi('/export-guides');
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  const groups = data.items.reduce((m, g) => ((m[g.topic] ||= []).push(g), m), {});
  return (
    <div className="mx-auto max-w-3xl"><PageHeader title="Export guidance" subtitle="Educational overview with links to official sources" />
      <Notice>Actual export requirements vary by crop and destination country. Always confirm current rules with the official source linked on each item.</Notice>
      {!data.items.length ? <div className="mt-4"><Empty title="No guidance published yet" hint="The admin can seed or add sourced entries." /></div> : <div className="mt-4 space-y-6">{Object.entries(groups).map(([topic, list]) => <section key={topic}><h2 className="mb-2 font-semibold text-leaf-900">{topic}</h2><div className="space-y-3">{list.map((g) => <article key={g._id} className="card"><h3 className="font-medium">{g.title}</h3><p className="mt-1 text-sm text-stone-700">{g.content}</p>{safeUrl(g.sourceUrl) && <p className="mt-2 text-xs">Source: <a className="text-leaf-700 underline" href={g.sourceUrl} target="_blank" rel="noopener noreferrer">{g.sourceName}</a></p>}</article>)}</div></section>)}</div>}
    </div>
  );
}
export function CollectionCenters() {
  const { data, loading, error, reload } = useApi('/collection-centers'); const [me, setMe] = useState(null); const [geoErr, setGeoErr] = useState('');
  const locate = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoErr(''); }, () => setGeoErr('Could not get your location. Allow location access and retry.')) : setGeoErr('Geolocation is not supported by this browser.');
  const items = useMemo(() => (data?.items || []).map((c) => ({ ...c, km: me ? haversineKm(me, { lat: c.latitude, lng: c.longitude }) : null })).sort((a, b) => (a.km ?? 0) - (b.km ?? 0)), [data, me]);
  const points = useMemo(() => [...items.map((c) => ({ lat: c.latitude, lng: c.longitude, label: `<b>${c.name.replace(/</g, '&lt;')}</b>` })), ...(me ? [{ lat: me.lat, lng: me.lng, label: 'You are here', color: '#2563eb' }] : [])], [items, me]);
  if (loading) return <Spinner />; if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div><PageHeader title="Collection centers" subtitle="Admin-verified collection and export-related facilities"><button className="btn-outline" onClick={locate}>Use my location</button></PageHeader>
      {geoErr && <p role="alert" className="mb-2 text-sm text-red-600">{geoErr}</p>}
      {!items.length ? <Empty title="No verified collection centers yet" hint="Centers are added with a public source by the admin. None are invented." /> : <>
        <MapView points={points} /><p className="mt-2 text-xs text-stone-500">Distances are straight-line approximations, not road distances.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((c) => <div key={c._id} className="card"><h3 className="font-semibold">{c.name}</h3><p className="text-sm text-stone-500">{[c.address, c.city, c.state].filter(Boolean).join(', ')}</p>{c.km !== null && <p className="text-sm">≈ {c.km.toFixed(1)} km away</p>}
          <div className="mt-2 flex gap-3 text-xs"><a className="text-leaf-700 underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/directions?route=${me ? `${me.lat},${me.lng}` : ''};${c.latitude},${c.longitude}`}>Directions</a>{safeUrl(c.sourceUrl) && <a className="text-leaf-700 underline" target="_blank" rel="noopener noreferrer" href={c.sourceUrl}>Source</a>}</div></div>)}</div></>}
    </div>
  );
}
