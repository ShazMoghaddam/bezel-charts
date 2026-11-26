// Missing values (1.12.0): a gap is never drawn as 0. Each chart breaks, skips or says "No data" instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, toSVG, types } from '../src/index.js';
import { table } from '../src/render.js';
import { nums, series, statOf } from '../src/core/util.js';

const str = (v) => nums(v).map(String);

test('blanks, null, NaN, dashes and words are gaps; spaces and a trailing comma are not', () => {
  assert.deepEqual(str('4,,6'), ['4', 'NaN', '6']);
  assert.deepEqual(str(' 1 , ,2 '), ['1', 'NaN', '2']);
  assert.deepEqual(str('null,1,NaN,-,abc'), ['NaN', '1', 'NaN', 'NaN', 'NaN']);
  assert.deepEqual(str('1,2,3,'), ['1', '2', '3']);
  assert.deepEqual(str('1;2 3'), ['1', '2', '3']);
  assert.deepEqual(str(',4'), ['NaN', '4']);
  assert.deepEqual(str(''), []);
  assert.deepEqual(str([1, null, undefined, '', 2, 'x', '3']), ['1', 'NaN', 'NaN', 'NaN', '2', 'NaN', '3']);
  assert.deepEqual(series('1,,3|null,2').map((s) => s.map(String)), [['1', 'NaN', '3'], ['NaN', '2']]);
});

test('the headline number skips gaps', () => {
  assert.deepEqual(statOf([NaN, 2, NaN, 5, NaN], { stat: 'last' }), { val: 5, delta: 3 });
  assert.equal(statOf([NaN, NaN], { stat: 'total' }), null);
});

// Every chart with a gap in every place it can take one: clean SVG, no NaN and no undefined anywhere.
const GAPS = {
  spark: [{ values: '3,,5,null,4' }, { values: ',2' }, { values: '1,' }, { values: 'null,null' }, { values: '1,,3', notes: '1:x;2:y', 'show-values': '', stat: 'average' }],
  line: [{ values: '1,2,,4|3,,2', series: 'A,B', notes: '2:Gap' }, { values: '1,,100', log: '' }, { values: 'null' }, { values: '5,,6', markers: '', 'show-values': '' },
    { values: '1,,3', dates: '2026-01-01,2026-01-02,2026-01-03' }, { values: 'null,4,null' }],
  area: [{ values: '1,,3|2,2,2', stacked: '' }, { values: '1,,3|2,1,1', stacked: 'percent', 'show-values': '' }, { values: '1,,3', markers: '' }, { values: ',' }],
  bars: [{ values: '4,,6', 'show-values': '', goal: 5 }, { values: '4,,6', horizontal: '' }, { values: '1,2|3,', stacked: '', 'show-values': '' },
    { values: '1,2|,4', stacked: '', horizontal: '' }, { values: 'null,null' }, { values: '1,|2,3', series: 'A,B' }],
  combo: [{ values: '1,,3', line: '4,,6' }, { values: '1,2|,3', line: 'null,null', stacked: '' }, { values: 'null', line: 'null' }],
  waterfall: [{ values: '100,20,,-10,0', totals: '0,4' }, { values: 'null,null' }, { values: '-5,,-3' }],
  histogram: [{ values: '1,2,,3' }, { values: 'null|1,2', percent: '' }, { values: 'null,null' }],
  boxplot: [{ values: '1,2,,9' }, { values: '1,2,3|null,null', series: 'A,B' }, { values: 'null' }],
  scatter: [{ x: '1,2,,4', y: '3,,5,6', notes: '3:Last', trend: '' }, { x: 'null', y: '1' }],
  ring: [{ values: '40,,70' }, { values: 'null' }, { values: '40,null', max: 200 }],
  donut: [{ values: '3,,2' }, { values: '3,,2,1,1,1,1,1' }, { values: 'null' }],
  gauge: [{ values: 'null' }, { values: '50', zones: '30,,70' }],
  progress: [{ values: '30,,20' }, { values: 'null' }, { values: '30,null', max: 100, goal: 40 }],
  bullet: [{ values: '182,,7.4', targets: '200,60,', zones: '150,180|40,,55|6,7' }, { values: 'null', targets: '5' }],
  heatmap: [{ values: '1,,3,0', start: '2026-01-01' }, { values: 'null,null', start: '2026-01-01' }],
};

test('every chart type has gap cases', () => {
  for (const t of types.filter((t) => t !== 'chart')) assert.ok(GAPS[t], t);
});

for (const [type, cases] of Object.entries(GAPS)) {
  test(`${type} draws gaps cleanly`, () => {
    for (const o of cases) {
      for (const svg of [render(type, o), render(type, { ...o, animate: true }), toSVG(type, o)]) {
        assert.doesNotMatch(svg, /NaN|undefined|Infinity/, JSON.stringify(o));
        assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
      }
      const t = table(type, o);
      assert.doesNotMatch(JSON.stringify(t), /NaN|undefined/, JSON.stringify(o));
    }
  });
}

const paths = (svg) => [...svg.matchAll(/<path d="([^"]+)" fill="none"/g)].map((m) => m[1]);

