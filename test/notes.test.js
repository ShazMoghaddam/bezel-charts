// Notes and spans (1.12.0): markers and shaded spans on every chart with an x-axis, and labels that don't overlap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, toSVG } from '../src/index.js';
import { parseNotes } from '../src/core/util.js';

const years = '2018,2019,2020,2021,2022,2023,2024';
const vals = '3,4,2,5,6,6.5,7';
const texts = (svg) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
const spans = (svg) => (svg.match(/fill-opacity="\.07"/g) || []).length;

test('a span is two points joined by ".."; a label with ".." in it is still a point', () => {
  assert.deepEqual(parseNotes({ notes: '2020:Shock;2022..2023:Rate rises' }, years.split(',')), [
    { i: 2, text: 'Shock' }, { i: 4, j: 5, text: 'Rate rises' },
  ]);
  // An end that isn't a label is a position, so 2099 is past the end and the span stops at the last point.
  assert.deepEqual(parseNotes({ notes: '2023..2022:Backwards;1..3:By position;2022..2099:To the end;2022..soon:Unknown' }, years.split(',')), [
    { i: 4, j: 5, text: 'Backwards' }, { i: 1, j: 3, text: 'By position' }, { i: 4, j: 2099, text: 'To the end' },
  ]);
  assert.deepEqual(parseNotes({ notes: 'a..b:Label' }, ['a..b', 'c']), [{ i: 0, text: 'Label' }]);
});

test('spans shade their stretch on every chart with an x-axis', () => {
  const o = { values: vals, labels: years, notes: '2022..2023:Rate rises' };
  for (const type of ['line', 'area', 'spark', 'bars', 'waterfall']) {
    const svg = toSVG(type, o);
    assert.equal(spans(svg), 1, type);
    assert.ok(texts(svg).includes('Rate rises'), type);
  }
  const combo = toSVG('combo', { values: vals, line: '1,2,3,2,3,4,5', labels: years, notes: '2020:Shock;2022..2023:Rate rises' });
  assert.equal(spans(combo), 1);
  assert.ok(texts(combo).includes('Shock') && texts(combo).includes('Rate rises'));
});

test('on bars, a span covers whole columns and labels get their own strip above the bars', () => {
  const plain = toSVG('bars', { values: vals, labels: years });
  const noted = toSVG('bars', { values: vals, labels: years, notes: '2022..2023:Rate rises' });
  const tallest = (svg) => Math.min(...[...svg.matchAll(/<rect x="[^"]+" y="([^"]+)" width="[^"]+" height="[^"]+" rx="[^"]+" fill="[^"]+" fill-opacity/g)].map((m) => +m[1]));
  assert.ok(tallest(noted) > tallest(plain) + 10, 'bars start lower to make room for the label');
  const rect = noted.match(/<rect x="([^"]+)" y="[^"]+" width="([^"]+)"[^>]*fill-opacity="\.07"/);
  assert.ok(+rect[2] > 2 * 40, 'two whole columns wide');
});

test('labels that would overlap move down a row instead of sitting on each other', () => {
  const svg = toSVG('line', { values: vals, labels: years, notes: '2020:A long first note;2021:A long second note;2022:And a third;2023:Fourth' });
  const labels = [...svg.matchAll(/<text x="([^"]+)" y="([^"]+)"[^>]*>(A long first note|A long second note|And a third|Fourth)<\/text>/g)]
    .map((m) => ({ x: +m[1], y: +m[2], half: m[3].length * 3 }));
  assert.equal(labels.length, 4);
  assert.ok(new Set(labels.map((l) => l.y)).size >= 2, 'some moved down a row');
  for (const a of labels) for (const b of labels) {
    if (a !== b && a.y === b.y) assert.ok(Math.abs(a.x - b.x) >= a.half + b.half, 'no two labels on one row overlap');
  }
  // Far apart, they share a row.
  const apart = toSVG('line', { values: vals, labels: years, notes: '2018:One;2024:Two' });
  const ya = [...apart.matchAll(/<text x="[^"]+" y="([^"]+)"[^>]*>(One|Two)<\/text>/g)].map((m) => +m[1]);
  assert.equal(new Set(ya).size, 1);
});

test('a long label is kept inside the chart', () => {
  const svg = toSVG('line', { values: vals, labels: years, notes: '2024:A rather long note right at the end', width: 360 });
  const m = svg.match(/<text x="([^"]+)"[^>]*text-anchor="middle"[^>]*>A rather long note right at the end<\/text>/);
  const half = 'A rather long note right at the end'.length * 6 / 2;
  assert.ok(+m[1] + half <= 360, 'right edge inside the tile');
});

test('scatter plots keep point notes and leave spans out', () => {
  const svg = toSVG('scatter', { x: '1,2,3', y: '1,2,3', notes: '1:Middle;0..2:Not on a scatter' });
  assert.ok(texts(svg).includes('Middle'));
  assert.ok(!texts(svg).includes('Not on a scatter'));
});

test('spans and markers sit behind the data, and point notes are unchanged', () => {
  const svg = render('line', { values: vals, labels: years, notes: '2022..2023:Rate rises' });
  assert.ok(svg.indexOf('fill-opacity=".07"') < svg.indexOf('stroke-width="2.5"'));
  assert.doesNotMatch(svg, /NaN|undefined/);
});
