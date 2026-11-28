// Display helpers: weather icons, units, times and driving hazards.

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
export const tempWithUnit = (c, u) => (c == null ? '–' : `${temp(c, u)}${u === 'f' ? 'F' : 'C'}`);
export const speed = (kmh, u) => (u === 'f' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`);

// Rain/melted amounts arrive in mm, snowfall in cm. Small amounts get one more decimal.
export const rainAmount = (mm, u) => (u === 'f' ? `${(mm / 25.4).toFixed(mm < 2.5 ? 2 : 1)} in` : `${mm.toFixed(1)} mm`);
export const snowAmount = (cm, u) => (u === 'f' ? `${(cm / 2.54).toFixed(1)} in` : `${cm.toFixed(1)} cm`);

function fmt(ms, tz, opts) {
  try {
    return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: tz || undefined }).format(ms);
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(ms);
  }
}

export function zoneLabel(ms, tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, timeZoneName: 'short' }).formatToParts(ms);
    return parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
}

// "Sat, Dec 5, 3:00 PM CST"
export const dateTimeLabel = (ms, tz) =>
  `${fmt(ms, tz, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ${zoneLabel(ms, tz)}`.trim();
// "Dec 12"
export const dateLabel = (ms) => fmt(ms, undefined, { month: 'short', day: 'numeric' });

export const SNOW = [71, 73, 75, 77, 85, 86];
export const ICE = [48, 56, 57, 66, 67];
const STORM = [95, 96, 99];
const RAIN = [51, 53, 55, 61, 63, 65, 80, 81, 82];

// Things worth calling out to a driver, worst first.
export function hazards(w) {
  if (!w || w.type !== 'forecast') return [];
  const out = [];
  if (STORM.includes(w.code)) out.push('storms');
  if (ICE.includes(w.code)) out.push('ice');
  if (SNOW.includes(w.code)) out.push([75, 86].includes(w.code) ? 'heavy snow' : 'snow');
  if (w.tempC <= 0 && w.precipMm > 0 && !SNOW.includes(w.code) && !ICE.includes(w.code)) out.push('icy roads');
  if ([65, 81, 82].includes(w.code) && (w.precipProb ?? 100) >= 50) out.push('heavy rain');
  if (w.code === 45) out.push('fog');
  if ((w.gustKmh ?? 0) >= 65) out.push('strong gusts');
  return out;
}
