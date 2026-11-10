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
  line: [{ values: '1,2,3', dates: '2026-01-01,2026-01-02,2026-03-01' }, { values: '1,10,100', log: '' }, { values: '0,-1,5', log: '' }, { values: '1,2', min: 5, max: 1 },
    { values: '1,5,9', min: 2, max: 8, labels: 'a,b,c' }, { values: '3', dates: '2026-01-01T14:30' }, { values: '1,2', dates: 'nope,2026-01-01' }, {}, { values: '1,2,3|3,2,1', series: 'A,B', labels: 'Jan,Feb,Mar', goal: 2.5, notes: 'Feb:Launch day', prefix: '£' },
    { values: '4' }, { values: '-10,5,-3,8', straight: '' }, { values: '1,2,3', labels: 'a,b,c', zero: '', stat: 'last' }],
  area: [{}, { values: '5' }, { values: '1,3,2|2,2,4', series: 'A,B', labels: 'a,b,c', notes: 'b:Mid', goal: 3 }, { values: '1,3,2|2,2,4', stacked: '', 'show-values': '' },
    { values: '1,3,2|2,2,4', stacked: 'percent', patterns: '' }, { values: '-1,3,-2|2,-2,4', stacked: '', straight: '' }, { values: '0,0,0|0,0,0', stacked: 'percent' }],
  combo: [{}, { values: '5' }, { values: '1,2,3', line: '4,5,6' }, { values: '1,2|3,4', line: '10,20', stacked: '' }, { values: '-1,2', line: '5,5', 'line-zero': '' },
    { line: '1,2,3' }, { values: '1,2', line: '0.1,0.2|0.3,0.4', 'y-label': 'Sales', 'line-label': 'Rate', dash: '', markers: '', patterns: '' }],
  histogram: [{}, { values: '5' }, { values: '5,5,5' }, { values: '1,2,2,3,3,3,4,4,5', mark: 'mean,median' }, { values: '1,2,3|2,3,4,5', series: 'A,B', percent: '', patterns: '' },
    { values: '0.1,0.2,0.3,0.4', 'bin-width': '0.1' }, { values: '-5,-2.5,0,2.5,5', bins: 4 }, { values: '1,2,3', 'bin-width': '0.0000001' }],
  boxplot: [{}, { values: '5' }, { values: '5,5,5' }, { values: '1,2,3,4,100', mark: 'mean' }, { values: '1,2,3|4,5,6', series: 'A,B', horizontal: '' },
    { values: '1,2,3,4,100', whiskers: 'range', goal: 50 }, { values: '1,2|3,4|5,6', color: '#f00,#0f0,#00f' }],
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
  bullet: [{}, { values: '5' }, { values: '182,64,7.4', targets: '200,60,8', labels: 'Revenue,Margin,NPS', zones: '150,180|40,55|6,7', 'zone-labels': 'Poor,Fair,Good' },
    { values: '-3,4', targets: '2', zones: '0,5', max: 10 }, { values: '1,2,3', targets: '2', color: '#f00,#0f0,#00f', series: 'Sales,Plan' }, { values: '0,0' }, { values: '5,9', targets: '7,nope' }],
  waterfall: [{}, { values: '5' }, { values: '120,30,-12,-25,0', labels: 'Start,Sales,Costs,Tax,Profit', totals: 'Start,Profit', prefix: '£' },
    { values: '-5,-10,4,0', totals: '3', goal: -8 }, { values: '0,0,0' }, { values: '1,2,3', color: '#111,#222,#333', series: 'Up,Down,Sum', height: 120 },
    { values: Array.from({ length: 40 }, (_, i) => (i % 3 ? 1200 : -800)).join(','), totals: '39', compact: '' }],
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

const boxRow = (o) => table('boxplot', o).rows[0];

test('box plot quartiles match pandas', () => {
  // pandas: Series([1..9, 100]).quantile([.25, .5, .75]) is 3.25, 5.5, 7.75, and the mean is 14.5.
  assert.deepEqual(boxRow({ values: '1,2,3,4,5,6,7,8,9,100', mark: 'mean' }), ['Group 1', '10', '1', '3.25', '5.5', '7.75', '100', '1', '14.5']);
  assert.deepEqual(boxRow({ values: '10,20,30,40' }), ['Group 1', '4', '10', '17.5', '25', '32.5', '40', '0']);
  assert.deepEqual(boxRow({ values: '7' }), ['Group 1', '1', '7', '7', '7', '7', '7', '0']);
});

