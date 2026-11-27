// Place search and reverse lookup via Photon (OpenStreetMap data).
import { CONFIG } from './config.js';

function uniq(parts) {
  const seen = new Set();
  return parts.filter((p) => p && !seen.has(p) && seen.add(p));
}

const countyName = (c) => (c && !/county|parish|borough/i.test(c) ? `${c} County` : c);

// Is this result a town/city itself (rather than a neighbourhood, street, address or business in one)?
const TOWN_TYPES = ['city', 'town', 'village', 'hamlet', 'locality', 'municipality', 'isolated_dwelling', 'county', 'state', 'country'];
const isPlace = (p) => p.osm_key === 'boundary' || (p.osm_key === 'place' && TOWN_TYPES.includes(p.osm_value));

// "Joplin, Missouri" for towns; "123 Main St, Joplin, Missouri" for addresses and businesses.
// Outside the US the country is added. Counties only appear when nothing else says where it is.
function labelFrom(p) {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const name = p.name || street;
  const town = isPlace(p) ? null : (p.city || p.town || p.village || p.district || countyName(p.county));
  const country = p.countrycode === 'US' ? null : p.country;
  return uniq([name, town, p.state, country]).join(', ') || 'Unnamed place';
}

export async function searchPlaces(query, { signal, near } = {}) {
  // Ask for a few extra, since duplicates get dropped below.
  const params = new URLSearchParams({ q: query, limit: '8', lang: 'en' });
  if (near) {
    params.set('lat', near.lat.toFixed(3));
    params.set('lon', near.lon.toFixed(3));
  }
  const res = await fetch(`${CONFIG.geocoder}/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = await res.json();

  // Photon can return the same map object more than once (e.g. as both a hamlet and a locality).
  const seenIds = new Set();
  const features = (data.features || []).filter((f) => {
    const id = `${f.properties?.osm_type}${f.properties?.osm_id}`;
    return !seenIds.has(id) && seenIds.add(id);
  });

  const results = features.map((f) => ({
    label: labelFrom(f.properties || {}),
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    county: countyName(f.properties?.county),
  }));

  // Two different places with the same label (two towns of one name in one state):
  // tell them apart by county.
  const counts = new Map();
  results.forEach((r) => counts.set(r.label, (counts.get(r.label) || 0) + 1));
  const out = [];
  const seenLabels = new Set();
  for (const r of results) {
    let label = r.label;
    if (counts.get(label) > 1 && r.county) label = label.replace(/, ([^,]+)$/, `, ${r.county}, $1`);
    if (seenLabels.has(label)) continue; // still identical: keep the first (best-ranked) one
    seenLabels.add(label);
    out.push({ label, lat: r.lat, lon: r.lon });
  }
  return out.slice(0, 5);
}

// Short "Town, State" name for a point, or null if nothing useful comes back.
export async function placeNameAt(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4), lang: 'en' });
  const res = await fetch(`${CONFIG.geocoder}/reverse?${params}`, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  const p = data.features?.[0]?.properties;
  if (!p) return null;
  const town = p.city || p.town || p.village || p.district || countyName(p.county) || p.name;
  return uniq([town, p.state]).join(', ') || null;
}
