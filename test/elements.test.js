// Smoke tests: every element registers, renders into its shadow root, labels itself and reacts to attribute changes.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let api;
before(async () => {
  const { window } = parseHTML('<!doctype html><html><body></body></html>');
  for (const key of ['window', 'document', 'customElements', 'HTMLElement', 'CustomEvent', 'Node']) {
    globalThis[key] = window[key];
  }
  api = await import('../src/index.js');
});

afterEach(() => {
  document.body.innerHTML = '';
});

const flush = () => new Promise((r) => setTimeout(r, 0));

function mount(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  return host.firstElementChild;
}

test('all ten tags are defined', () => {
  for (const t of [...api.types, 'chart']) assert.ok(customElements.get(`bezel-${t}`), `bezel-${t}`);
});

test('each tag renders an accessible SVG', async () => {
  for (const t of api.types) {
    const el = mount(`<bezel-${t} values="3,5,2" labels="a,b,c" heading="Test"></bezel-${t}>`);
    await flush();
    const svg = el.shadowRoot.querySelector('svg');
    assert.ok(svg, t);
    // The focusable wrapper is named once, and the SVG inside is hidden so it isn't read a second time.
    const box = el.shadowRoot.querySelector('.c');
    assert.equal(box.getAttribute('role'), 'group');
    assert.equal(box.getAttribute('aria-roledescription'), 'chart');
    assert.match(box.getAttribute('aria-label'), /^Test: /);
    assert.equal(svg.getAttribute('aria-hidden'), 'true');
    assert.equal(svg.getAttribute('role'), null);
  }
});

test('changing an attribute re-renders', async () => {
  const el = mount('<bezel-bars values="1,2"></bezel-bars>');
  await flush();
  el.setAttribute('values', '1,2,3,4');
  await flush();
  assert.equal(el.shadowRoot.querySelectorAll('rect[fill-opacity="1"], rect[fill-opacity="0.5"]').length, 4);
});

