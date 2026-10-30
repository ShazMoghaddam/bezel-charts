// Writes the parity fixtures for the Python package: the real JavaScript output for a
// wide set of inputs. The Python tests then check they draw exactly the same SVG.
// Run with `npm run fixtures` after changing a chart, and commit python/tests/fixtures.
import { mkdirSync, writeFileSync } from 'node:fs';
import { render, toSVG } from '../src/index.js';
import { fmt, niceScale } from '../src/core/util.js';

const out = new URL('../python/tests/fixtures/', import.meta.url);
mkdirSync(out, { recursive: true });

// Gradient ids are random, so they are replaced with stable ones in both languages before comparing.
const stable = (svg) => {
  const ids = new Map();
  return svg.replace(/bzcg[0-9a-z]+/g, (id) => {
    if (!ids.has(id)) ids.set(id, `bzcg-${ids.size + 1}`);
    return ids.get(id);
  });
};

const long = Array.from({ length: 120 }, (_, i) => Math.round(50 + 40 * Math.sin(i / 7) + (i % 5) * 3.3) / 10);

export const CASES = {
  spark: [
    {},
    { values: '5' },
    { values: '17,16,15,15,13,12,14', heading: 'London', suffix: '°C', goal: 15, notes: '3:Dip', 'show-values': '' },
    { values: '-5,-3,0,4,-2', prefix: '£' },
    { values: '1200000,1500000,1900000', compact: '' },
    { values: [3, 3, 3], theme: 'light', frame: 'none' },
    { values: '0,0,0' },
    { values: '0.001,0.002,0.0015', decimals: 4 },
    { values: long, width: 640, heading: 'Long run', stat: 'average', straight: '' },
    { values: '10,8,9,7', delta: 'inverse', 'delta-label': 'this week', heading: 'Errors <&> "quotes"' },
    { values: '3,5,4', delta: 'none', theme: 'light', background: '#fafafa', corners: 8 },
    { values: '12.5,13.75,11.125', labels: 'Mon,Tue,Wed', notes: 'Tue:Peak;Wed:Drop;9:Out of range', color: '#ff6600,#0066ff' },
    { values: '99999,123456,999950', 'show-values': '', stat: 'max', width: 200 },
    { values: '1,2', stat: 'nonsense', goal: '-4', 'goal-label': 'Floor', height: 120 },
    { values: '4,5,6', lang: 'en-US', compact: '', stat: 'total', frame: 'none', background: '#000' },
  ],
  line: [
    {},
    { values: '1,2,3|3,2,1', series: 'A,B', labels: 'Jan,Feb,Mar', goal: 2.5, notes: 'Feb:Launch day', prefix: '£' },
    { values: '4' },
    { values: '-10,5,-3,8', straight: '' },
    { values: '1,2,3', labels: 'a,b,c', zero: '', stat: 'last' },
    { values: [[1, 2, 3], [4, 5, 6], [2, 2, 2], [9, 1, 5], [3, 3, 8], [7, 7, 7], [1, 9, 4]], series: 'One,Two,Three,Four,Five,Six,Seven', width: 300 },
    { values: long, labels: long.map((_, i) => `Day ${i + 1}`), width: 720, height: 240, heading: 'Daily', theme: 'light' },
    { values: '1200,15000,98000,250000', labels: 'Q1,Q2,Q3,Q4', 'show-values': '', suffix: ' users' },
    { values: '0.12,0.18,0.15', decimals: 2, suffix: '%', stat: 'average', 'delta-label': 'avg' },
    { values: '5,5,5', labels: 'x', notes: '0:Start;2:End' },
    { values: '3,1,4,1,5,9,2,6|2,7,1,8', series: 'Pi', animate: true },
    { values: '-0.5,-0.25,-0.75', labels: 'a,,c', frame: 'none', corners: 0, color: '#123456' },
    { values: '1,2|3', series: ',Named', goal: 10, 'goal-label': 'Target', background: '#101010' },
    { values: '1e-7,2e-7,3e-7' },
    { values: '1000000,2000000,1500000', labels: 'Jan 2026,Feb 2026,Mar 2026', compact: '', lang: 'en-GB' },
  ],
};

for (const [type, cases] of Object.entries(CASES)) {
  const rows = cases.map((options) => ({
    options,
    render: stable(render(type, { ...options, animate: false })),
    animated: stable(render(type, { ...options, animate: true })),
    static: stable(toSVG(type, options)),
  }));
  writeFileSync(new URL(`${type}.json`, out), JSON.stringify(rows, null, 1) + '\n');
}

// Number formatting and scales on their own, so a mismatch points straight at the cause.
const values = [0, 1, -1, 0.5, 1.005, 2.675, 0.125, 9.995, 12.345, 99.95, 100.5, 1234.5, 9999, 10000, 15500,
  99999, 123456, 999949, 999950, 1e6, 1250000, 1e9, 1.55e12, 1e15, 1e18, 12345678901234567000, 0.000001, 1e-7,
  -2.5, -1234567.891, 123456789.125, 42, 3.14159, 1 / 3, 2 / 3];
const options = [{}, { decimals: 0 }, { decimals: 2 }, { decimals: '3' }, { decimals: 9 }, { compact: '' },
  { prefix: '£', suffix: ' kWh' }, { lang: 'en-US', compact: '' }, { decimals: 'x' }];
const fmtRows = [];
for (const v of values) for (const o of options) for (const short of [false, true]) {
  fmtRows.push({ v, o, short, out: fmt(v, o, short) });
}
const ranges = [[0, 0], [0, 1], [5, 5], [-5, -5], [1, 2], [0.1, 0.35], [-10, 8], [1200, 250000], [0, 98000],
  [1e-7, 3e-7], [-0.75, -0.25], [0.12, 0.18], [3, 3.0001], [-1e6, 1e9]];
const scaleRows = ranges.map(([a, b]) => ({ min: a, max: b, out: niceScale(a, b, 4) }));
const strings = [...values, 1e21, 1.5e-7, 123e-20, 0.1 + 0.2, 1e300, -1e-300, 5e-324, 100, 1e20, 1.7976931348623157e308]
  .map((v) => [v, String(v)]);
writeFileSync(new URL('numbers.json', out), JSON.stringify({ fmt: fmtRows, scales: scaleRows, strings }, null, 1) + '\n');

console.log('Wrote fixtures for', Object.keys(CASES).join(', '), 'plus numbers.json');
