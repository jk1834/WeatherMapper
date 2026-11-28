// The Leaflet map: route line plus a weather pin at each sample point.
// Tapping a pin opens a popup with the details for that place and hour.
/* global L */
import { CONFIG } from './config.js';
import { pinDetails } from './details.js';
import { h } from './dom.js';
import { describeCode, temp } from './format.js';

function popupContent(d) {
  return h('div', { class: 'wx-popup' },
    h('div', { class: 'wx-popup-title' }, d.title),
    h('div', { class: 'wx-popup-when' }, d.when),
    h('p', {}, d.text),
    d.warning ? h('p', { class: 'wx-popup-warn' }, d.warning) : null);
}

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
    this.pinLayer.clearLayers();
    const line = L.polyline(coords, { color: '#2563eb', weight: 5, opacity: 0.75 }).addTo(this.routeLayer);
    this.map.fitBounds(line.getBounds(), { padding: [30, 30] });
  }

  // onOpen(i, refresh) is called when a pin's popup opens; call refresh() to redraw its text
  // (used to fill in the nearest town once it has been looked up).
  showSamples(samples, weather, units, onOpen) {
    this.pinLayer.clearLayers();
    this.markers = samples.map((s, i) => {
      const w = weather[i];
      const html = w.type === 'forecast'
        ? `<div class="wx-pin ${s.kind}">${describeCode(w.code).icon}<b>${temp(w.tempC, units)}</b></div>`
        : `<div class="wx-pin ${s.kind} none"><span class="x">✕</span></div>`;
      const marker = L.marker([s.lat, s.lon], {
        icon: L.divIcon({ className: 'wx-pin-wrap', html, iconSize: null }),
        zIndexOffset: s.kind === 'route' ? 0 : 500,
        keyboard: false,
      }).addTo(this.pinLayer);

      const render = () => popupContent(pinDetails(s, w, units));
      marker.bindPopup(render, { maxWidth: 260, offset: [0, -12] });
      marker.on('popupopen', () => {
        marker.getElement()?.classList.add('selected');
        onOpen?.(i, () => { if (marker.isPopupOpen()) marker.setPopupContent(render()); });
      });
      marker.on('popupclose', () => marker.getElement()?.classList.remove('selected'));
      return marker;
    });
  }

  refreshSize() {
    setTimeout(() => this.map.invalidateSize(), 50);
  }
}
