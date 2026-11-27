// The whole trip lives in the page address, so a link is all you need to share or save one.
//   ?from=lat,lon,Label&via=lat,lon,stayHours,Label&to=lat,lon,Label&depart=2026-12-20T13:00Z&every=60&u=f

const num = (x) => Number(Number(x).toFixed(5));

function placeParam(p) {
  return `${num(p.lat)},${num(p.lon)},${p.label}`;
}

function parsePlace(s, withStay = false) {
  if (!s) return null;
  const parts = s.split(',');
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (withStay) {
    return { lat, lon, stay: Number(parts[2]) || 0, label: parts.slice(3).join(',') || 'Stop' };
  }
  return { lat, lon, label: parts.slice(2).join(',') || `${lat}, ${lon}` };
}

export function encodeTrip(trip) {
  const q = new URLSearchParams();
  if (trip.from) q.set('from', placeParam(trip.from));
  for (const s of trip.stops) q.append('via', `${num(s.lat)},${num(s.lon)},${Number(s.stay) || 0},${s.label}`);
  if (trip.to) q.set('to', placeParam(trip.to));
  if (trip.departMs) q.set('depart', new Date(trip.departMs).toISOString().slice(0, 16) + 'Z');
  q.set('every', String(trip.interval));
  q.set('u', trip.units);
  return `?${q}`;
}

export function decodeTrip(search) {
  const q = new URLSearchParams(search);
  const departMs = q.get('depart') ? Date.parse(q.get('depart')) : NaN;
  return {
    from: parsePlace(q.get('from')),
    to: parsePlace(q.get('to')),
    stops: q.getAll('via').map((v) => parsePlace(v, true)).filter(Boolean),
    departMs: Number.isFinite(departMs) ? departMs : null,
    interval: [30, 60, 120].includes(Number(q.get('every'))) ? Number(q.get('every')) : 60,
    units: q.get('u') === 'c' ? 'c' : 'f',
  };
}
