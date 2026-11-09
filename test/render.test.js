// Renders every chart type across normal and awkward inputs and checks the SVG is clean and well formed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, toSVG, types } from '../src/index.js';
import { table } from '../src/render.js';
import { fit } from '../src/charts/scatter.js';

const year = Array.from({ length: 365 }, (_, i) => ((i * 7) % 11 > 6 ? i % 9 : 0)).join(',');

const CASES = {
  spark: [{}, { values: '5' }, { values: '17,16,15,15,13,12,14', heading: 'London', suffix: '°C', goal: 15, notes: '3:Dip', 'show-values': '' },
    { values: '-5,-3,0,4,-2', prefix: '£' }, { values: '1200000,1500000,1900000', compact: '' }, { values: [3, 3, 3], theme: 'light', frame: 'none' }],
  line: [{}, { values: '1,2,3|3,2,1', series: 'A,B', labels: 'Jan,Feb,Mar', goal: 2.5, notes: 'Feb:Launch day', prefix: '£' },
    { values: '4' }, { values: '-10,5,-3,8', straight: '' }, { values: '1,2,3', labels: 'a,b,c', zero: '', stat: 'last' }],
  area: [{}, { values: '5' }, { values: '1,3,2|2,2,4', series: 'A,B', labels: 'a,b,c', notes: 'b:Mid', goal: 3 }, { values: '1,3,2|2,2,4', stacked: '', 'show-values': '' },
    { values: '1,3,2|2,2,4', stacked: 'percent', patterns: '' }, { values: '-1,3,-2|2,-2,4', stacked: '', straight: '' }, { values: '0,0,0|0,0,0', stacked: 'percent' }],
  histogram: [{}, { values: '5' }, { values: '5,5,5' }, { values: '1,2,2,3,3,3,4,4,5', mark: 'mean,median' }, { values: '1,2,3|2,3,4,5', series: 'A,B', percent: '', patterns: '' },
    { values: '0.1,0.2,0.3,0.4', 'bin-width': '0.1' }, { values: '-5,-2.5,0,2.5,5', bins: 4 }, { values: '1,2,3', 'bin-width': '0.0000001' }],
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

test('a note on a number-like label finds the label, not a position', () => {
  const years = { values: '1,2,3', labels: '1976,1980,1984', notes: '1980:Boycott' };
  assert.match(render('line', years), /Boycott/);
  assert.match(render('line', { values: '1,2,3', labels: [1976, 1980, 1984], notes: '1980:Boycott' }), /Boycott/);
  assert.match(render('scatter', { x: '1,2,3', y: '4,5,6', labels: '1976,1980,1984', notes: '1984:Last' }), /Last/);
  assert.match(render('spark', { values: '1,2,3', labels: '1976,1980,1984', notes: '1976:First' }), /First/);
  // With no matching label a whole number is still a position
  assert.match(render('line', { values: '1,2,3', labels: '1976,1980,1984', notes: '2:Third' }), /Third/);
  // A label beats a position when both could match: "1" is the first point here, not the second
  const first = render('line', { values: '1,2,3', labels: '1,2,3', notes: '1:Note' });
  const atFirst = render('line', { values: '1,2,3', labels: 'a,b,c', notes: '0:Note' });
  const lineX = (svg) => svg.match(/<line x1="([\d.]+)"[^>]*stroke-dasharray="3 3"/)[1];
  assert.equal(lineX(first), lineX(atFirst));
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

test('stacked bars draw one column per group, with parts that add up', () => {
  const svg = render('bars', { values: '4,9,6|3,7,8', series: 'A,B', labels: 'Q1,Q2,Q3', stacked: '', static: '' });
  // The tile's own background rectangles have rounder corners, so only the bars match rx="3".
  const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="[\d.]+" rx="3" fill/g)];
  assert.equal(rects.length, 6);
  // The two parts of each column share an x position and width.
  for (let i = 0; i < 6; i += 2) assert.equal(rects[i][1], rects[i + 1][1]);
  assert.match(svg, /Q2\nA: 9\nB: 7\nTotal: 16/);
  assert.match(svg, /2 series stacked across 3 groups/);
});

test('stacked negative parts go below zero', () => {
  const svg = render('bars', { values: '4,-2|-3,6', series: 'A,B', stacked: '', static: '', 'show-values': '' });
  assert.match(svg, /Total: 1/);
  assert.match(svg, />4<\/text>|>1<\/text>/);
});

test('stacked horizontal bars show the total at the end of each row', () => {
  const svg = render('bars', { values: '18.4,0.1|6.6,33', series: 'Low,Very Low', labels: 'Barking,Southwark', stacked: '', horizontal: '', suffix: '%', decimals: 1 });
  assert.match(svg, />25.0%<\/text>/);
  assert.match(svg, />33.1%<\/text>/);
});

test('stacked is ignored with a single series', () => {
  const plain = render('bars', { values: '4,9,6', static: '' });
  assert.equal(render('bars', { values: '4,9,6', stacked: '', static: '' }), plain);
});

test('angled labels show every label when they would otherwise take turns', () => {
  const labels = Array.from({ length: 33 }, (_, i) => `Borough number ${i + 1}`);
  const o = { values: labels.map((_, i) => i + 1).join(','), labels: labels.join(','), width: 640 };
  const count = (svg) => (svg.match(/Borough number \d+</g) || []).length;
  assert.ok(count(render('bars', o)) < 33);
  const angled = render('bars', { ...o, 'angle-labels': '' });
  assert.equal(count(angled), 33);
  assert.match(angled, /transform="rotate\(-40 /);
});

test('angled labels change nothing when the labels already fit', () => {
  const o = { values: '1,2,3', labels: 'a,b,c' };
  assert.equal(render('bars', { ...o, 'angle-labels': '' }), render('bars', o));
});

test('angled labels shorten very long names', () => {
  const svg = render('bars', { values: Array(20).fill(1).join(','), labels: Array(20).fill('An extremely long label that goes on and on').join(','), 'angle-labels': '', width: 400 });
  assert.match(svg, />An extremely long label…</);
});

test('dash gives each line its own style, and the bare attribute hands them out in turn', () => {
  const svg = render('line', { values: '1,2|2,1|3,3|1,1', series: 'A,B,C,D', dash: '' });
  assert.match(svg, /stroke-dasharray="7 5"/);
  assert.match(svg, /stroke-dasharray="1 5"/);
  assert.match(svg, /stroke-dasharray="9 4 1 4"/);
  const listed = render('line', { values: '1,2|2,1', dash: 'dotted,nonsense' });
  assert.match(listed, /stroke-dasharray="1 5"/);
  assert.doesNotMatch(listed, /stroke-dasharray="7 5"/, 'unknown styles are solid');
});

test('dashed lines fade in, because the draw-in animation is itself a dash', () => {
  const svg = render('line', { values: '1,2', dash: 'dashed', animate: true });
  assert.doesNotMatch(svg, /class="bzc-d"/);
  assert.match(svg, /stroke-dasharray="7 5" class="bzc-a"/);
});

test('markers put a shape on each point and show in the legend', () => {
  const svg = render('line', { values: '1,2,3|3,2,1', series: 'A,B', markers: '' });
  assert.equal((svg.match(/<circle[^>]*r="3.5"/g) || []).length, 4, '3 points plus the legend sample');
  assert.equal((svg.match(/<rect[^>]*rx="1"/g) || []).length, 4);
  assert.match(svg, /<line x1="[^"]+" x2="[^"]+" y1="[^"]+" y2="[^"]+" stroke="[^"]+" stroke-width="2.5"/, 'a line sample in the legend');
});

test('markers thin out on long series but always mark the last point', () => {
  // 101 points: every third point (0, 3 … 99) plus the last one, 100.
  const values = Array.from({ length: 101 }, (_, i) => i).join(',');
  const count = (render('line', { values, markers: 'square' }).match(/rx="1"/g) || []).length;
  assert.equal(count, 35);
});

test('scatter groups take their own shapes', () => {
  const svg = render('scatter', { x: '1,2|3,4', y: '1,2|3,4', series: 'A,B', markers: 'diamond,triangle' });
  assert.equal((svg.match(/<path d="M[^"]*Z" fill/g) || []).length, 6, '4 points and 2 legend swatches');
  assert.doesNotMatch(svg, /<circle[^>]*fill-opacity=".85"/);
});

test('patterns fill grouped and stacked bars, and their legend swatches', () => {
  for (const extra of [{}, { stacked: '' }, { horizontal: '' }]) {
    const svg = render('bars', { values: '4,9|3,7|2,5', series: 'A,B,C', patterns: '', ...extra });
    assert.equal((svg.match(/<pattern /g) || []).length, 2, 'the first series stays solid');
    assert.match(svg, /<rect x="[^"]+" y="[^"]+" width="10" height="10" rx="2" fill="url\(#/);
  }
});

test('patterns are ignored on single series bars', () => {
  assert.equal(render('bars', { values: '4,9', patterns: '', static: '' }), render('bars', { values: '4,9', static: '' }));
});

test('the new style options are off by default and turn off with none', () => {
  const ids = (svg) => svg.replace(/bzc[gc][0-9a-z]+/g, 'id');
  for (const [type, o] of [['line', { values: '1,2|3,4' }], ['scatter', { x: '1,2', y: '3,4' }], ['bars', { values: '1,2|3,4' }]]) {
    const plain = ids(render(type, o));
    assert.equal(ids(render(type, { ...o, dash: 'none', markers: 'none', patterns: 'none' })), plain, type);
  }
});

test('every chart type has a data table', () => {
  for (const t of types) {
    const d = table(t, { values: '3,5,2', labels: 'a,b,c', x: '1,2', y: '3,4', start: '2026-01-01' });
    assert.ok(d.head.length >= 2, t);
    assert.ok(d.rows.length >= 1, t);
    d.rows.forEach((r) => assert.equal(r.length, d.head.length, t));
  }
});

test('data tables list every value, including ones the chart groups or drops', () => {
  assert.equal(table('donut', { values: '1,2,3,4,5,6,7,8' }).rows.length, 8);
  assert.equal(table('heatmap', { values: Array(365).fill(1).join(','), width: 200, start: '2026-01-01' }).rows.length, 365);
  assert.deepEqual(table('bars', { values: '1,2|3,4', stacked: '' }).head, ['Label', 'Series 1', 'Series 2', 'Total']);
  assert.deepEqual(table('scatter', { x: '1|2', y: '3|4', 'x-label': 'Hours' }).rows, [['#1', 'Group 1', '1', '3'], ['#2', 'Group 2', '2', '4']]);
});

const tips = (svg) => [...svg.matchAll(/data-tip="([^"]*)"/g)].map((m) => m[1].replace(/&#10;|\n/g, '|'));

test('area charts always include zero on the axis', () => {
  const svg = render('area', { values: '100,110,120' });
  assert.match(svg, />0<\/text>/);
  assert.doesNotMatch(render('line', { values: '100,110,120' }), />0<\/text>/, 'line charts can start above zero');
});

test('stacked areas pile up, list every part and the total, and write totals with show-values', () => {
  const svg = render('area', { values: '1,3|2,2', series: 'A,B', labels: 'x,y', stacked: '', 'show-values': '' });
  assert.deepEqual(tips(svg), ['x|A: 1|B: 2|Total: 3', 'y|A: 3|B: 2|Total: 5']);
  assert.match(svg, />3<\/text>/);
  assert.match(svg, />5<\/text>/);
});

test('negative parts stack below zero, as stacked bars do', () => {
  const svg = render('area', { values: '-2,-2|-3,-3', stacked: '' });
  assert.match(svg, />−5<\/text>|>−4<\/text>|>−6<\/text>/, 'the axis reaches below the larger negative total');
});

test('percent stacks scale each column to 100% and give each share in the tooltip', () => {
  const svg = render('area', { values: '1,3|3,1', series: 'A,B', labels: 'x,y', stacked: 'percent', prefix: '£' });
  assert.match(svg, />100%<\/text>/);
  assert.doesNotMatch(svg, />£100<\/text>/, 'percent ticks drop the prefix');
  assert.deepEqual(tips(svg), ['x|A: £1 (25%)|B: £3 (75%)|Total: £4', 'y|A: £3 (75%)|B: £1 (25%)|Total: £4']);
});

test('stacking needs several series', () => {
  const ids = (svg) => svg.replace(/bzc[gc][0-9a-z]+/g, 'id');
  assert.equal(ids(render('area', { values: '1,2,3', stacked: '' })), ids(render('area', { values: '1,2,3' })));
  assert.equal(ids(render('area', { values: '1,2,3', stacked: 'percent' })), ids(render('area', { values: '1,2,3' })));
});

test('areas take dashes, markers and patterns', () => {
  const svg = render('area', { values: '1,2|3,4', series: 'A,B', stacked: '', dash: '', markers: '', patterns: '' });
  assert.match(svg, /stroke-dasharray="7 5"/);
  assert.match(svg, /rx="1"/);
  assert.equal((svg.match(/<pattern /g) || []).length, 1);
});

test('area tables add a total column when stacked', () => {
  assert.deepEqual(table('area', { values: '1,2|3,4', stacked: 'percent' }).head, ['Label', 'Series 1', 'Series 2', 'Total']);
  assert.deepEqual(table('area', { values: '1,2|3,4' }).head, ['Label', 'Series 1', 'Series 2']);
});

const ranges = (o) => table('histogram', o).rows.map((r) => `${r[0]}: ${r[1]}`);

test('histograms count values into round ranges, lower edge in, upper edge out', () => {
  assert.deepEqual(ranges({ values: '0,10,20,30,40,50,60,70,80,90,100', 'bin-width': 10 }), [
    '0 to 10: 1', '10 to 20: 1', '20 to 30: 1', '30 to 40: 1', '40 to 50: 1', '50 to 60: 1', '60 to 70: 1', '70 to 80: 1', '80 to 90: 1', '90 to 100: 2',
  ], 'the largest value counts in the last range');
});

test('edges are round, so a value typed as 0.3 starts the 0.3 range', () => {
  assert.deepEqual(ranges({ values: '0.1,0.2,0.3,0.30000000000000004,0.4', 'bin-width': '0.1' }), ['0.1 to 0.2: 1', '0.2 to 0.3: 1', '0.3 to 0.4: 3'], 'and 0.4, the largest, counts in the last range');
  assert.deepEqual(ranges({ values: '1,1.25,1.5', 'bin-width': '0.25' }), ['1.00 to 1.25: 1', '1.25 to 1.50: 2']);
});

test('the automatic width is the round number nearest the ideal', () => {
  // 240 values give 9 ranges' worth of width: about 5.5 here, which rounds to 5, not up to 10.
  const values = Array.from({ length: 240 }, (_, i) => 40 + (i % 50)).join(',');
  assert.equal(table('histogram', { values }).rows.length, 10);
  const four = table('histogram', { values, bins: 4 }).rows.length;
  assert.ok(four >= 3 && four <= 6, `bins is roughly how many: ${four}`);
});

test('a very small bin-width falls back to automatic ranges instead of thousands of bars', () => {
  assert.ok(table('histogram', { values: '1,2,3', 'bin-width': '0.0000001' }).rows.length <= 50);
});

test('one repeated value makes one range', () => {
  assert.deepEqual(ranges({ values: '5,5,5' }), ['5 to 10: 3']);
});

test('several series share ranges, with a column each', () => {
  const t = table('histogram', { values: '1,2,3|2,3,4,5', series: 'A,B', bins: 4 });
  assert.deepEqual(t.head, ['Range', 'A', 'B']);
  assert.deepEqual(t.rows, [['1 to 2', '1', '0'], ['2 to 3', '1', '1'], ['3 to 4', '1', '1'], ['4 to 5', '0', '2']]);
});

test('histogram tooltips give the range, the count and the share', () => {
  const svg = render('histogram', { values: '1,2,2,3', 'bin-width': 1, series: '' });
  assert.deepEqual(tips(svg), ['1 to 2|1 (25%)', '2 to 3|3 (75%)'], '3 is the largest value, so it counts in the last range');
});

test('percent puts shares on the axis', () => {
  const svg = render('histogram', { values: '1,2,2,3', percent: '' });
  assert.match(svg, />\d+%<\/text>/);
});

test('mean and median lines are labelled with their values', () => {
  const svg = render('histogram', { values: '1,2,2,3,10', mark: 'mean,median' });
  assert.match(svg, />mean 3\.6<\/text>/);
  assert.match(svg, />median 2<\/text>/);
  assert.doesNotMatch(render('histogram', { values: '1,2', mark: 'mode' }), /mode/, 'unknown marks are ignored');
});

test('the histogram summary says how many values and where most are', () => {
  assert.match(render('histogram', { values: '1,2,2,2,3', heading: 'Ages', 'bin-width': 1 }), /aria-label="Ages: 5 values in 2 ranges from 1 to 3, most in 2 to 3"/);
});
