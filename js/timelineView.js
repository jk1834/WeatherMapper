// The list under the map: one row per weather point, grouped by day, plus a summary card.
import { h } from './dom.js';
import {
  confidence, dayLabel, describeCode, distance, duration, hazards, precip,
  shortDateTime, speed, temp, timeLabel, zoneLabel,
} from './format.js';

function placeText(s, units) {
  switch (s.kind) {
    case 'start': return `Start · ${s.label}`;
    case 'stop': return `Stop · ${s.label}${s.stay ? ` (staying ${s.stay} h)` : ''}`;
    case 'leave': return `Leave · ${s.label}`;
    case 'end': return `Arrive · ${s.label}`;
    default: return s.name ? `Near ${s.name}` : `${distance(s.dist, units)} in`;
  }
}

function weatherCell(w, units) {
  if (w.type === 'forecast') {
    const c = describeCode(w.code);
    const bits = [];
    if (w.precipProb != null) bits.push(`💧 ${w.precipProb}%`);
    if (w.windKmh != null) bits.push(`💨 ${speed(w.windKmh, units)}`);
    return h('div', { class: 'wx' },
      h('div', { class: 'wx-main' }, h('span', { class: 'wx-icon', title: c.text }, c.icon), h('span', { class: 'wx-temp' }, temp(w.tempC, units))),
      h('div', { class: 'wx-sub' }, c.text),
      h('div', { class: 'wx-sub' }, bits.join(' · ')));
  }
  if (w.type === 'lastyear') {
    const c = describeCode(w.code);
    return h('div', { class: 'wx' },
      h('div', { class: 'wx-main' }, h('span', { class: 'wx-icon', title: c.text }, c.icon),
        h('span', { class: 'wx-temp' }, `${temp(w.maxC, units)} / ${temp(w.minC, units)}`)),
      h('div', { class: 'wx-sub' }, `Last year: ${c.text.toLowerCase()}`),
      w.precipMm > 0 ? h('div', { class: 'wx-sub' }, `💧 ${precip(w.precipMm, units)} that day`) : null);
  }
  return h('div', { class: 'wx' }, h('div', { class: 'wx-sub' }, 'No forecast'));
}

export class TimelineView {
  constructor(listEl, summaryEl) {
    this.listEl = listEl;
    this.summaryEl = summaryEl;
    this.rows = [];
  }

  render(plan, weather, units, onSelect) {
    const { samples } = plan;
    this.rows = [];
    const out = [];
    let lastDay = null;

    samples.forEach((s, i) => {
      const w = weather[i];
      const day = dayLabel(s.time, w.tz);
      if (day !== lastDay) {
        const conf = w.type === 'forecast' ? confidence(s.time) : null;
        out.push(h('div', { class: 'day' },
          h('span', {}, day),
          conf ? h('span', { class: `conf ${conf.level}` }, conf.text) : null,
          w.type === 'lastyear' ? h('span', { class: 'conf low' }, 'Too far out to forecast, so this is last year\'s weather') : null));
        lastDay = day;
      }
      const hz = hazards(w);
      const row = h('button', {
        type: 'button',
        class: `stop-row ${s.kind}${hz.some((x) => x.level === 'bad') ? ' bad' : hz.length ? ' warn' : ''}`,
        onclick: () => onSelect(i),
      },
      h('div', { class: 'when' }, h('b', {}, timeLabel(s.time, w.tz)), h('small', {}, zoneLabel(s.time, w.tz))),
      h('div', { class: 'where' },
        h('div', { class: 'place' }, placeText(s, units)),
        hz.length ? h('div', { class: 'chips' }, hz.map((x) => h('span', { class: `chip ${x.level}` }, x.text))) : null),
      weatherCell(w, units));
      this.rows[i] = row;
      out.push(row);
    });

    this.listEl.replaceChildren(...out);
    this.renderSummary(plan, weather, units);
  }

  renderSummary(plan, weather, units) {
    const { samples } = plan;
    const end = samples[samples.length - 1];
    const endTz = weather[weather.length - 1]?.tz;
    const firstBad = samples.findIndex((s, i) => hazards(weather[i]).length);
    const anyLastYear = weather.some((w) => w.type === 'lastyear');
    const anyNone = weather.some((w) => w.type === 'none');

    let headline;
    if (firstBad >= 0) {
      const s = samples[firstBad];
      const hz = hazards(weather[firstBad]).map((x) => x.text.toLowerCase()).join(' and ');
      const where = s.kind === 'route' ? (s.name ? `near ${s.name}` : `${distance(s.dist, units)} in`) : `at ${s.label}`;
      headline = h('p', { class: 'headline warn' }, `⚠️ Watch for ${hz} ${where}, around ${shortDateTime(s.time, weather[firstBad].tz)}.`);
    } else if (weather.every((w) => w.type === 'forecast')) {
      headline = h('p', { class: 'headline ok' }, '✅ No weather trouble in the forecast along the way.');
    }

    this.summaryEl.replaceChildren(...[
      h('div', { class: 'stats' },
        h('div', {}, h('small', {}, 'Distance'), h('b', {}, distance(plan.totalDist, units))),
        h('div', {}, h('small', {}, 'Driving'), h('b', {}, duration(plan.totalDrive))),
        h('div', {}, h('small', {}, 'Arrive'), h('b', {}, `${shortDateTime(end.time, endTz)} ${zoneLabel(end.time, endTz)}`))),
      headline,
      anyLastYear ? h('p', { class: 'note' }, 'Parts of this trip are more than 16 days away. Those show last year\'s weather on the same date, not a forecast.') : null,
      anyNone ? h('p', { class: 'note' }, 'Some points have no forecast (in the past or out of range).') : null,
      h('p', { class: 'note' }, `Weather checked every ${duration(plan.intervalMin * 60)} of driving. Times assume no traffic or breaks.`),
    ].filter(Boolean));
    this.summaryEl.hidden = false;
  }

  setName(i, plan, units) {
    const row = this.rows[i];
    const s = plan.samples[i];
    if (row && s.kind === 'route') row.querySelector('.place').textContent = placeText(s, units);
  }

  highlight(i) {
    this.rows.forEach((r) => r?.classList.remove('selected'));
    const r = this.rows[i];
    if (r) { r.classList.add('selected'); r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
}
