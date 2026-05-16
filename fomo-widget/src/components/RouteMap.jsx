import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SF_CENTER = [37.7749, -122.4194];
const COLORS = ['#a78bfa', '#60a5fa', '#4ade80', '#facc15', '#f87171'];

export function RouteMap({ routeData, allEvents }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const map = L.map(mapRef.current, {
      center: SF_CENTER,
      zoom: 13,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    if (!routeData?.optimized_route?.length) {
      (allEvents || []).forEach(event => {
        if (!event.lat || !event.lng) return;
        const m = L.circleMarker([event.lat, event.lng], {
          radius: 5, color: '#4a4a5a', fillColor: '#4a4a5a', fillOpacity: 0.5, weight: 1
        }).addTo(map);
        m.bindPopup(`<b>${event.name}</b><br/>${event.start_time}–${event.end_time}`);
        layersRef.current.push(m);
      });
      return;
    }

    const routeEvents = routeData.optimized_route
      .map(id => routeData.scored_events?.find(e => e.id === id))
      .filter(Boolean);

    const latlngs = [];

    routeEvents.forEach((event, i) => {
      if (!event.lat || !event.lng) return;
      const color = COLORS[i % COLORS.length];
      latlngs.push([event.lat, event.lng]);

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#0a0a0f;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.4);font-family:system-ui,sans-serif;">${i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([event.lat, event.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:180px">
          <b style="font-size:13px">${event.name}</b><br/>
          <span style="color:#888;font-size:11px">${event.location}</span><br/>
          <span style="font-size:12px">${event.start_time}–${event.end_time}</span><br/>
          <span style="color:${color};font-weight:700">Score: ${event.score}/100</span>
        </div>
      `);
      layersRef.current.push(marker);
    });

    if (latlngs.length > 1) {
      const line = L.polyline(latlngs, { color: '#a78bfa', weight: 3, opacity: 0.7, dashArray: '8, 8' }).addTo(map);
      layersRef.current.push(line);
    }

    if (latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }
  }, [routeData, allEvents]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="leaflet-map" />
    </div>
  );
}
