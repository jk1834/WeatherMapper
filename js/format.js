// Display helpers: weather codes, units, times, hazards and forecast confidence.

const CODES = {
  0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'], 48: ['🌫️', 'Freezing fog'],
  51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'],
  56: ['🧊', 'Freezing drizzle'], 57: ['🧊', 'Freezing drizzle'],
  61: ['🌦️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
  66: ['🧊', 'Freezing rain'], 67: ['🧊', 'Heavy freezing rain'],
  71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['🌨️', 'Snow grains'],
  80: ['🌦️', 'Showers'], 81: ['🌧️', 'Heavy showers'], 82: ['⛈️', 'Violent showers'],
  85: ['🌨️', 'Snow showers'], 86: ['❄️', 'Heavy snow showers'],
  95: ['⛈️', 'Thunderstorms'], 96: ['⛈️', 'Storms with hail'], 99: ['⛈️', 'Storms with hail'],
};

export function describeCode(code) {
  const c = CODES[code];
  return c ? { icon: c[0], text: c[1] } : { icon: '❔', text: 'Unknown' };
}

export const temp = (c, u) => (c == null ? '–' : `${Math.round(u === 'f' ? (c * 9) / 5 + 32 : c)}°`);
export const speed = (kmh, u) => (kmh == null ? '–' : u === 'f' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`);
export const precip = (mm, u) => (u === 'f' ? `${(mm / 25.4).toFixed(2)} in` : `${mm.toFixed(1)} mm`);
export const distance = (m, u) => (u === 'f' ? `${Math.round(m / 1609.344)} mi` : `${Math.round(m / 1000)} km`);

export function duration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function fmt(ms, tz, opts) {
  try {
    return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: tz || undefined }).format(ms);
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(ms);
  }
}

export const timeLabel = (ms, tz) => fmt(ms, tz, { hour: 'numeric', minute: '2-digit' });
export const zoneLabel = (ms, tz) => {
  const parts = (() => {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, timeZoneName: 'short' }).formatToParts(ms); } catch { return []; }
  })();
  return parts.find((p) => p.type === 'timeZoneName')?.value || '';
};
export const dayLabel = (ms, tz) => fmt(ms, tz, { weekday: 'long', month: 'short', day: 'numeric' });
export const shortDateTime = (ms, tz) => fmt(ms, tz, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

const SNOW = [71, 73, 75, 77, 85, 86];
const ICE = [48, 56, 57, 66, 67];
const STORM = [95, 96, 99];
const RAIN = [51, 53, 55, 61, 63, 65, 80, 81, 82];

// Things worth calling out to a driver. Each has a level: 'warn' or 'bad'.
export function hazards(w) {
  if (!w || w.type !== 'forecast') return [];
  const out = [];
  if (STORM.includes(w.code)) out.push({ level: 'bad', text: 'Storms' });
  if (ICE.includes(w.code)) out.push({ level: 'bad', text: 'Ice' });
  if (SNOW.includes(w.code)) out.push({ level: [75, 86].includes(w.code) ? 'bad' : 'warn', text: 'Snow' });
  if (RAIN.includes(w.code) && (w.precipProb ?? 100) >= 50) {
    out.push({ level: [65, 81, 82].includes(w.code) ? 'bad' : 'warn', text: 'Rain' });
  }
  if ([45].includes(w.code)) out.push({ level: 'warn', text: 'Fog' });
  if (w.tempC <= 0 && w.precipMm > 0 && !SNOW.includes(w.code) && !ICE.includes(w.code)) {
    out.push({ level: 'bad', text: 'Icy roads possible' });
  }
  if ((w.gustKmh ?? 0) >= 65) out.push({ level: (w.gustKmh >= 90 ? 'bad' : 'warn'), text: 'Strong gusts' });
  return out;
}

export function confidence(ms) {
  const days = (ms - Date.now()) / 86400e3;
  if (days <= 3) return { level: 'good', text: 'Good confidence' };
  if (days <= 7) return { level: 'fair', text: 'Fair confidence' };
  return { level: 'low', text: 'Low confidence, check again closer to the date' };
}
