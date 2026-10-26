// Renders every chart type across normal and awkward inputs and checks the SVG is clean and well formed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, toSVG, types } from '../src/index.js';
import { fit } from '../src/charts/scatter.js';

const year = Array.from({ length: 365 }, (_, i) => ((i * 7) % 11 > 6 ? i % 9 : 0)).join(',');

const CASES = {
  spark: [{}, { values: '5' }, { values: '17,16,15,15,13,12,14', heading: 'London', suffix: '°C', goal: 15, notes: '3:Dip', 'show-values': '' },
    { values: '-5,-3,0,4,-2', prefix: '£' }, { values: '1200000,1500000,1900000', compact: '' }, { values: [3, 3, 3], theme: 'light', frame: 'none' }],
  line: [{}, { values: '1,2,3|3,2,1', series: 'A,B', labels: 'Jan,Feb,Mar', goal: 2.5, notes: 'Feb:Launch day', prefix: '£' },
    { values: '4' }, { values: '-10,5,-3,8', straight: '' }, { values: '1,2,3', labels: 'a,b,c', zero: '', stat: 'last' }],
  bars: [{}, { values: '4,9,6,3,8,5,3', labels: 'M,T,W,T,F,S,S', stat: 'total', 'show-values': '', goal: 7 },
    { values: '-3,5,-8,2', labels: 'a,b,c,d', 'show-values': '' }, { values: '0,0,0' },
    { values: '820,640,410,300', labels: 'Python,JavaScript,A very long language name,Go', horizontal: '', goal: 500 },
    { values: '1,2,3', color: '#ff0000,#00ff00,#0000ff' },
    { values: '4,9,6|3,7,8', series: '2026,2025', labels: 'Q1,Q2,Q3', 'show-values': '', goal: 5 },
    { values: '4,9,6|3,7|1,2,3', horizontal: '', labels: 'North,South,East' },
    { values: '-2,4|3,-5', series: 'A very long series name,Another long series name,Third', 'show-values': '', width: 200 }],
  scatter: [{}, { x: '1,2,3,4,5', y: '2,4,5,4,6', trend: '', 'x-label': 'Hours', 'y-label': 'Score', notes: '4:Best' },
    { x: '1,2,3|2,4,6', y: '5,7,6|3,8,9', series: 'Team A,Team B', trend: '', goal: 6 },
    { x: '5', y: '5' }, { x: '1,1,1', y: '1,2,3', trend: '' }, { x: '1,2,3', y: '4' },
    { x: Array.from({ length: 300 }, (_, i) => i).join(','), y: Array.from({ length: 300 }, (_, i) => (i * 37) % 101).join(','), prefix: '£' }],
  ring: [{}, { values: '72', labels: 'Move' }, { values: '72,45,90', labels: 'Move,Focus,Sleep' }, { values: '150' }, { values: '0' }, { values: '3,5', max: 8, suffix: ' h' }],
  donut: [{}, { values: '0,0' }, { values: '40,25,20,15', labels: 'Rent,Food,Travel,Fun', prefix: '£' }, { values: '9,8,7,6,5,4,3,2' }, { values: '10' }],
  gauge: [{}, { values: '63', labels: 'CPU', zones: '60,85', goal: 80 }, { values: '120' }, { values: '-5', min: -10, max: 10, suffix: '°C' }, { values: '0' }],
  progress: [{}, { values: '72', labels: 'Upload' }, { values: '30,20,10', labels: 'Done,Review,Blocked', max: 100, goal: 75 },
    { values: '500,300', prefix: '£' }, { values: '200', max: 100 }, { values: '1,1,1,1,1,1,1,1' }],
  heatmap: [{}, { values: year, start: '2025-10-27', suffix: ' commits' }, { values: '1,2,3', start: '2026-03-01' },
    { values: '0,1,2,3,4', start: '2026-07-01', lang: 'fr-FR' }],
};

// A light structural check: every opened tag is closed in order.
function wellFormed(svg) {
  const stack = [];
  for (const [, close, name, selfClose] of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    if (selfClose) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name);
  }
  return stack.length === 0;
}

test('every type is covered by the cases', () => {
  assert.deepEqual(Object.keys(CASES).sort(), [...types].sort());
});

for (const [type, cases] of Object.entries(CASES)) {
  test(`${type} renders clean SVG for every case`, () => {
    cases.forEach((opts, i) => {
      for (const animate of [false, true]) {
        const svg = render(type, { ...opts, animate });
        assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${type}#${i}`);
        assert.doesNotMatch(svg, /NaN|undefined|Infinity|\[object/, `${type}#${i}`);
        assert.ok(wellFormed(svg), `${type}#${i} is well formed`);
        assert.doesNotMatch(svg, /(\s[\w-]+)="[^"]*"[^>]*\1="/, `${type}#${i} has a duplicated attribute`);
      }
    });
  });
}

test('empty data shows a friendly message instead of failing', () => {
  for (const type of types) assert.match(render(type, {}), /No data yet/);
});

test('toSVG strips tooltip targets and animation', () => {
  const svg = toSVG('bars', { values: '1,2,3', labels: 'a,b,c' });
  assert.doesNotMatch(svg, /bzc-hit|data-tip|<style>|@keyframes/);
});

test('labels and headings are escaped', () => {
  const svg = render('bars', { values: '1', labels: '<script>', heading: 'A & B' });
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /A &amp; B/);
});

test('number formatting uses prefix, suffix, decimals and a real minus sign', () => {
  const svg = toSVG('spark', { values: '-1.5,-2.25', prefix: '£', decimals: 2 });
  assert.match(svg, /−£2\.25/);
});

test('notes can point at a label or an index', () => {
  assert.match(render('line', { values: '1,2,3', labels: 'Jan,Feb,Mar', notes: 'Feb:Launch' }), /Launch/);
  assert.match(render('line', { values: '1,2,3', notes: '2:Peak' }), /Peak/);
});

test('donut groups more than six slices into Other', () => {
  assert.match(render('donut', { values: '9,8,7,6,5,4,3,2' }), />Other</);
});

test('unknown types throw a helpful error', () => {
  assert.throws(() => render('pie', {}), /Choose one of: spark/);
});

test('grouped bars draw one bar per series in each group', () => {
  const svg = toSVG('bars', { values: '4,9,6|3,7,8', series: 'A,B' });
  assert.equal((svg.match(/<rect [^>]*fill-opacity="1"/g) || []).length, 6);
  assert.match(svg, />A</);
});

test('trend line fit matches a known straight line', () => {
  const f = fit([1, 2, 3, 4], [3, 5, 7, 9]);
  assert.equal(f.slope, 2);
  assert.equal(f.intercept, 1);
  assert.equal(f.r, 1);
  assert.equal(fit([1, 1], [2, 3]), null);
});

test('scatter shows the correlation when a trend is asked for', () => {
  assert.match(render('scatter', { x: '1,2,3', y: '2,4,6', trend: '' }), /r = 1\.00/);
});

test('a long heatmap on a narrow tile keeps the most recent weeks', () => {
  const values = Array.from({ length: 365 }, (_, i) => (i === 364 ? 99 : 1)).join(',');
  const svg = toSVG('heatmap', { values, start: '2025-10-27', width: 300 });
  assert.match(svg, /in \d+ days/);
  assert.doesNotMatch(svg, /in 365 days/);
  assert.match(svg, /fill-opacity="1"/);
});
