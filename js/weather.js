// Weather for each sample point at the time you'll be there, from Open-Meteo.
// The service covers roughly the last 92 days up to 16 days ahead, so a trip already
// under way still shows the weather on stretches you've passed. Points outside that
// window come back as { type: 'none', reason: 'future' | 'past' }.
import { CONFIG } from './config.js';

const DAY = 86400e3;
const round = (x) => Math.round(x * 1000) / 1000;

async function fetchMulti(url, samples, params) {
  const qs = new URLSearchParams({
    latitude: samples.map((s) => round(s.lat)).join(','),
    longitude: samples.map((s) => round(s.lon)).join(','),
    ...params,
  });
  const res = await fetch(`${url}?${qs}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    throw new Error(`Weather service error: ${data?.reason || res.status}`);
  }
  return Array.isArray(data) ? data : [data];
}

function nearestHour(times, tSec) {
  if (!times?.length) return -1;
  if (tSec < times[0] - 1800 || tSec > times[times.length - 1] + 1800) return -1;
  return Math.min(times.length - 1, Math.max(0, Math.round((tSec - times[0]) / 3600)));
}

// Earliest date a point's hour will be inside the forecast (forecast_days counts today).
export function forecastAvailableFrom(ms) {
  return ms - (CONFIG.forecastDays - 1) * DAY;
}

export async function getWeather(samples) {
  const now = Date.now();
  const earliest = Math.min(...samples.map((s) => s.time));
  // Ask for just enough history to cover the part of the trip that's already happened.
  const pastDays = Math.min(CONFIG.maxPastDays, Math.max(1, Math.ceil((now - earliest) / DAY) + 1));

  const fc = await fetchMulti(CONFIG.forecastUrl, samples, {
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,snowfall,weather_code,wind_speed_10m,wind_gusts_10m',
    forecast_days: String(CONFIG.forecastDays),
    past_days: String(pastDays),
    timezone: 'auto',
    timeformat: 'unixtime',
  });

  return samples.map((s, i) => {
    const loc = fc[i] || fc[0];
    const tz = loc.timezone || null;
    const h = loc.hourly;
    const idx = nearestHour(h?.time, s.time / 1000);
    if (idx < 0 || h.temperature_2m[idx] == null) {
      return { type: 'none', tz, reason: s.time > now ? 'future' : 'past' };
    }
    return {
      type: 'forecast',
      tz,
      past: s.time < now,
      tempC: h.temperature_2m[idx],
      feelsC: h.apparent_temperature?.[idx] ?? null,
      precipProb: h.precipitation_probability?.[idx] ?? null,
      precipMm: h.precipitation?.[idx] ?? 0,
      snowCm: h.snowfall?.[idx] ?? 0,
      code: h.weather_code?.[idx],
      windKmh: h.wind_speed_10m?.[idx] ?? null,
      gustKmh: h.wind_gusts_10m?.[idx] ?? null,
    };
  });
}
