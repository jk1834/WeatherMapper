// The Leaflet map: route line plus a weather pin at each sample point.
/* global L */
import { CONFIG } from './config.js';
import { describeCode, temp } from './format.js';

export class MapView {
  constructor(el) {
    this.map = L.map(el).setView([39.5, -98.35], 4);
    L.tileLayer(CONFIG.tileUrl, { maxZoom: 18, attribution: CONFIG.tileAttribution }).addTo(this.map);
    this.routeLayer = L.layerGroup().addTo(this.map);
    this.pinLayer = L.layerGroup().addTo(this.map);
    this.markers = [];
  }

  center() {
    const c = this.map.getCenter();
    return this.map.getZoom() >= 6 ? { lat: c.lat, lon: c.lng } : null;
  }

  showRoute(coords) {
    this.routeLayer.clearLayers();
    const line = L.polyline(coords, { color: '#2563eb', weight: 5, opacity: 0.75 }).addTo(this.routeLayer);
    this.map.fitBounds(line.getBounds(), { padding: [30, 30] });
  }

  showSamples(samples, weather, units, onSelect) {
    this.pinLayer.clearLayers();
    this.markers = samples.map((s, i) => {
      const w = weather[i];
      let icon = '·';
      let label = '';
      if (w.type === 'forecast') { icon = describeCode(w.code).icon; label = temp(w.tempC, units); }
      else if (w.type === 'lastyear') { icon = describeCode(w.code).icon; label = temp(w.maxC, units); }
      const html = `<div class="wx-pin ${s.kind} ${w.type}">${icon}<b>${label}</b></div>`;
      const marker = L.marker([s.lat, s.lon], {
        icon: L.divIcon({ className: 'wx-pin-wrap', html, iconSize: null }),
        zIndexOffset: s.kind === 'route' ? 0 : 500,
        keyboard: false,
      }).addTo(this.pinLayer);
      marker.on('click', () => onSelect(i));
      return marker;
    });
  }

  focus(i) {
    const m = this.markers[i];
    if (!m) return;
    this.markers.forEach((mk) => mk.getElement()?.classList.remove('selected'));
    m.getElement()?.classList.add('selected');
    this.map.panTo(m.getLatLng());
  }

  refreshSize() {
    setTimeout(() => this.map.invalidateSize(), 50);
  }
}
