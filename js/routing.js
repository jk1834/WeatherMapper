// Driving route from free OSRM servers, normalised to:
//   coords:    [[lat, lon], ...] along the road
//   segDur:    seconds of driving between coords[i] and coords[i+1]
//   legEndIdx: index in coords where each leg (to each stop, then the destination) ends
import { CONFIG } from './config.js';
import { haversineM, nearestIndex } from './geo.js';

export async function getRoute(points) {
  const path = points.map((p) => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
  const qs = 'overview=full&geometries=geojson&annotations=duration&steps=false';
  let lastError = null;

  for (const base of CONFIG.routers) {
    try {
      const res = await fetch(`${base}/${path}?${qs}`);
      const data = await res.json().catch(() => null);
      if (data?.code === 'Ok' && data.routes?.length) return normalise(data.routes[0], points);
      if (data?.code === 'NoRoute') throw new Error('No driving route found between those places.');
      lastError = new Error(data?.message || `Routing server error (${res.status})`);
    } catch (e) {
      if (e.message.startsWith('No driving route')) throw e;
      lastError = e;
    }
  }
  throw new Error(`Couldn't get a route right now. ${lastError?.message || ''}`.trim());
}

function normalise(route, points) {
  const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  const legDur = route.legs.map((l) => l.annotation?.duration || []);
  const flat = legDur.flat();

  if (flat.length === coords.length - 1) {
    const legEndIdx = [];
    let idx = 0;
    for (const d of legDur) { idx += d.length; legEndIdx.push(idx); }
    return { coords, segDur: flat, legEndIdx, distance: route.distance, duration: route.duration };
  }

  // Fallback if per-segment timings are missing: find each stop on the line and
  // spread each leg's time over its length.
  const legEndIdx = [];
  let from = 0;
  for (let k = 1; k < points.length; k++) {
    const idx = k === points.length - 1
      ? coords.length - 1
      : nearestIndex(coords, [points[k].lat, points[k].lon], from);
    legEndIdx.push(idx);
    from = idx;
  }
  const segDur = new Array(coords.length - 1).fill(0);
  let start = 0;
  route.legs.forEach((leg, k) => {
    const end = legEndIdx[k];
    let len = 0;
    for (let i = start; i < end; i++) len += haversineM(coords[i], coords[i + 1]);
    for (let i = start; i < end; i++) {
      segDur[i] = len ? (leg.duration * haversineM(coords[i], coords[i + 1])) / len : 0;
    }
    start = end;
  });
  return { coords, segDur, legEndIdx, distance: route.distance, duration: route.duration };
}
