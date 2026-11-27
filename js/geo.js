// Small geometry helpers. Coordinates are [lat, lon] arrays.

const R = 6371000; // Earth radius, metres
const rad = (d) => (d * Math.PI) / 180;

export function haversineM(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function lerp(a, b, f) {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

export function nearestIndex(coords, point, from = 0) {
  let best = from;
  let bestD = Infinity;
  for (let i = from; i < coords.length; i++) {
    const d = haversineM(coords[i], point);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
