import { useEffect, useRef } from 'react';
import L from 'leaflet';
// Markers are drawn as circle markers so no marker image assets are needed.
export default function MapView({ points, height = 360 }) {
  const el = useRef(null); const map = useRef(null);
  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current).setView([20.59, 78.96], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 18 }).addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const m = map.current; if (!m) return;
    const layer = L.layerGroup().addTo(m);
    points.forEach((p) => L.circleMarker([p.lat, p.lng], { radius: 8, color: p.color || '#2f7a34', fillOpacity: 0.8 }).bindPopup(p.label).addTo(layer));
    if (points.length) m.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 12 });
    return () => layer.remove();
  }, [points]);
  return <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-xl border border-stone-200" role="region" aria-label="Map" />;
}
