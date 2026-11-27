// Treemap (1.12.0): parts of a whole as tiles sized by value, with a colour per group.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, toSVG } from '../src/index.js';
import { table } from '../src/render.js';
import { squarify } from '../src/charts/treemap.js';

const o = { values: '31,22,18,9,7', labels: 'Apple,Microsoft,Nvidia,JPMorgan,Visa', groups: 'Tech,Tech,Tech,Finance,Finance' };
const tiles = (svg) => [...svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" rx="[^"]+" fill="([^"]+)"[^>]*data-tip="([^"]*)"/g)]
  .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], fill: m[5], tip: m[6] }));

test('squarify fills the space exactly, with areas in proportion and tiles near square', () => {
  const rects = squarify([6, 6, 4, 3, 2, 2, 1], 0, 0, 600, 400);
  const area = rects.reduce((a, r) => a + r[2] * r[3], 0);
  assert.ok(Math.abs(area - 240000) < 1e-6);
  rects.forEach((r, i) => assert.ok(Math.abs(r[2] * r[3] - [6, 6, 4, 3, 2, 2, 1][i] / 24 * 240000) < 1e-6));
  for (const r of rects) assert.ok(Math.max(r[2] / r[3], r[3] / r[2]) < 3, 'no long slivers');
  // Nothing overlaps.
  for (const a of rects) for (const b of rects) {
    if (a === b) continue;
    const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
    assert.ok(ox <= 1e-9 || oy <= 1e-9);
  }
});

test('tile areas follow the values, and each group has one colour', () => {
  const t = tiles(render('treemap', o));
  assert.equal(t.length, 5);
  const area = (name) => { const x = t.find((r) => r.tip.includes(name)); return (x.w + 2) * (x.h + 2); };
  assert.ok(Math.abs(area('Apple') / area('Visa') - 31 / 7) < 0.35);
  const fill = (name) => t.find((r) => r.tip.includes(name)).fill;
  assert.equal(fill('Apple'), fill('Nvidia'));
  assert.equal(fill('JPMorgan'), fill('Visa'));
  assert.notEqual(fill('Apple'), fill('Visa'));
});

test('a group stays together, biggest first, and the arrow keys go biggest to smallest', () => {
  const t = tiles(render('treemap', o));
  assert.deepEqual(t.map((r) => r.tip.split('&#10;')[0].split('\n')[0]), ['Tech · Apple', 'Tech · Microsoft', 'Tech · Nvidia', 'Finance · JPMorgan', 'Finance · Visa']);
  const tech = t.slice(0, 3), fin = t.slice(3);
  const right = Math.max(...tech.map((r) => r.x + r.w)), left = Math.min(...fin.map((r) => r.x));
  const bottom = Math.max(...tech.map((r) => r.y + r.h)), topF = Math.min(...fin.map((r) => r.y));
  assert.ok(left >= right || topF >= bottom, 'the Finance block sits beside or below the Tech block');
});

test('without groups every item has its own colour and no legend', () => {
  const svg = render('treemap', { values: '5,3,2', labels: 'a,b,c' });
  assert.equal(new Set(tiles(svg).map((r) => r.fill)).size, 3);
  assert.doesNotMatch(svg, /<circle/);
});

test('the legend lists groups in the order they first appear', () => {
  const svg = toSVG('treemap', { values: '1,9,5', labels: 'a,b,c', groups: 'Small,Big,Small' });
  assert.ok(svg.indexOf('>Small</text>') < svg.indexOf('>Big</text>'));
});

test('labels fit their tile, with value and share when there is room', () => {
  const svg = toSVG('treemap', { ...o, prefix: '$', suffix: 'bn' });
  assert.match(svg, />Apple<\/text>/);
  assert.match(svg, />\$31bn · 36%<\/text>/);
  const tiny = toSVG('treemap', { values: '1000,1', labels: 'Huge,Tiny', width: 200, height: 100 });
  assert.doesNotMatch(tiny, />Tiny<\/text>/, 'too small for a label');
  const long = toSVG('treemap', { values: '1,1', labels: 'An extremely long company name,B', width: 200 });
  assert.match(long, /…<\/text>/);
});

test('text is white or dark, whichever stands out more on the tile', () => {
  const dark = toSVG('treemap', { values: '1', labels: 'Navy', color: '#1a237e' });
  assert.match(dark, /fill="#ffffff"[^>]*>Navy/);
  const light = toSVG('treemap', { values: '1', labels: 'Lemon', color: '#fff59d' });
  assert.match(light, /fill="#14131a"[^>]*>Lemon/);
});

test('zero, negative and missing values are left out and counted', () => {
  const svg = render('treemap', { values: '5,0,-2,,3', labels: 'a,b,c,d,e' });
  assert.equal(tiles(svg).length, 2);
  assert.match(svg, /total 8 across 2 items, largest a \(63%\), 3 not shown/);
});

test('tooltips, summary and data table', () => {
  const svg = render('treemap', o);
  assert.match(svg, /data-tip="Tech · Apple(&#10;|\n)31 \(36%\)"/);
  assert.match(svg, /aria-label="total 87 across 5 items in 2 groups, largest Apple \(36%\)"/);
  assert.deepEqual(table('treemap', { values: '3,0,1', labels: 'a,b,c', groups: 'X,,Y' }), {
    head: ['Item', 'Group', 'Value', 'Share'], rows: [['a', 'X', '3', '75%'], ['b', 'Other', '0', 'not shown'], ['c', 'Y', '1', '25%']],
  });
  assert.match(render('treemap', { values: '1,1,1,97' }), /largest #4 \(97%\)/);
  assert.match(render('treemap', { values: '1,99' }), /\(1%\)/);
});

test('the bezel-treemap element and its own entry', async () => {
  const mod = await import('../src/entries/treemap.js');
  assert.equal(typeof mod.render, 'function');
  assert.match(mod.render('treemap', o), /^<svg/);
});
