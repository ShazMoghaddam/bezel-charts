// Writes the parity fixtures for the Python package: the real JavaScript output for a
// wide set of inputs. The Python tests then check they draw exactly the same SVG.
// Run with `npm run fixtures` after changing a chart, and commit python/tests/fixtures.
import { mkdirSync, writeFileSync } from 'node:fs';
import { render, toSVG } from '../src/index.js';
import { fmt } from '../src/core/util.js';
import { niceScale } from '../src/core/series.js';

const out = new URL('../python/tests/fixtures/', import.meta.url);
mkdirSync(out, { recursive: true });

// Gradient and clip path ids are random, so they are replaced with stable ones in both languages before comparing.
const stable = (svg) => {
  const ids = new Map();
  return svg.replace(/bzc[gc][0-9a-z]+/g, (id) => {
    if (!ids.has(id)) ids.set(id, `bzcg-${ids.size + 1}`);
    return ids.get(id);
  });
};

const year = Array.from({ length: 365 }, (_, i) => ((i * 7) % 11 > 6 ? i % 9 : 0)).join(',');
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
    { values: '5,6,7', labels: '1976,1980,1984', notes: '1980:Boycott;2:Third;9:Out of range' },
    { values: '5,6,7', labels: '1,2,3', notes: '1:First' },
    { values: '3,1,4,1,5,9,2,6|2,7,1,8', series: 'Pi', animate: true },
    { values: '-0.5,-0.25,-0.75', labels: 'a,,c', frame: 'none', corners: 0, color: '#123456' },
    { values: '1,2|3', series: ',Named', goal: 10, 'goal-label': 'Target', background: '#101010' },
    { values: '1e-7,2e-7,3e-7' },
    { values: '1000000,2000000,1500000', labels: 'Jan 2026,Feb 2026,Mar 2026', compact: '', lang: 'en-GB' },
    // Dashes and markers (1.2.0).
    { values: '1,2,3|3,2,1|2,3,1|1,1,2', series: 'A,B,C,D', labels: 'Jan,Feb,Mar', dash: '', markers: '' },
    { values: '4,6,5|2,3,4', series: 'Plan,Actual', dash: 'solid,dashed', animate: true },
    { values: '1,3,2|2,2,2', dash: 'dotted,nonsense', markers: 'triangle,none', theme: 'light', background: '#fafafa' },
    { values: long, markers: 'diamond', width: 640 },
    { values: '5', markers: 'square', dash: 'dashdot' },
    { values: '1,2|3,4', series: 'A,B', dash: 'none', markers: 'none' },
    { values: [[1, 2], [3, 4]], series: ['A', 'B'], dash: ['dashed', 'dotted'], markers: 'auto', frame: 'none' },
  ],
  area: [
    {},
    { values: '5' },
    { values: '4' , labels: 'Only', heading: 'One' },
    { values: '1,3,2,5,4', labels: 'Mon,Tue,Wed,Thu,Fri', heading: 'Single', suffix: ' h', goal: 3, notes: 'Wed:Mid', 'show-values': '' },
    { values: '420,460,510,580|380,400,430,450', series: '2026,2025', labels: 'Jan,Feb,Mar,Apr', compact: '' },
    { values: '1,3,2|2,2,4|1,1,1', series: 'A,B,C', labels: 'a,b,c', stacked: '', 'show-values': '' },
    { values: '1,3,2|2,2,4|1,1,1', series: 'A,B,C', stacked: 'percent', patterns: '', theme: 'light' },
    { values: '60,55,50|30,32,35|10,13,15', stacked: 'percent', prefix: '£', decimals: 1, lang: 'en-US' },
    { values: '-1,3,-2|2,-2,4', stacked: '', straight: '', goal: -1, prefix: '£' },
    { values: '1,2|3,4|5', stacked: '', dash: '', markers: '', animate: true },
    { values: '0,0,0|0,0,0', stacked: 'percent' },
    { values: long, labels: long.map((_, i) => `Day ${i + 1}`), width: 720, height: 240, markers: 'square' },
    { values: '1,2,3|3,2,1', patterns: 'stripes,dots', dash: 'dotted', background: '#101010', frame: 'none' },
    { values: '1,2|3,4', stacked: 'nonsense' },
    { values: '1200000,2000000|500000,800000', stacked: '', stat: 'last', compact: '', 'delta-label': 'this year' },
  ],
  combo: [
    {},
    { values: '5' },
    { line: '1,2,3' },
    { values: '182,214,236,268,251,290', line: '3.1,3.3,3.2,3.6,3.4,3.8', series: 'Sales', 'line-series': 'Conversion', labels: 'Jan,Feb,Mar,Apr,May,Jun', prefix: '£', suffix: 'k', 'line-suffix': '%', 'line-decimals': 1, 'y-label': 'Sales', 'line-label': 'Conversion' },
    { values: '40,52,61,58|20,25,22,30|10,8,12,15', line: '12,14,13,17|8,9,11,10', series: 'Online,Shops,Phone', 'line-series': 'Margin,Returns', labels: 'Q1,Q2,Q3,Q4', stacked: '', 'line-suffix': '%', patterns: '', markers: '', theme: 'light' },
    { values: '5,-3,4,-2,6', line: '100,104,101,108,112', 'line-zero': '', animate: true },
    { values: '5,6,7|4,5,8', line: '0.2,0.25,0.31', series: '2025,2026', labels: 'North,South,East', dash: '', straight: '' },
    { values: '1,2,3', line: '7,7,7' },
    { values: '1,2,3', line: '0,0,0' },
    { values: '1200000,1500000,2100000', line: '0.0012,0.0015,0.0009', compact: '', 'line-decimals': 4 },
    { values: long.slice(0, 40), line: long.slice(0, 40).map((v) => v * 100), labels: long.slice(0, 40).map((_, i) => `D${i + 1}`), width: 720, markers: 'circle' },
    { values: '3,4|5,6', line: '1,2|3,4|5,6', stacked: '', 'line-prefix': '$', background: '#101014', frame: 'none', 'y-label': 'Units' },
  ],
  histogram: [
    {},
    { values: '5' },
    { values: '5,5,5' },
    { values: '0,0,0' },
    { values: '-0.004,-0.004' },
    { values: '0,10,20,30,40,50,60,70,80,90,100', 'bin-width': 10, heading: 'Edges' },
    { values: '0.1,0.2,0.3,0.30000000000000004,0.4', 'bin-width': '0.1' },
    { values: '1,1.25,1.5,2.75', 'bin-width': '0.25', mark: 'mean,median' },
    { values: '-5,-2.5,0,2.5,5', bins: 4, suffix: ' °C' },
    { values: long, mark: 'median', theme: 'light', width: 720 },
    { values: long, bins: 50, animate: true },
    { values: long.map((v) => v * 1000), compact: '', percent: '' },
    { values: `${long.join(',')}|${long.map((v) => v * 1.3 + 7).join(',')}`, series: 'Before,After', mark: 'mean', patterns: '' },
    { values: '1,2,3|2,3,4,5', series: 'A,B', bins: 4, percent: '', lang: 'en-US', decimals: 1 },
    { values: '0.001,0.0021,0.0034,0.0049', heading: 'Tiny' },
    { values: '1,2,3', 'bin-width': '0.0000001' },
    { values: '1e6,2e6,3.5e6', 'bin-width': 500000, prefix: '£' },
    { values: '72,85,91,64,77,88,95,58,81,79', mark: 'mean,median,mode', background: '#101014', frame: 'none' },
  ],
  boxplot: [
    {},
    { values: '5' },
    { values: '5,5,5' },
    { values: '7,7,7,7,30' },
    { values: '1,2,3,4,5,6,7,8,9,100', mark: 'mean', heading: 'Spread' },
    { values: '10,20,30,40', whiskers: 'range' },
    { values: `${long.join(',')}|${long.map((v) => v * 1.4 - 2).join(',')}|${long.slice(0, 30).join(',')}`, series: 'North,South,West', mark: 'mean', prefix: '£', suffix: 'k' },
    { values: '1,2,3|4,5,6|7,8,30', series: 'Engineering department,Marketing,Product', horizontal: '', goal: 5, theme: 'light' },
    { values: '1,2,3|4,5,6', horizontal: '', whiskers: 'range', color: '#6E70F0,#D63F7C', animate: true },
    { values: '0.1,0.2,0.30000000000000004,0.4', decimals: 2 },
    { values: '-5,-3,-1,0,2,40', goal: -2, 'goal-label': 'Floor', compact: '' },
    { values: Array.from({ length: 9 }, (_, i) => `${20 + i},${24 + i},${30 + i}`).join('|'), series: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun,Holiday,Average week', width: 360 },
    { values: '1200000,1500000,2100000,9000000', compact: '', mark: 'mean', background: '#101014', frame: 'none' },
  ],
  bars: [
    {},
    { values: '4,9,6,3,8,5,3', labels: 'M,T,W,T,F,S,S', stat: 'total', 'show-values': '', goal: 7 },
    { values: '-3,5,-8,2', labels: 'a,b,c,d', 'show-values': '' },
    { values: '0,0,0' },
    { values: '820,640,410,300', labels: 'Python,JavaScript,A very long language name,Go', horizontal: '', goal: 500 },
    { values: '1,2,3', color: '#ff0000,#00ff00,#0000ff' },
    { values: '4,9,6|3,7,8', series: '2026,2025', labels: 'Q1,Q2,Q3', 'show-values': '', goal: 5 },
    { values: '4,9,6|3,7|1,2,3', horizontal: '', labels: 'North,South,East' },
    { values: '-2,4|3,-5', series: 'A very long series name,Another long series name,Third', 'show-values': '', width: 200 },
    { values: '5' },
    { values: '12,12,7', highlight: 'none', theme: 'light', heading: 'Ties' },
    { values: long.slice(0, 40), labels: long.slice(0, 40).map((_, i) => `Week ${i + 1}`), width: 640 },
    { values: '1500000,2300000,900000', labels: 'UK,US,DE', compact: '', 'show-values': '', prefix: '£' },
    { values: '3,1,2', horizontal: '', 'show-values': '', frame: 'none', background: '#fff8e7', series: 'Only one' },
    { values: '-4,-2,-9', horizontal: '', labels: 'x,y,z', goal: -3 },
    { values: '40,25,20,15', labels: '😀 Happy,Neutral,Sad,🙃', horizontal: '', width: 240 },
    { values: '0.25,0.5,0.75', decimals: 1, suffix: '%', height: 200, stat: 'max', 'delta-label': 'top' },
    { values: [[1, 2, 3, 4], [4, 3, 2, 1], [2, 2, 2, 2], [3, 1, 4, 1]], series: 'A,B,C,D', labels: 'Q1,Q2,Q3,Q4', theme: 'light' },
    { values: '7,3,5', labels: 'a,b', notes: '1:ignored', straight: '' },
    { values: '4,9,6|3,7,8', series: '2026,2025', labels: 'Q1,Q2,Q3', stacked: '', 'show-values': '' },
    { values: '4,-2,6|-3,7,1|2,2,-5', series: 'A,B,C', labels: 'x,y,z', stacked: '', 'show-values': '', goal: 6 },
    { values: '18.4,16.6,0.1|6.6,24.8,33', series: 'Low or higher,Very Low', labels: 'Barking and Dagenham,Newham,Southwark', stacked: '', horizontal: '', suffix: '%', decimals: 1 },
    { values: '4,9|3,7,8', series: 'Short,Long', stacked: '', horizontal: '', static: '' },
    { values: '0,0|0,0', series: 'A,B', stacked: '' },
    { values: '5', stacked: '' },
    { values: long.slice(0, 33), labels: long.slice(0, 33).map((_, i) => `A long borough name ${i + 1}`), 'angle-labels': '', width: 640, height: 300 },
    { values: long.slice(0, 33).join(',') + '|' + long.slice(33, 66).join(','), series: 'One,Two', labels: long.slice(0, 33).map((_, i) => `Place ${i + 1} with a very long name indeed`), stacked: '', 'angle-labels': '', width: 900, height: 340, theme: 'light' },
    { values: '1,2,3', labels: 'a,b,c', 'angle-labels': '' },
    { values: '-3,5,-8,2', labels: 'Negative one,Positive one,Negative two,Positive two', 'angle-labels': '', 'show-values': '', width: 120 },
    // Patterns (1.2.0).
    { values: '4,9,6|3,7,8|2,5,4|1,2,3|6,1,2', series: 'A,B,C,D,E', labels: 'Q1,Q2,Q3', patterns: '' },
    { values: '4,9,6|3,7,8', series: '2026,2025', labels: 'Q1,Q2,Q3', stacked: '', patterns: 'dots,stripes', 'show-values': '' },
    { values: '4,9|3,7|2,5', horizontal: '', patterns: 'grid', labels: 'North,South' },
    { values: '4,9|-3,7', stacked: '', horizontal: '', patterns: 'auto', background: '#fff8e7', theme: 'light' },
    { values: '4,9,6', patterns: '' },
    { values: '1,2|3,4', patterns: 'none' },
  ],
  scatter: [
    {},
    { x: '1,2,3,4,5', y: '2,4,5,4,6', trend: '', 'x-label': 'Hours', 'y-label': 'Score', notes: '4:Best' },
    { x: '1,2,3|2,4,6', y: '5,7,6|3,8,9', series: 'Team A,Team B', trend: '', goal: 6 },
    { x: '5', y: '5' },
    { x: '1,1,1', y: '1,2,3', trend: '' },
    { x: '1,2,3', y: '4' },
    { x: Array.from({ length: 300 }, (_, i) => i).join(','), y: Array.from({ length: 300 }, (_, i) => (i * 37) % 101).join(','), prefix: '£' },
    { x: '2,4,6,8', y: '9,7,5,3', trend: '', theme: 'light', 'y-label': 'Errors <&> "x"', zero: '' },
    { x: '0.1,0.2,0.35', y: '1200,25000,98000', compact: '', decimals: 1, trend: '', labels: 'a,b,c', notes: 'b:Middle' },
    { x: '1,2,3,4', y: '5,5,5,5', trend: '', width: 520, height: 260, heading: 'Flat', animate: true },
    { x: '1,2,3|4,5,6|7,8,9', y: '1,4,9|16,25,36|49,64,81', trend: '', frame: 'none', background: '#111', color: '#f00,#0f0,#00f' },
    { x: '-5,-1,3,7', y: '-2,0,1,-4', 'x-label': 'Change', labels: 'w,x,y,z', notes: '0:First;z:Last' },
    { x: '1,2,3', y: '4,5,6', labels: '1976,1980,1984', notes: '1984:Last' },
    { x: '10000,20000,30000', y: '1,2,3', lang: 'en-US', trend: '' },
    { x: '1,2,3,4,5,6', y: '6,5,4,3,2,1|1,2', series: 'Down', trend: '' },
    // Markers (1.2.0).
    { x: '1,2,3|2,4|5,6', y: '5,7,6|3,8|1,2', series: 'A,B,C', markers: '', trend: '' },
    { x: '1,2,3', y: '3,1,2', markers: 'square', animate: true },
    { x: '1,2|3,4', y: '1,2|3,4', markers: 'diamond,none', theme: 'light' },
  ],
  ring: [
    {},
    { values: '72', labels: 'Move' },
    { values: '72,45,90', labels: 'Move,Focus,Sleep' },
    { values: '150' },
    { values: '0' },
    { values: '3,5', max: 8, suffix: ' h' },
    { values: '64.5', heading: 'Battery', theme: 'light', width: 220 },
    { values: '10,20,30,40,50,60,70,80,90,100', width: 480 },
    { values: '1200,800', max: 2000, prefix: '£', labels: 'Spent,A very long label that will be cut short' },
    { values: '-20,40', labels: 'Below,Above', stat: 'average', animate: true },
    { values: '55', max: 0, frame: 'none', color: '#ff6600' },
    { values: '33.333,66.667', decimals: 1, height: 200, background: '#101418' },
  ],
  donut: [
    {},
    { values: '0,0' },
    { values: '40,25,20,15', labels: 'Rent,Food,Travel,Fun', prefix: '£' },
    { values: '9,8,7,6,5,4,3,2' },
    { values: '10' },
    { values: '3,1,4,1,5,9,2,6,5', labels: 'a,b,c,d,e,f,g,h,i', 'center-label': 'Items', theme: 'light' },
    { values: '1500000,2500000,1000000', labels: 'UK,US,EU', compact: '', heading: 'Revenue' },
    { values: '-5,10,0,20', labels: 'Neg,Ten,Zero,Twenty' },
    { values: '1,1,1', width: 520, height: 200, animate: true, stat: 'total' },
    { values: '7,7,7,7,7,7,7', labels: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', frame: 'none', color: '#111,#222,#333,#444,#555,#666' },
    { values: '0.1,0.2,0.3', decimals: 2, suffix: ' kg', width: 200 },
  ],
  gauge: [
    {},
    { values: '63', labels: 'CPU', zones: '60,85', goal: 80 },
    { values: '120' },
    { values: '-5', min: -10, max: 10, suffix: '°C' },
    { values: '0' },
    { value: 42, heading: 'Score', theme: 'light' },
    { values: '90', zones: '50,75', color: '#16a884,#d99a0e,#d63f7c', labels: 'Load' },
    { values: '1500', min: 0, max: 2000, prefix: '£', goal: 1800, compact: '', width: 260 },
    { values: '30', zones: '40,70', animate: true, background: '#0b0b10' },
    { values: '7.25', min: 5, max: 5, decimals: 2, height: 180, frame: 'none' },
    { values: '75', width: 600, height: 90 },
  ],
  progress: [
    {},
    { values: '72', labels: 'Upload' },
    { values: '30,20,10', labels: 'Done,Review,Blocked', max: 100, goal: 75 },
    { values: '500,300', prefix: '£' },
    { values: '200', max: 100 },
    { values: '1,1,1,1,1,1,1,1' },
    { values: '45', heading: 'Course', theme: 'light', stat: 'last' },
    { values: '1200,800,400,250,100', labels: 'Housing and utilities,Groceries,Transport,Subscriptions,Other', prefix: '£', width: 300 },
    { values: '60,50', max: 100, animate: true, background: '#141414' },
    { values: '0,0' },
    { values: '3.5', max: 10, suffix: ' km', goal: 8, frame: 'none' },
    { values: '-5,15', labels: 'Neg,Pos', color: '#f00,#0f0' },
  ],
  heatmap: [
    {},
    { values: year, start: '2025-10-27', suffix: ' commits' },
    { values: '1,2,3', start: '2026-03-01' },
    { values: '0,1,2,3,4', start: '2026-07-01', lang: 'en-GB' },
    { values: Array.from({ length: 120 }, (_, i) => (i * 13) % 7), start: '2026-07-15', heading: 'Runs', stat: 'total', theme: 'light' },
    { values: year, start: '2025-11-03', width: 240 },
    { values: year, start: '2025-11-03', width: 900, lang: 'en-US', color: '#16A884' },
    { values: '0,0,0,0', start: '2026-02-27' },
    { values: '-3,2,5,-1,8', start: '2026-02-30', prefix: '£', animate: true },
    { values: Array.from({ length: 60 }, (_, i) => i % 10 === 0 ? 1000000 : i), start: '2026-08-20', compact: '', frame: 'none' },
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
