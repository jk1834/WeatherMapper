// All outside services live here, so they can be swapped without touching the app code.
// Every service below is free and needs no account or API key.
export const CONFIG = {
  // OSRM-compatible routing servers, tried in order until one answers.
  routers: [
    'https://routing.openstreetmap.de/routed-car/route/v1/driving',
    'https://router.project-osrm.org/route/v1/driving',
  ],

  // Photon (by komoot) for place search and "nearest town" names.
  geocoder: 'https://photon.komoot.io',

  // Open-Meteo weather. The service gives hourly data from up to 92 days ago to 16 days ahead.
  forecastUrl: 'https://api.open-meteo.com/v1/forecast',
  forecastDays: 16,
  maxPastDays: 92,

  // Map tiles.
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

  // Upper limit on weather points per trip; long trips widen the spacing to stay under it.
  maxSamples: 48,
  maxStops: 8,
};