test('whiskers stop within 1.5 times the box, and further values are outliers', () => {
  const svg = render('boxplot', { values: '1,2,3,4,5,6,7,8,9,100', series: 'A' });
  assert.deepEqual(tips(svg), ['A|Median 5.5|Middle half 3.25 to 7.75|Range without outliers 1 to 9|1 outlier|n = 10']);
  assert.equal((svg.match(/<circle[^>]*fill="none"/g) || []).length, 1);
});

test('whiskers="range" reaches the lowest and highest values, with no outliers', () => {
  const svg = render('boxplot', { values: '1,2,3,4,5,6,7,8,9,100', whiskers: 'range' });
  assert.match(tips(svg)[0], /\|Range 1 to 100\|/);
  assert.doesNotMatch(svg, /fill="none"/);
  assert.equal(boxRow({ values: '1,2,3,100', whiskers: 'range' })[7], '0');
});

test('mark="mean" adds a diamond and the mean to the tooltip', () => {
  const svg = render('boxplot', { values: '1,2,3,10', mark: 'mean' });
  assert.match(svg, /<path d="M[^"]*Z" fill="[^"]+" stroke/);
  assert.match(tips(svg)[0], /\|Mean 4\|/);
});

test('box plots name each group, unless there is only one without a name', () => {
  assert.match(render('boxplot', { values: '1,2|3,4', series: 'North,South' }), />North<\/text>/);
  assert.doesNotMatch(render('boxplot', { values: '1,2,3' }), />Group 1<\/text>/);
  assert.match(render('boxplot', { values: '1,2,3|4,5,6', series: 'Engineering,Marketing', horizontal: '' }), />Engineering<\/text>/, 'names that fit are not shortened');
});

test('the box plot summary gives the medians', () => {
  assert.match(render('boxplot', { values: '1,2,3|4,5,6', heading: 'Pay' }), /aria-label="Pay: 2 groups, medians from 2 to 5"/);
  assert.match(render('boxplot', { values: '1,2,3,4' }), /aria-label="median 2.5, middle half 1.75 to 3.25"/);
});

const ticksOf = (svg, anchor) => [...svg.matchAll(new RegExp(`text-anchor="${anchor}"[^>]*>([^<]*)<`, 'g'))].map((m) => m[1]);

test('combo lines get a right axis with the same number of steps as the bars', () => {
  const svg = render('combo', { values: '182,214,236', line: '3.1,3.6,4.7', 'line-suffix': '%', 'line-decimals': 1 });
  const left = ticksOf(svg, 'end'), right = ticksOf(svg, 'start');
  assert.equal(left.length, right.length);
  assert.ok(right.every((t) => t.endsWith('%')), right.join(' '));
});

test('combo tooltips give each measure in its own units, with the total when stacked', () => {
  const svg = render('combo', { values: '10,20|5,5', line: '3.5,4', series: 'Online,Shops', 'line-series': 'Rate', labels: 'Jan,Feb', stacked: '', prefix: '£', 'line-suffix': '%' });
  assert.deepEqual(tips(svg), ['Jan|Online: £10|Shops: £5|Total: £15|Rate: 3.5%', 'Feb|Online: £20|Shops: £5|Total: £25|Rate: 4%']);
});

test('stacked combo bars pile up, with negative parts below zero', () => {
  const svg = render('combo', { values: '3,3|4,-2', line: '1,2', stacked: '' });
  const left = ticksOf(svg, 'end').map((t) => Number(t.replace('−', '-')));
  assert.ok(Math.max(...left) >= 7 && Math.min(...left) <= -2, left.join(' '));
});

test('each axis has a rule in its data colour, and titles when given', () => {
  const svg = render('combo', { values: '1,2', line: '3,4', 'y-label': 'Sales', 'line-label': 'Rate', theme: 'light' });
  assert.match(svg, /stroke="#6E70F0" stroke-width="2"\/>/);
  assert.match(svg, /stroke="#E2508C" stroke-width="2"\/>/);
  assert.match(svg, />Sales<\/text>/);
  assert.match(svg, />Rate<\/text>/);
});

test('combo without a line draws just the bars, with no right axis', () => {
  const svg = render('combo', { values: '1,2,3' });
  assert.equal(ticksOf(svg, 'start').length, 0);
  assert.match(svg, /aria-label="1 bar series and 0 lines over 3 points"/);
});

