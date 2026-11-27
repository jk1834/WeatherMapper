// Turns a route + departure time into the points where we check the weather:
// the start, every N minutes of driving, each stop (arrival, and departure for long stays),
// and the destination. Each point gets the time you'll be there.
import { haversineM, lerp } from './geo.js';

export function planSamples(route, places, departMs, intervalMin, maxSamples) {
  const { coords, segDur, legEndIdx } = route;
  const { from, to, stops } = places;
  const n = coords.length;

  const totalDrive = segDur.reduce((a, b) => a + b, 0);
  let interval = intervalMin * 60;
  const routeBudget = Math.max(1, maxSamples - 2 - stops.length * 2);
  if (totalDrive / interval > routeBudget) {
    interval = Math.ceil(totalDrive / routeBudget / 1800) * 1800; // widen in 30-minute steps
  }

  // Driving time (s) at each stop and at the destination, used to avoid
  // placing a route point right next to one of them.
  const anchorDrive = [];
  {
    let acc = 0;
    let k = 0;
    for (let i = 1; i < n && k < legEndIdx.length; i++) {
      acc += segDur[i - 1];
      while (k < legEndIdx.length && legEndIdx[k] === i) { anchorDrive.push(acc); k++; }
    }
    while (anchorDrive.length < legEndIdx.length) anchorDrive.push(totalDrive);
  }
  const minGap = Math.min(interval * 0.35, 20 * 60);

  const stopAt = new Map();
  legEndIdx.slice(0, -1).forEach((idx, k) => { if (!stopAt.has(idx)) stopAt.set(idx, k); });

  const samples = [{ kind: 'start', label: from.label, lat: from.lat, lon: from.lon, time: departMs, drive: 0, dist: 0 }];
  let t = departMs;
  let drive = 0;
  let dist = 0;
  let lastAnchor = 0;
  let nextAt = interval;

  for (let i = 1; i < n; i++) {
    const d = segDur[i - 1];
    const segM = haversineM(coords[i - 1], coords[i]);

    while (d > 0 && drive + d >= nextAt) {
      const f = (nextAt - drive) / d;
      const nextAnchor = anchorDrive.find((a) => a >= nextAt) ?? totalDrive;
      if (nextAt - lastAnchor >= minGap && nextAnchor - nextAt >= minGap) {
        const [lat, lon] = lerp(coords[i - 1], coords[i], f);
        samples.push({ kind: 'route', lat, lon, time: t + (nextAt - drive) * 1000, drive: nextAt, dist: dist + segM * f });
      }
      nextAt += interval;
    }

    drive += d;
    t += d * 1000;
    dist += segM;

    if (stopAt.has(i)) {
      const k = stopAt.get(i);
      const stop = stops[k];
      const stayH = Number(stop.stay) || 0;
      samples.push({ kind: 'stop', label: stop.label, lat: stop.lat, lon: stop.lon, time: t, stay: stayH, drive, dist });
      if (stayH >= 2) {
        samples.push({ kind: 'leave', label: stop.label, lat: stop.lat, lon: stop.lon, time: t + stayH * 3600e3, drive, dist });
      }
      t += stayH * 3600e3;
      lastAnchor = drive;
      nextAt = drive + interval;
    }
  }

  samples.push({ kind: 'end', label: to.label, lat: to.lat, lon: to.lon, time: t, drive, dist });
  return { samples, intervalMin: interval / 60, totalDrive, totalDist: route.distance || dist, arrive: t };
}
