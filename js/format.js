// Display helpers for the map pins: weather icons and temperature.

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