test('bezel-chart switches type by attribute', async () => {
  const el = mount('<bezel-chart type="ring" values="40"></bezel-chart>');
  await flush();
  assert.match(el.shadowRoot.innerHTML, /40%/);
  el.setAttribute('type', 'gauge');
  await flush();
  assert.match(el.shadowRoot.innerHTML, /<path d="M[^"]*A[^"]* 0 0 1 /);
});

test('toSVG returns a clean static image', async () => {
  const el = mount('<bezel-spark values="1,4,2"></bezel-spark>');
  await flush();
  const svg = el.toSVG();
  assert.match(svg, /^<svg/);
  assert.doesNotMatch(svg, /data-tip|@keyframes/);
});

test('a bad type shows an error message instead of throwing', async () => {
  const el = mount('<bezel-chart type="pie" values="1"></bezel-chart>');
  await flush();
  assert.match(el.shadowRoot.innerHTML, /unknown chart type/);
});

test('live charts leave out the SVG title so browsers do not show a second tooltip', async () => {
  const el = mount('<bezel-bars heading="Sales" values="1,2"></bezel-bars>');
  await flush();
  assert.doesNotMatch(el.shadowRoot.innerHTML, /<title>/);
  assert.match(el.shadowRoot.querySelector('.c').getAttribute('aria-label'), /^Sales: /);
  assert.match(el.toSVG(), /<title>Sales: /);
});

const key = (el, k) => {
  // linkedom has no KeyboardEvent, so a plain event carries the key.
  const e = new window.Event('keydown', { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'key', { value: k });
  el.shadowRoot.querySelector('.c').dispatchEvent(e);
};
const current = (el) => el.shadowRoot.querySelector('.k')?.getAttribute('data-tip');
const said = (el) => el.shadowRoot.querySelector('[aria-live]').textContent;

test('charts take keyboard focus and describe how to use it', async () => {
  const el = mount('<bezel-bars values="4,9,6" labels="Mon,Tue,Wed"></bezel-bars>');
  await flush();
  const box = el.shadowRoot.querySelector('.c');
  assert.equal(box.getAttribute('tabindex'), '0');
  assert.match(el.shadowRoot.getElementById(box.getAttribute('aria-describedby')).textContent, /arrow keys/);
});

test('arrow keys, Home and End step through the values and read them out', async () => {
  const el = mount('<bezel-bars values="4,9,6" labels="Mon,Tue,Wed"></bezel-bars>');
  await flush();
  key(el, 'ArrowRight');
  assert.equal(current(el), 'Mon: 4');
  assert.equal(said(el), 'Mon: 4. 1 of 3');
  key(el, 'ArrowRight');
  key(el, 'ArrowRight');
  key(el, 'ArrowRight');
  assert.equal(current(el), 'Wed: 6', 'stops at the last value');
  key(el, 'Home');
  assert.equal(current(el), 'Mon: 4');
  key(el, 'End');
  assert.equal(current(el), 'Wed: 6');
  key(el, 'ArrowUp');
  assert.equal(current(el), 'Tue: 9');
  key(el, 'Escape');
  assert.equal(current(el), undefined);
  assert.equal(said(el), '');
});

test('the left arrow starts from the last value', async () => {
  const el = mount('<bezel-line values="1,2|3,4" series="A,B" labels="x,y"></bezel-line>');
  await flush();
  key(el, 'ArrowLeft');
  assert.equal(said(el), 'y, A: 2, B: 4. 2 of 2');
});

test('heatmaps move a week with left and right, and a day with up and down', async () => {
  const el = mount('<bezel-heatmap values="1,2,3,4,5,6,7,8,9,10" start="2026-01-05"></bezel-heatmap>');
  await flush();
  key(el, 'ArrowDown');
  assert.match(current(el), /5 Jan 2026: 1$/);
  key(el, 'ArrowRight');
  assert.match(current(el), /12 Jan 2026: 8$/);
  key(el, 'ArrowUp');
  assert.match(current(el), /11 Jan 2026: 7$/);
});

test('donuts visit each slice once', async () => {
  const el = mount('<bezel-donut values="1,2,3" labels="a,b,c"></bezel-donut>');
  await flush();
  key(el, 'End');
  assert.equal(said(el), 'c: 3 (50%). 3 of 3');
});

test('no-tooltips removes the tab stop', async () => {
  const el = mount('<bezel-spark values="1,2,3"></bezel-spark>');
  await flush();
  el.setAttribute('no-tooltips', '');
  await flush();
  const box = el.shadowRoot.querySelector('.c');
  assert.equal(box.getAttribute('tabindex'), null);
  assert.equal(box.getAttribute('aria-describedby'), null);
});

test('a hidden table gives screen readers every number', async () => {
  const el = mount('<bezel-bars heading="Sales" values="4,9|3,7" series="2026,2025" labels="Q1,Q2" prefix="£"></bezel-bars>');
  await flush();
  const t = el.shadowRoot.querySelector('table');
  assert.equal(t.querySelector('caption').textContent, 'Sales');
  assert.deepEqual([...t.querySelectorAll('thead th')].map((c) => c.textContent), ['Label', '2026', '2025']);
  assert.deepEqual([...t.querySelectorAll('tbody tr')].map((r) => r.textContent), ['Q1£4£3', 'Q2£9£7']);
  assert.equal(t.querySelector('tbody th').getAttribute('scope'), 'row');
  assert.ok(t.parentElement.classList.contains('sr'));
});

test('the tooltip is hidden from screen readers, which get the announcements instead', async () => {
  const el = mount('<bezel-spark values="1,2,3"></bezel-spark>');
  await flush();
  const tip = el.shadowRoot.querySelector('.tip');
  assert.equal(tip.getAttribute('aria-hidden'), 'true');
  assert.equal(tip.getAttribute('role'), null);
});

test('the data table is left out of exported SVGs', async () => {
  const el = mount('<bezel-bars values="1,2"></bezel-bars>');
  await flush();
  assert.doesNotMatch(el.toSVG(), /<table|data-skip/);
});

test('dash, markers and patterns work as attributes', async () => {
  const line = mount('<bezel-line values="1,2|3,4" dash markers></bezel-line>');
  const bars = mount('<bezel-bars values="1,2|3,4" patterns></bezel-bars>');
  await flush();
  assert.match(line.shadowRoot.innerHTML, /stroke-dasharray="7 5"/);
  assert.match(line.shadowRoot.innerHTML, /rx="1"/);
  assert.match(bars.shadowRoot.innerHTML, /<pattern /);
});

test('every option the renderers read is an observed attribute', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { ATTRIBUTES } = await import('../src/element.js');
  const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const used = new Set();
  for (const f of readdirSync('src/charts')) {
    for (const m of readFileSync(`src/charts/${f}`, 'utf8').matchAll(/\bo\.([a-zA-Z]+)/g)) used.add(kebab(m[1]));
  }
  // animate and auto-theme are set by the element itself, not by attributes.
  for (const name of used) if (!['animate', 'auto-theme'].includes(name)) assert.ok(ATTRIBUTES.includes(name), name);
});