test('combo tables list the bars, the total and the lines', () => {
  const t = table('combo', { values: '1,2|3,4', line: '0.5,0.6', stacked: '', 'line-suffix': '%' });
  assert.deepEqual(t.head, ['Label', 'Bars 1', 'Bars 2', 'Total', 'Line']);
  assert.deepEqual(t.rows[0], ['#1', '1', '3', '4', '0.5%']);
});

const lineTicks = (svg) => [...svg.matchAll(/text-anchor="middle"[^>]*>([^<]*)</g)].map((m) => m[1]);

test('dates space points in time', () => {
  const svg = render('line', { values: '1,2,3', dates: '2026-01-01,2026-01-02,2026-03-01', straight: '', static: '' });
  const xs = [...svg.match(/<path d="M([\d.]+),[\d.]+L([\d.]+),[\d.]+L([\d.]+),/).slice(1, 4)].map(Number);
  assert.ok(xs[1] - xs[0] < (xs[2] - xs[1]) / 20, `one day is a sliver of two months: ${xs}`);
});

test('date ticks choose their own step and label it to suit', () => {
  const months = lineTicks(render('line', { values: '1,2,3,4', dates: '2026-01-01,2026-02-10,2026-04-20,2026-06-30', width: 700 }));
  assert.deepEqual(lineTicks(render('line', { values: '1,2,3,4', dates: '2026-01-01,2026-02-10,2026-04-20,2026-06-30' })), ['Jan 2026', 'Mar', 'May'], 'narrower charts take bigger steps');
  assert.deepEqual(months.slice(0, 3), ['Jan 2026', 'Feb', 'Mar']);
  const years = lineTicks(render('line', { values: '1,2', dates: '2010-01-01,2026-01-01', width: 400 }));
  assert.ok(years.every((t) => /^\d{4}$/.test(t)), years.join(' '));
  const hours = lineTicks(render('line', { values: '1,2', dates: '2026-11-10T06:00,2026-11-10T18:00' }));
  assert.ok(hours.includes('12:00'), hours.join(' '));
  const days = lineTicks(render('line', { values: '1,2', dates: '2026-11-02,2026-11-09', width: 700 }));
  assert.ok(days.includes('5 Nov'), days.join(' '));
  assert.ok(lineTicks(render('line', { values: '1,2', dates: '2026-11-02,2026-11-09', width: 700, lang: 'en-US' })).includes('Nov 5'));
});

test('dated tooltips and tables give the date, with the time when there is one', () => {
  const svg = render('line', { values: '1,2', dates: '2026-01-05,2026-01-06' });
  assert.deepEqual(tips(svg), ['5 Jan 2026|1', '6 Jan 2026|2']);
  assert.deepEqual(tips(render('line', { values: '1,2', dates: '2026-01-05T09:30,2026-01-05T10:00' })), ['5 Jan 2026 09:30|1', '5 Jan 2026 10:00|2']);
  assert.deepEqual(table('line', { values: '1,2', dates: '2026-01-05,2026-01-06', labels: 'Launch' }).rows, [['Launch', '1'], ['6 Jan 2026', '2']]);
  assert.equal(table('area', { values: '1,2', dates: '2026-01-05,2026-01-06' }).head[0], 'Date');
});

test('invalid or too few dates leave the points evenly spaced', () => {
  const plain = render('line', { values: '1,2,3' }).replace(/bzc[gc][0-9a-z]+/g, 'id');
  for (const dates of ['nope,2026-01-01,2026-01-02', '2026-01-01,2026-01-02']) {
    assert.equal(render('line', { values: '1,2,3', dates }).replace(/bzc[gc][0-9a-z]+/g, 'id'), plain, dates);
  }
});

test('min and max fix the value axis, and the series is clipped to it', () => {
  const svg = render('line', { values: '40,90,60', min: 50, max: 80 });
  const ticks = ticksOf(svg, 'end');
  assert.equal(ticks[0], '50');
  assert.equal(ticks[ticks.length - 1], '80');
  assert.match(svg, /<clipPath id="[^"]+"><rect/);
  assert.match(svg, /<g clip-path="url\(#/);
  assert.match(tips(svg)[1], /90/, 'the tooltip keeps the true value');
  assert.doesNotMatch(render('line', { values: '1,2', min: 5, max: 1 }), /clipPath/, 'a min above the max is ignored');
});

test('areas take max, and a min at or below zero, but never cut their base', () => {
  assert.match(render('area', { values: '62,104,77', max: 100 }), /clipPath/);
  assert.doesNotMatch(render('area', { values: '62,77', min: 50 }), /clipPath/);
});

test('log scales step in powers of ten, with 2 and 5 between when the range is short', () => {
  assert.deepEqual(ticksOf(render('line', { values: '120,2400000', log: '' }), 'end'), ['100', '1,000', '10k', '100k', '1m', '10m']);
  assert.deepEqual(ticksOf(render('line', { values: '3,40', log: '' }), 'end'), ['1', '2', '5', '10', '20', '50', '100']);
});

test('zero and negative values leave gaps on a log scale, but keep their tooltips', () => {
  const svg = render('line', { values: '5,0,12,-1,44', log: '', static: '' });
  assert.equal((svg.match(/<path d="[^"]*"/)[0].match(/M/g) || []).length, 3, 'three separate runs');
  const live = render('line', { values: '5,0,12', log: '' });
  assert.deepEqual(tips(live), ['#1|5', '#2|0', '#3|12']);
  assert.doesNotMatch(render('line', { values: '0,-2', log: '' }), /NaN/, 'with nothing positive, the axis stays linear');
});


test('waterfall totals stand on zero and show the running total, changes float from the last level', () => {
  const o = { values: '120,30,-12,0', labels: 'Start,Sales,Costs,Profit', totals: 'Start,Profit', prefix: '£' };
  const t = table('waterfall', o);
  assert.deepEqual(t.head, ['Step', 'Change', 'Running total']);
  assert.deepEqual(t.rows, [['Start', 'Total', '£120'], ['Sales', '+£30', '£150'], ['Costs', '−£12', '£138'], ['Profit', 'Total', '£138']]);
  const svg = render('waterfall', o);
  assert.match(svg, /ends at £138 after 4 steps/);
  assert.deepEqual(tips(svg).slice(0, 3), ['Start|Total £120', 'Sales|Change +£30|Running total £150', 'Costs|Change −£12|Running total £138']);
  // Signed labels on the bars, so rises and falls don't rely on colour.
  for (const tag of ['£120', '+£30', '−£12', '£138']) assert.ok(svg.includes('>' + tag + '<'), tag);
});

test('waterfall totals by position, a label that looks like a number wins, and colours follow rise, fall, total', () => {
  assert.deepEqual(table('waterfall', { values: '5,-2,0', totals: '2' }).rows.map((r) => r[1]), ['+5', '−2', 'Total']);
  assert.deepEqual(table('waterfall', { values: '5,-2,0', labels: '2024,2,2026', totals: '2' }).rows.map((r) => r[1]), ['+5', 'Total', '0']);
  const svg = render('waterfall', { values: '5,-2,0', totals: '2', color: '#111111,#222222,#333333', series: 'Up,Down,Net' });
  for (const c of ['#111111', '#222222', '#333333']) assert.ok(svg.includes(`fill="${c}"`), c);
  for (const n of ['Up', 'Down', 'Net']) assert.ok(svg.includes('>' + n + '<'), n);
});

test('waterfall labels hide together when any would overlap its neighbour', () => {
  const many = Array.from({ length: 60 }, (_, i) => (i % 2 ? 123456 : -98765)).join(',');
  assert.doesNotMatch(render('waterfall', { values: many, width: 300 }), />\+123,456</);
  assert.match(render('waterfall', { values: '1,2', width: 300 }), />\+2</);
});

test('bullet rows compare the actual with the target and name the band it falls in', () => {
  const o = { values: '182,64', targets: '200,60', labels: 'Revenue,Margin', zones: '150,180|40,55', zoneLabels: 'Poor,Fair,Good' };
  const t = table('bullet', o);
  assert.deepEqual(t.head, ['Measure', 'Actual', 'Target', 'Difference', 'Band']);
  assert.deepEqual(t.rows, [['Revenue', '182', '200', '−18', 'Good'], ['Margin', '64', '60', '+4', 'Good']]);
  const svg = render('bullet', o);
  assert.match(svg, /1 of 2 measures at or above target/);
  assert.equal(tips(svg)[0], 'Revenue|Actual 182|Target 200|Difference −18|Band Good');
});

test('bullet with one target for every row, unnamed bands, and no targets at all', () => {
  assert.deepEqual(table('bullet', { values: '40,90', targets: '80', zones: '50,75' }).rows, [['Measure 1', '40', '80', '−40', '1 of 3'], ['Measure 2', '90', '80', '+10', '3 of 3']]);
  const plain = render('bullet', { values: '3,4' });
  assert.match(plain, /2 measures</);
  assert.doesNotMatch(plain, /Target/);
  assert.deepEqual(table('bullet', { values: '3,4' }).head, ['Measure', 'Actual']);
});