test('a line breaks at a gap instead of dropping to 0', () => {
  const svg = toSVG('line', { values: '5,6,,8,9' });
  const d = paths(svg)[0];
  assert.equal((d.match(/M/g) || []).length, 2, 'two pieces');
  assert.match(render('line', { values: '5,6,,8,9' }), /data-tip="#3(&#10;|\n)No data"/);
  // With a gap, the lowest value is 5, so the axis doesn't reach down to 0.
  assert.doesNotMatch(svg, />0<\/text>/);
});

test('a value on its own between gaps gets a dot', () => {
  const svg = toSVG('line', { values: '1,2,,5,,7,8' });
  assert.equal((svg.match(/r="2.5"/g) || []).length, 1);
});

test('the soft fill follows each piece of a broken line', () => {
  const svg = toSVG('line', { values: '1,2,,4,5' });
  const fill = svg.match(/<path d="([^"]+)" fill="url/)[1];
  assert.equal((fill.match(/Z/g) || []).length, 2);
});

test('a stacked area breaks the whole stack where any part is missing', () => {
  const svg = toSVG('area', { values: '1,2,,4,5|1,1,1,1,1', stacked: '' });
  for (const m of svg.matchAll(/<path d="([^"]+)" fill="#/g)) assert.equal((m[1].match(/Z/g) || []).length, 2);
  assert.match(render('area', { values: '1,,3|2,2,2', stacked: '' }), /Total: No data/);
});

test('a missing bar gets a dash on the zero line, and click details say null', () => {
  const svg = render('bars', { values: '4,,6' });
  assert.equal((svg.match(/fill-opacity="(1|0\.5)"/g) || []).length, 2);
  assert.match(svg, /stroke-dasharray="2 3"/);
  assert.match(svg, /data-i="1" data-v=""/);
  assert.match(svg, /data-tip="#2: No data"/);
});

test('a stacked total with a missing part is unknown, not a smaller number', () => {
  const svg = render('bars', { values: '1,2|3,null', stacked: '', 'show-values': '' });
  assert.match(svg, /Total: No data/);
  assert.deepEqual(table('bars', { values: '1,2|3,null', stacked: '' }).rows[1], ['#2', '2', '–', '–']);
});

test('a missing waterfall step keeps the level, and later totals say what they leave out', () => {
  const o = { values: '100,20,,-10,0', labels: 'Start,A,B,C,End', totals: 'Start,End' };
  const svg = render('waterfall', o);
  assert.match(svg, /No data<\/text>/, 'legend entry');
  assert.match(svg, /stroke-dasharray="3 3"/);
  assert.match(svg, /B&#10;No data&#10;Running total 120, unchanged|B\nNo data\nRunning total 120, unchanged/);
  assert.match(svg, /Total 110(&#10;|\n)Excludes 1 missing step/);
  assert.match(svg, /ends at 110 after 5 steps, 1 missing/);
  assert.deepEqual(table('waterfall', o).rows.map((r) => r.slice(1)), [
    ['Total', '100'], ['+20', '120'], ['No data', '120'], ['−10', '110'], ['Total', '110 (excludes 1 missing)'],
  ]);
});

test('a blank total still shows the running total', () => {
  const o = { values: '100,20,,-10,null', labels: 'Start,A,B,C,End', totals: 'Start,End' };
  assert.deepEqual(table('waterfall', o).rows[4], ['End', 'Total', '110 (excludes 1 missing)']);
});

test('histograms, box plots and scatter plots leave gaps out and say so', () => {
  assert.match(render('histogram', { values: '1,2,,3,null' }), /3 values in .*2 missing left out/);
  assert.match(render('boxplot', { values: '1,2,,9' }), /2 missing|1 missing left out/);
  const sc = render('scatter', { x: '1,2,,4', y: '3,,5,6', labels: 'a,b,c,d', notes: 'd:Last' });
  assert.match(sc, /2 points, 2 missing left out/);
  // Labels and notes still count by the original position.
  assert.match(sc, /data-tip="d&#10;|data-tip="d\n/);
  assert.match(sc, />Last<\/text>/);
});

test('parts charts show "No data" for the missing one', () => {
  assert.match(render('ring', { values: '40,,70', labels: 'A,B,C' }), />No data<\/text>/);
  assert.match(render('progress', { values: '30,,20', labels: 'A,B,C' }), />No data<\/tspan>/);
  const d = render('donut', { values: '3,,2', labels: 'A,B,C' });
  assert.doesNotMatch(d, />B<\/text>/);
  assert.match(d, /across 2 parts, 1 missing/);
  assert.deepEqual(table('donut', { values: '3,,2', labels: 'A,B,C' }).rows[1], ['B', '–', '–']);
  assert.match(render('bullet', { values: '1,,3', targets: '2,2,2', labels: 'A,B,C' }), /B(&#10;|\n)Actual: no data/);
  assert.match(render('gauge', { values: 'null' }), /No data yet/);
});

test('a missing heatmap day is an outline, not a grey 0', () => {
  const svg = render('heatmap', { values: '1,,0', start: '2026-01-01' });
  assert.equal((svg.match(/fill="none" stroke=/g) || []).length, 1);
  assert.match(svg, /Fri, 2 Jan 2026: No data/);
  assert.match(svg, /1 in 3 days, 1 missing/);
});

test('data from JavaScript can carry null', () => {
  assert.equal(toSVG('line', { values: [1, null, 3] }), toSVG('line', { values: '1,,3' }));
  assert.equal(toSVG('bars', { values: [[1, null], [NaN, 2]] }), toSVG('bars', { values: '1,null|NaN,2' }));
});
