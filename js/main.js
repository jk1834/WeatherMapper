// Wires the form, map and timeline together.
import { CONFIG } from './config.js';
import { h } from './dom.js';
import { placeNameAt } from './geocode.js';
import { MapView } from './mapView.js';
import { PlaceField } from './placeField.js';
import { getRoute } from './routing.js';
import { planSamples } from './sampling.js';
import { TimelineView } from './timelineView.js';
import { decodeTrip, encodeTrip } from './tripUrl.js';
import { getWeather } from './weather.js';

const $ = (sel) => document.querySelector(sel);

const state = { units: 'f', plan: null, weather: null, runId: 0 };

const mapView = new MapView($('#map'));
const timeline = new TimelineView($('#timeline'), $('#summary'));
const getBias = () => fromField.place || mapView.center();
const fromField = new PlaceField($('#from-field'), { getBias: () => mapView.center() });
const toField = new PlaceField($('#to-field'), { getBias });
const stopFields = [];

const departInput = $('#depart-input');
const intervalSelect = $('#interval-select');
const statusEl = $('#status');
const shareBtn = $('#share-btn');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', isError);
}

// ---- Departure time ----
function toLocalInput(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function nextHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.getTime();
}

// ---- Stops ----
function renumberStops() {
  stopFields.forEach((f, i) => { f.root.querySelector('.n').textContent = i + 1; });
  $('#add-stop').hidden = stopFields.length >= CONFIG.maxStops;
}

function addStop(place = null, stay = 0) {
  const root = h('div', { class: 'field place stop' },
    h('label', {}, 'Stop ', h('span', { class: 'n' })),
    h('div', { class: 'input-row' },
      h('input', { type: 'text', placeholder: 'City or address' }),
      h('input', { type: 'number', class: 'stay', min: '0', max: '96', step: '0.5', value: String(stay), 'aria-label': 'Hours staying at this stop', title: 'Hours staying here' }),
      h('span', { class: 'unit' }, 'h stay'),
      h('button', { type: 'button', class: 'icon remove', title: 'Remove stop', 'aria-label': 'Remove stop' }, '✕')),
    h('ul', { class: 'suggestions', hidden: true }));
  $('#stops').append(root);
  const field = new PlaceField(root, { getBias });
  field.stayInput = root.querySelector('.stay');
  field.set(place);
  root.querySelector('.remove').addEventListener('click', () => {
    stopFields.splice(stopFields.indexOf(field), 1);
    root.remove();
    renumberStops();
  });
  stopFields.push(field);
  renumberStops();
  return field;
}

// ---- Units ----
function setUnits(u) {
  state.units = u;
  document.querySelectorAll('.units .seg').forEach((b) => b.classList.toggle('active', b.dataset.units === u));
}
document.querySelectorAll('.units .seg').forEach((b) => b.addEventListener('click', () => {
  setUnits(b.dataset.units);
  if (state.plan) { renderResults(); updateUrl(); }
}));

// ---- Run ----
function select(i) {
  mapView.focus(i);
  timeline.highlight(i);
}

function renderResults() {
  mapView.showSamples(state.plan.samples, state.weather, state.units, select);
  timeline.render(state.plan, state.weather, state.units, select);
}

function currentTrip() {
  return {
    from: fromField.place,
    to: toField.place,
    stops: stopFields.filter((f) => f.place).map((f) => ({ ...f.place, stay: Number(f.stayInput.value) || 0 })),
    departMs: new Date(departInput.value).getTime(),
    interval: Number(intervalSelect.value),
    units: state.units,
  };
}

function updateUrl() {
  history.replaceState(null, '', location.pathname + encodeTrip(currentTrip()));
  shareBtn.hidden = false;
}

async function nameRoutePoints(runId) {
  const { samples } = state.plan;
  for (let i = 0; i < samples.length; i++) {
    if (runId !== state.runId) return;
    if (samples[i].kind !== 'route') continue;
    try {
      const name = await placeNameAt(samples[i].lat, samples[i].lon);
      if (runId !== state.runId) return;
      if (name) { samples[i].name = name; timeline.setName(i, state.plan, state.units); }
    } catch { /* names are a nice-to-have */ }
    await new Promise((r) => setTimeout(r, 200)); // be gentle with the free service
  }
}

async function run() {
  const runId = ++state.runId;
  const goBtn = $('#go-btn');
  goBtn.disabled = true;
  try {
    setStatus('Finding places…');
    const from = await fromField.resolve();
    const to = await toField.resolve();
    if (!from || !to) throw new Error('Enter a start and a destination.');
    for (const f of stopFields) await f.resolve();
    const stops = stopFields.filter((f) => f.place).map((f) => ({ ...f.place, stay: Number(f.stayInput.value) || 0 }));

    const departMs = new Date(departInput.value).getTime();
    if (!Number.isFinite(departMs)) throw new Error('Pick a departure date and time.');

    setStatus('Planning the route…');
    const route = await getRoute([from, ...stops, to]);
    if (runId !== state.runId) return;
    mapView.showRoute(route.coords);

    const plan = planSamples(route, { from, to, stops }, departMs, Number(intervalSelect.value), CONFIG.maxSamples);

    setStatus('Checking the weather…');
    const weather = await getWeather(plan.samples);
    if (runId !== state.runId) return;

    state.plan = plan;
    state.weather = weather;
    renderResults();
    updateUrl();
    setStatus(departMs < Date.now() ? 'That departure time has already passed, so some points may have no forecast.' : '');
    nameRoutePoints(runId);
  } catch (e) {
    console.error(e);
    if (runId === state.runId) setStatus(e.message || 'Something went wrong.', true);
  } finally {
    if (runId === state.runId) goBtn.disabled = false;
  }
}

$('#trip-form').addEventListener('submit', (e) => { e.preventDefault(); run(); });
$('#add-stop').addEventListener('click', () => addStop().input.focus());

// ---- My location ----
$('#locate-btn').addEventListener('click', () => {
  if (!navigator.geolocation) { setStatus('Location isn\'t available in this browser.', true); return; }
  setStatus('Finding you…');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    let label = 'My location';
    try { label = (await placeNameAt(lat, lon)) || label; } catch { /* keep default */ }
    fromField.set({ label, lat, lon });
    setStatus('');
  }, () => setStatus('Couldn\'t get your location.', true), { timeout: 10000 });
});

// ---- Share ----
shareBtn.addEventListener('click', async () => {
  const url = location.href;
  try {
    if (navigator.share) { await navigator.share({ title: 'Weather Mapper', url }); return; }
    await navigator.clipboard.writeText(url);
    setStatus('Link copied. Send it to anyone and it opens this trip.');
  } catch (e) {
    if (e.name !== 'AbortError') prompt('Copy this link:', url);
  }
});

// ---- Start up from the link, if it has a trip in it ----
(function init() {
  const trip = decodeTrip(location.search);
  setUnits(trip.units);
  intervalSelect.value = String(trip.interval);
  departInput.value = toLocalInput(trip.departMs ?? nextHour());
  if (trip.from) fromField.set(trip.from);
  if (trip.to) toField.set(trip.to);
  trip.stops.forEach((s) => addStop(s, s.stay));
  renumberStops();
  if (trip.from && trip.to && trip.departMs) run();
  window.addEventListener('resize', () => mapView.refreshSize());
})();
