# Weather Mapper

Shows the weather along a driving route at the time you'll actually be at each point.
It's a static site, so it runs on GitHub Pages with no server, accounts, API keys or card.

## Put it on GitHub Pages
This repo (`jk1834/WeatherMapper`) is served at **https://jk1834.github.io/WeatherMapper/**.
If Pages ever needs turning back on: **Settings → Pages**, set **Source** to "Deploy from a branch",
choose `main` and `/ (root)`, and save. Changes show up a minute or so after you push.

## Using it
- Type a start and a destination (pick from the suggestions, or just type and press **Check weather**).
- **+ Add a stop** for places along the way. "h stay" is how long you'll be there; use something
  like 12 for an overnight stop and the next day's driving is timed correctly.
- The map shows the route with a pin at each check point: the expected weather and temperature
  for the time you'll pass it. Tap a pin to centre on it.
- **Share trip** sends a link. The whole trip is stored in the link itself, so whoever opens it
  sees the same trip with fresh weather. Bookmark a link to save a trip.

## How it decides what to show
- Within 16 days: Open-Meteo's hourly forecast for the hour you'll pass each point.
  Forecasts lose accuracy after about a week, so check again closer to the date.
- Further than 16 days out: last year's weather on the same date (those pins have a dashed border).
- Drive times come from the routing service and assume no traffic or breaks.

## Test it on your computer
ES modules don't load from `file://`, so run a tiny local server from this folder:
```
python3 -m http.server 8000
```
then open http://localhost:8000.

## Files
```
index.html          page layout
css/style.css       styling
js/config.js        all outside service addresses and limits (edit here to swap services)
js/main.js          wires the form, map and list together
js/routing.js       driving route (OSRM)
js/sampling.js      picks weather check points and the time you reach each one
js/weather.js       forecast + last-year fallback (Open-Meteo)
js/geocode.js       place search and town names (Photon)
js/placeField.js    the search box with suggestions
js/mapView.js       Leaflet map and weather pins
js/tripUrl.js       saves/loads the trip in the link
js/format.js        weather icons and temperature
```

## Services used (all free, no key)
- Map tiles: OpenStreetMap
- Routing: OSRM servers at routing.openstreetmap.de, falling back to router.project-osrm.org
- Place search: Photon (komoot)
- Weather: Open-Meteo (free for non-commercial use, attribution in the footer)

These are community services meant for light use, which a family tool is.
Keep the attribution footer in place.
