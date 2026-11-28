// The text shown when a map pin is tapped: where and when, then one short sentence
// about the weather, plus a warning line when there's something a driver should know.
import { CONFIG } from './config.js';
import {
  ICE, SNOW, dateLabel, dateTimeLabel, describeCode, hazards, rainAmount, snowAmount, speed, temp, tempWithUnit,
} from './format.js';
import { forecastAvailableFrom } from './weather.js';

const listJoin = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

export function placeTitle(s) {
  switch (s.kind) {
    case 'start': return `Start: ${s.label}`;
    case 'stop': return `Stop: ${s.label}${s.stay ? ` (staying ${s.stay} h)` : ''}`;
    case 'leave': return `Leaving ${s.label}`;
    case 'end': return `Arrive: ${s.label}`;
    default: return s.name ? `Near ${s.name}` : 'Along the route';
  }
}

export function weatherSentence(w, u) {
  const c = describeCode(w.code);
  let text = `${c.text}, ${tempWithUnit(w.tempC, u)}`;
  // Only mention "feels like" when it's noticeably different (3° in the units shown).
  if (w.feelsC != null) {
    const diff = Math.abs(Number(temp(w.feelsC, u).slice(0, -1)) - Number(temp(w.tempC, u).slice(0, -1)));
    if (diff >= 3) text += ` (feels like ${temp(w.feelsC, u)})`;
  }

  const bits = [text];
  const kind = SNOW.includes(w.code) || w.snowCm > 0 ? 'snow' : ICE.includes(w.code) ? 'freezing rain' : 'rain';
  if (w.snowCm >= 0.1) {
    bits.push(`about ${snowAmount(w.snowCm, u)} of snow that hour`);
  } else if (w.precipMm >= 0.1) {
    bits.push(`about ${rainAmount(w.precipMm, u)} of ${kind} that hour`);
  } else if (!w.past && w.precipProb != null && w.precipProb >= 20) {
    bits.push(`${w.precipProb}% chance of ${kind}`);
  }

  if (w.windKmh != null) {
    let wind = `wind ${speed(w.windKmh, u)}`;
    if (w.gustKmh != null && w.gustKmh - w.windKmh >= 15) wind += ` with gusts to ${speed(w.gustKmh, u)}`;
    bits.push(wind);
  }
  return `${bits.join(', ')}.`;
}

// { title, when, text, warning } for a sample and its weather.
export function pinDetails(s, w, u) {
  const out = { title: placeTitle(s), when: dateTimeLabel(s.time, w.tz), text: '', warning: '' };
  if (w.type === 'forecast') {
    out.text = weatherSentence(w, u);
    const hz = hazards(w);
    if (hz.length) out.warning = `Watch for ${listJoin(hz)}.`;
  } else if (w.reason === 'future') {
    out.text = `No forecast yet: forecasts only reach ${CONFIG.forecastDays} days ahead. Check back around ${dateLabel(forecastAvailableFrom(s.time))}.`;
  } else {
    out.text = `No weather data: this is more than ${CONFIG.maxPastDays} days ago.`;
  }
  return out;
}
