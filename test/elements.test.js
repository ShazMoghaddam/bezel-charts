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
    assert.equal(svg.getAttribute('role'), 'img');
    assert.match(svg.getAttribute('aria-label'), /^Test: /);
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
