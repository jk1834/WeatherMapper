// Place search and reverse lookup via Photon (OpenStreetMap data).
import { CONFIG } from './config.js';

function uniq(parts) {
  const seen = new Set();
  return parts.filter((p) => p && !seen.has(p) && seen.add(p));
}

function labelFrom(p) {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const name = p.name || street;
  const town = p.city || p.town || p.village || p.district || p.county;
  const country = p.countrycode === 'US' ? null : p.country;
  return uniq([name, town, p.state, country]).slice(0, 3).join(', ') || 'Unnamed place';
}

export async function searchPlaces(query, { signal, near } = {}) {
  const params = new URLSearchParams({ q: query, limit: '5', lang: 'en' });
  if (near) {
    params.set('lat', near.lat.toFixed(3));
    params.set('lon', near.lon.toFixed(3));
  }
  const res = await fetch(`${CONFIG.geocoder}/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = await res.json();
  return (data.features || []).map((f) => ({
    label: labelFrom(f.properties || {}),
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  }));
}

// Short "Town, State" name for a point, or null if nothing useful comes back.
export async function placeNameAt(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4), lang: 'en' });
  const res = await fetch(`${CONFIG.geocoder}/reverse?${params}`, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  const p = data.features?.[0]?.properties;
  if (!p) return null;
  const town = p.city || p.town || p.village || p.district || p.county || p.name;
  return uniq([town, p.state]).join(', ') || null;
}
