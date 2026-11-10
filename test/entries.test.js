// Per-chart imports: a page that loads one chart gets that chart's tag and nothing else.
// node --test runs each test file in its own process, so these imports start from an empty registry.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseHTML } from 'linkedom';

let line;
before(async () => {
  const { window } = parseHTML('<!doctype html><html><body></body></html>');
  for (const key of ['window', 'document', 'customElements', 'HTMLElement', 'CustomEvent', 'Node']) globalThis[key] = window[key];
  line = await import('../src/entries/line.js');
});

const flush = () => new Promise((r) => setTimeout(r, 0));

test('importing one chart defines its tag and <bezel-chart>, and no others', () => {
  assert.ok(customElements.get('bezel-line'));
  assert.ok(customElements.get('bezel-chart'));
  for (const t of ['spark', 'area', 'bars', 'combo', 'histogram', 'boxplot', 'scatter', 'ring', 'donut', 'gauge', 'progress', 'heatmap']) assert.equal(customElements.get(`bezel-${t}`), undefined, t);
});

test('the entry also exports render and toSVG for its chart', () => {
  assert.match(line.toSVG('line', { values: '1,2,3' }), /^<svg/);
});

test('a chart that is not loaded says which import to add', async () => {
  assert.throws(() => line.render('bars', { values: '1,2' }), /the bars chart isn't loaded\. Add import 'bezel-charts\/bars'/);
  assert.throws(() => line.render('pie', {}), /unknown chart type "pie"/);
  document.body.innerHTML = '<bezel-chart type="donut" values="1,2"></bezel-chart>';
  await flush();
  assert.match(document.querySelector('bezel-chart').shadowRoot.innerHTML, /donut chart isn't loaded/);
});

test('loading a second chart later adds it, and loading one twice is harmless', async () => {
  await import('../src/entries/bars.js');
  await import('../src/entries/line.js');
  assert.ok(customElements.get('bezel-bars'));
  assert.match(line.render('bars', { values: '1,2' }), /^<svg/);
});

test('every chart has a built file, an export and a budget', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const size = readFileSync('scripts/size.mjs', 'utf8');
  const built = readdirSync('dist/charts');
  for (const t of ['spark', 'line', 'area', 'bars', 'combo', 'histogram', 'boxplot', 'scatter', 'ring', 'donut', 'gauge', 'progress', 'heatmap']) {
    assert.ok(built.includes(`${t}.js`), t);
    assert.equal(pkg.exports[`./${t}`], `./dist/charts/${t}.js`, t);
    assert.match(size, new RegExp(`\\b${t}: \\d+`), t);
  }
  // Chart files only load shared files from the same folder, so they work from any CDN path.
  for (const f of built) {
    const src = readFileSync(`dist/charts/${f}`, 'utf8');
    for (const m of src.matchAll(/\bimport\s*(?:\{[^}]*\}\s*from\s*)?"([^"]+)"/g)) assert.match(m[1], /^\.\/shared-[\w-]+\.js$/, f);
  }
});
