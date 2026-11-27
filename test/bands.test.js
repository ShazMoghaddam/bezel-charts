// Bands (1.12.0): fan charts on line charts, shaded ranges with an optional middle line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, toSVG } from '../src/index.js';
import { table } from '../src/render.js';

const ahead = ',,,15';
const fan = {
  values: '10,12,13,15,null,null', series: 'Revenue', labels: '2022,2023,2024,2025,2026,2027',
  'band-low': ahead + ',13,11|' + ahead + ',16,17', 'band-mid': ahead + ',14,13|' + ahead + ',17,19', 'band-high': ahead + ',15.5,16|' + ahead + ',18,21',
  'band-series': 'Bad,Good',
};
const shaded = (svg) => (svg.match(/fill-opacity="\.2"/g) || []).length;

test('attributes and a bands array draw the same chart', () => {
  const fromArray = toSVG('line', {
    values: [10, 12, 13, 15, null, null], series: ['Revenue'], labels: fan.labels,
    bands: [
      { name: 'Bad', low: [null, null, null, 15, 13, 11], mid: [null, null, null, 15, 14, 13], high: [null, null, null, 15, 15.5, 16] },
      { name: 'Good', low: [null, null, null, 15, 16, 17], mid: [null, null, null, 15, 17, 19], high: [null, null, null, 15, 18, 21] },
    ],
  });
  assert.equal(fromArray, toSVG('line', fan));
});

test('each band is shaded with a faint edge and a dashed middle line in its own dash', () => {
  const svg = toSVG('line', fan);
  assert.equal(shaded(svg), 2);
  assert.match(svg, /stroke-dasharray="7 5"/, 'first middle line dashed');
  assert.match(svg, /stroke-dasharray="1 5"/, 'second middle line dotted');
  assert.equal((svg.match(/stroke-opacity="\.5" stroke-width="1"/g) || []).length, 2);
});

test('bands sit under the lines, and the soft fill is off unless asked for', () => {
  const svg = toSVG('line', fan);
  assert.ok(svg.indexOf('fill-opacity=".2"') < svg.indexOf('stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"'));
  assert.doesNotMatch(svg, /linearGradient/);
  assert.match(toSVG('line', { ...fan, fill: 'first' }), /linearGradient/);
});

test('the axis takes in the bands', () => {
  const svg = toSVG('line', fan);
  assert.match(svg, />20<\/text>|>22<\/text>/, 'reaches past the highest band value of 21');
});

test('the legend has the line and each band, with a dash only where a band has a middle line', () => {
  const svg = toSVG('line', { ...fan, 'band-mid': ahead + ',14,13' });
  for (const name of ['Revenue', 'Bad', 'Good']) assert.match(svg, new RegExp('>' + name + '</text>'));
  const swatches = svg.match(/<rect[^>]+width="18" height="10"[^>]*\/>(<line[^>]*\/>)?/g);
  assert.equal(swatches.length, 2);
  assert.match(swatches[0], /<line/);
  assert.doesNotMatch(swatches[1], /<line/);
});

test('tooltips give each band range and its middle, and one number where a band narrows to a point', () => {
  const svg = render('line', fan);
  assert.match(svg, /data-tip="2026(&#10;|\n)Bad: 13 to 15.5, mid 14(&#10;|\n)Good: 16 to 18, mid 17"/);
  assert.match(svg, /data-tip="2025(&#10;|\n)Revenue: 15(&#10;|\n)Bad: 15(&#10;|\n)Good: 15"/);
  // A line that has stopped where the bands carry on isn't listed as "No data", nor counted as missing.
  assert.doesNotMatch(svg, /No data/);
  assert.match(svg, /aria-label="1 series and 2 bands over 6 points"/);
});

test('the data table adds low, middle and high columns, and runs as long as the bands', () => {
  const t = table('line', { values: '1,2', 'band-low': '1,1,1', 'band-high': '3,3,3', 'band-mid': ',2,2', 'band-series': 'Range' });
  assert.deepEqual(t.head, ['Label', 'Value', 'Range low', 'Range mid', 'Range high']);
  assert.deepEqual(t.rows, [['#1', '1', '1', '–', '3'], ['#2', '2', '1', '2', '3'], ['#3', '', '1', '2', '3']]);
  assert.deepEqual(table('line', { values: '1,2', 'band-low': '0,0', 'band-high': '3,3' }).head, ['Label', 'Value', 'Band 1 low', 'Band 1 high']);
});

test('band gaps break the shading, and band colours follow the lines or are set', () => {
  const svg = toSVG('line', { values: '5,6,7,8', 'band-low': '4,5,,7', 'band-high': '6,7,,9' });
  const d = svg.match(/<path d="([^"]+)" fill="[^"]+" fill-opacity="\.2"/)[1];
  assert.equal((d.match(/Z/g) || []).length, 2);
  assert.match(toSVG('line', { values: '1,2', 'band-low': '0,0', 'band-high': '3,3', 'band-color': '#ff6600' }), /fill="#ff6600" fill-opacity="\.2"/);
});

test('bands alone, with no line, still draw', () => {
  const svg = render('line', { 'band-low': '1,2,3', 'band-high': '3,4,5', 'band-mid': '2,3,4' });
  assert.match(svg, /0 series and 1 band over 3 points/);
  assert.equal(shaded(svg), 1);
});

test('bands work on a log scale and inside a fixed axis', () => {
  for (const o of [{ log: '' }, { min: 2, max: 8 }]) {
    const svg = render('line', { values: '1,10,100', 'band-low': '0.5,5,50', 'band-high': '2,20,200', ...o });
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
  }
});
