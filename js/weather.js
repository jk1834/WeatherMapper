// Weather for each sample point at the time you'll be there, from Open-Meteo.
// Within 16 days: the hourly forecast. Further out: last year's weather on that date
// (clearly labelled as not a forecast).
import { CONFIG } from './config.js';

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

function isoDate(ms, tz) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

function lastYear(date) {
  const [y, m, d] = date.split('-');
  const md = m === '02' && d === '29' ? '02-28' : `${m}-${d}`;
  return `${Number(y) - 1}-${md}`;
}

export async function getWeather(samples) {
  const out = samples.map(() => ({ type: 'none', tz: null }));

  const fc = await fetchMulti(CONFIG.forecastUrl, samples, {
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    forecast_days: String(CONFIG.forecastDays),
    past_days: '1',
    timezone: 'auto',
    timeformat: 'unixtime',
  });

  samples.forEach((s, i) => {
    const loc = fc[i] || fc[0];
    out[i].tz = loc.timezone || null;
    const h = loc.hourly;
    const idx = nearestHour(h?.time, s.time / 1000);
    if (idx < 0 || h.temperature_2m[idx] == null) return;
    out[i] = {
      type: 'forecast',
      tz: loc.timezone || null,
      tempC: h.temperature_2m[idx],
      precipProb: h.precipitation_probability?.[idx] ?? null,
      precipMm: h.precipitation?.[idx] ?? 0,
      code: h.weather_code?.[idx],
      windKmh: h.wind_speed_10m?.[idx] ?? null,
      gustKmh: h.wind_gusts_10m?.[idx] ?? null,
    };
  });

  // Too far out for a forecast: fall back to the same date last year.
  const missing = samples.map((s, i) => i).filter((i) => out[i].type === 'none' && samples[i].time > Date.now());
  if (missing.length) {
    try {
      const dates = missing.map((i) => lastYear(isoDate(samples[i].time, out[i].tz || undefined)));
      const sorted = [...dates].sort();
      const arc = await fetchMulti(CONFIG.archiveUrl, missing.map((i) => samples[i]), {
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
        start_date: sorted[0],
        end_date: sorted[sorted.length - 1],
        timezone: 'auto',
      });
      missing.forEach((i, j) => {
        const loc = arc[j] || arc[0];
        const k = loc.daily?.time?.indexOf(dates[j]) ?? -1;
        if (k < 0) return;
        out[i] = {
          type: 'lastyear',
          tz: out[i].tz || loc.timezone || null,
          date: dates[j],
          maxC: loc.daily.temperature_2m_max[k],
          minC: loc.daily.temperature_2m_min[k],
          precipMm: loc.daily.precipitation_sum[k] ?? 0,
          code: loc.daily.weather_code[k],
        };
      });
    } catch (e) {
      console.warn('Historical lookup failed', e);
    }
  }

  return out;
}
