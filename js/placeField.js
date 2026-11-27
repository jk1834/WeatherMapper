// A text box with place suggestions. Holds the chosen place as { label, lat, lon }.
import { searchPlaces } from './geocode.js';
import { h } from './dom.js';

export class PlaceField {
  constructor(root, { getBias } = {}) {
    this.root = root;
    this.input = root.querySelector('input[type=text]');
    this.list = root.querySelector('.suggestions');
    this.getBias = getBias;
    this.place = null;
    this.results = [];
    this.timer = null;
    this.ctrl = null;

    this.input.addEventListener('input', () => { this.place = null; this.schedule(); });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
      if (e.key === 'Enter' && !this.list.hidden && this.results.length) {
        e.preventDefault();
        this.choose(this.results[0]);
      }
    });
    this.input.addEventListener('blur', () => setTimeout(() => this.hide(), 200));
    this.list.addEventListener('mousedown', (e) => e.preventDefault());
    this.list.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li) this.choose(this.results[Number(li.dataset.i)]);
    });
  }

  schedule() {
    clearTimeout(this.timer);
    const q = this.input.value.trim();
    if (q.length < 3) { this.hide(); return; }
    this.timer = setTimeout(() => this.search(q), 350);
  }

  async search(q) {
    this.ctrl?.abort();
    this.ctrl = new AbortController();
    try {
      this.results = await searchPlaces(q, { signal: this.ctrl.signal, near: this.getBias?.() });
      this.render();
    } catch (e) {
      if (e.name !== 'AbortError') console.warn(e);
    }
  }

  render() {
    this.list.replaceChildren(
      ...(this.results.length
        ? this.results.map((r, i) => h('li', { 'data-i': i }, r.label))
        : [h('li', { class: 'empty' }, 'No matches')]),
    );
    this.list.hidden = document.activeElement !== this.input;
  }

  choose(place) {
    this.set(place);
    this.hide();
    this.root.dispatchEvent(new CustomEvent('placechange', { bubbles: true }));
  }

  set(place) {
    this.place = place || null;
    this.input.value = place?.label ?? '';
  }

  hide() { this.list.hidden = true; }

  // Returns the chosen place, or looks up whatever was typed and takes the best match.
  async resolve() {
    if (this.place) return this.place;
    const q = this.input.value.trim();
    if (!q) return null;
    const results = await searchPlaces(q, { near: this.getBias?.() });
    if (!results.length) throw new Error(`Couldn't find "${q}".`);
    this.set(results[0]);
    return results[0];
  }
}
