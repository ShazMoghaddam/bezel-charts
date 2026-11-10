// The Studio: pick a chart, edit its data and look, copy the code or save an SVG.
// State is a flat map of HTML attributes, exactly what the generated code contains.
import { toast, copyText, saveFile, sampleYear } from './ui.js';
import { readFile, describe, daily, parseDelimited, parseDate, toNum } from './table.js';

const CDN = 'https://cdn.jsdelivr.net/gh/ShazMoghaddam/bezel-charts@1/dist/bezel-charts.min.js';
const SCRIPT = `<script type="module" src="${CDN}"></script>`;

// Ready-made files in site/samples, each opened in the chart that suits it.
const SAMPLES = [
  { file: 'monthly-sales-2026.csv', name: 'Monthly sales', ui: 'grouped', extra: { compact: '' } },
  { file: 'study-hours-vs-scores.csv', name: 'Study hours', ui: 'scatter', extra: { trend: '' } },
  { file: 'daily-running-2026.csv', name: 'Daily running', ui: 'heatmap' },
];

const CHARTS = [
  { id: 'spark', tag: 'spark', name: 'Sparkline', icon: 'M3 16c3 0 3-5 6-5s3 3 6 3 3-6 6-6' },
  { id: 'line', tag: 'line', name: 'Line', icon: 'M3 17l5-5 4 3 8-8M3 20h18' },
  { id: 'area', tag: 'area', name: 'Area', icon: 'M3 15l5-5 4 3 8-8v15H3z' },
  { id: 'bars', tag: 'bars', name: 'Bars', icon: 'M6 20v-8M12 20V5M18 20v-11' },
  { id: 'combo', tag: 'combo', name: 'Bars and line', icon: 'M5 20v-7M10 20V9M15 20v-5M20 20V8M3 11l6-4 5 3 7-5' },
  { id: 'grouped', tag: 'bars', name: 'Grouped bars', icon: 'M4 20v-8M8 20V8M14 20V9M18 20v-6' },
  { id: 'waterfall', tag: 'waterfall', name: 'Waterfall', icon: 'M4 20V8h3v12zM7 8h3v4M10 12h3v3M13 15h3v5M16 6h4v14h-4' },
  { id: 'boxplot', tag: 'boxplot', name: 'Box plot', icon: 'M6 4v4M6 16v4M3 8h6v8H3zM3 12h6M16 6v3M16 15v4M13 9h6v6h-6zM13 11h6' },
  { id: 'histogram', tag: 'histogram', name: 'Histogram', icon: 'M3 20v-5h4v5M7 20V9h4v11M11 20V5h4v15M15 20v-8h4v8' },
  { id: 'scatter', tag: 'scatter', name: 'Scatter', icon: 'M6 17h.01M9 12h.01M13 14h.01M17 8h.01M19 11h.01M8 7h.01' },
  { id: 'ring', tag: 'ring', name: 'Rings', icon: 'M12 4a8 8 0 1 1-8 8M12 8a4 4 0 1 1-4 4' },
  { id: 'donut', tag: 'donut', name: 'Donut', icon: 'M12 3a9 9 0 0 1 9 9M19.4 17.2A9 9 0 1 1 12 3' },
  { id: 'gauge', tag: 'gauge', name: 'Gauge', icon: 'M4 17a8 8 0 0 1 16 0M12 17l4-5' },
  { id: 'progress', tag: 'progress', name: 'Progress', icon: 'M4 10h16v4H4zM4 10h9v4H4z' },
  { id: 'bullet', tag: 'bullet', name: 'Bullet', icon: 'M3 7h18v4H3zM3 8.5h11v1H3zM16 6v6M3 15h18v4H3zM3 16.5h8v1H3zM13 14v6' },
  { id: 'heatmap', tag: 'heatmap', name: 'Heatmap', icon: 'M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM16 10h4v4h-4zM10 16h4v4h-4zM4 16h4v4H4z' },
];
const byId = Object.fromEntries(CHARTS.map((c) => [c.id, c]));
const WIDE = new Set(['line', 'area', 'combo', 'waterfall', 'grouped', 'histogram', 'boxplot', 'scatter', 'heatmap']);

const PRESETS = {
  spark: { heading: 'London · 7 day high', values: '17,16,15,15,13,12,14', labels: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', suffix: '°C', 'delta-label': 'since Monday' },
  line: { heading: 'Site visitors', values: '420,460,510,580,620,900,1180,1240,1310,1290,1420,1560|380,400,430,450,470,490,520,540,560,600,610,640', series: '2026,2025', labels: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec', notes: 'Jun:Launch day', compact: '' },
  area: { heading: 'Energy mix · GWh', values: '120,130,125,140,150,160|80,85,90,88,95,100|40,45,60,70,85,110', series: 'Gas,Nuclear,Wind', labels: '2021,2022,2023,2024,2025,2026', stacked: 'true' },
  combo: { heading: 'Sales and conversion', values: '182,214,236,268,251,290,312,298,340,365,392,420', line: '3.1,3.3,3.2,3.6,3.4,3.8,4.0,3.9,4.2,4.4,4.3,4.7', series: 'Sales', 'line-series': 'Conversion', labels: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec', prefix: '£', suffix: 'k', 'line-suffix': '%', 'line-decimals': '1' },
  waterfall: { heading: 'Revenue to profit', values: '420,85,-160,-95,0,-38,0', labels: 'Revenue,Services,Costs,Overheads,EBIT,Tax,Profit', totals: 'Revenue,EBIT,Profit', prefix: '£', suffix: 'k' },
  bullet: { heading: 'Q3 scorecard', values: '182,64,7.4', targets: '200,60,8', labels: 'Revenue £k,Margin %,NPS', zones: '150,180|40,55|6,7', 'zone-labels': 'Poor,Fair,Good' },
  boxplot: { heading: 'Salaries by team · £k', values: '60,66,60,59,55,60,71,65,70,64,65,63,49,69,66,66,48,48,55,58,64,62,66,57,95|50,50,44,58,51,55,44,44,46,47,52,49,45,42,45,55,43,49,51,39,22|55,68,35,52,54,47,60,54,40,63,62,64,69,59,56,42,61,49,50,42,45,50|47,31,34,42,48,44,32,28,43,37,35,46,47,42,42,43,49,44,70', series: 'Engineering,Marketing,Product,Support', prefix: '£', suffix: 'k', mark: 'mean' },
  histogram: { heading: 'Commute times · minutes', values: '21,38,45,28,19,33,39,46,21,20,42,39,51,45,33,31,62,31,25,21,35,36,30,33,37,42,46,36,14,42,18,32,18,34,25,36,70,33,43,19,31,41,33,38,35,23,40,25,55,28,42,34,44,27,45,33,48,41,36,25,42,39,52,30,40,40,37,36,36,27,23,30,40,51,45,46,43,42,36,42', mark: 'median' },
  bars: { heading: 'Commits this week', values: '4,9,6,3,8,5,3', labels: 'M,T,W,T,F,S,S', stat: 'total', 'show-values': '' },
  grouped: { heading: 'Revenue by quarter', values: '182000,214000,236000,268000|151000,170000,198000,205000', series: '2026,2025', labels: 'Q1,Q2,Q3,Q4', prefix: '£', compact: '' },
  scatter: { heading: 'Study hours vs exam score', x: '2,3,3.5,4,5,5.5,6,6.5,7,8,8.5,9,10,11,12', y: '48,52,61,55,63,58,70,66,72,75,71,82,80,88,91', 'x-label': 'Hours studied', 'y-label': 'Score', suffix: '%', trend: '' },
  ring: { heading: 'Today', values: '72,45,90', labels: 'Move,Focus,Sleep' },
  donut: { heading: 'Monthly budget', values: '1200,420,210,160,140', labels: 'Rent,Food,Bills,Travel,Fun', prefix: '£' },
  gauge: { heading: 'Server load', values: '63', labels: 'CPU', zones: '60,85' },
  progress: { heading: 'Sprint 14', values: '18,6,3', labels: 'Done,In review,Blocked', max: '34' },
  heatmap: { heading: 'Contributions', suffix: ' commits' },
};
const HEIGHTS = { spark: [40, 160, 64], line: [120, 360, 170], area: [120, 360, 170], histogram: [120, 360, 190], combo: [120, 360, 200], waterfall: [140, 400, 200], boxplot: [120, 360, 200], bars: [90, 320, 140], grouped: [90, 320, 140], scatter: [150, 400, 210], ring: [100, 260, 140], donut: [110, 260, 150], gauge: [90, 220, 130] };
// Look settings survive a change of chart type; data does not.
const KEEP = ['theme', 'frame', 'corners', 'background', 'lang', 'static', 'no-tooltips'];
const ORDER = ['heading', 'values', 'series', 'x', 'y', 'x-label', 'y-label', 'labels', 'start', 'min', 'max', 'prefix', 'suffix', 'decimals', 'compact', 'lang', 'stat', 'delta',
  'delta-label', 'goal', 'goal-label', 'notes', 'show-values', 'straight', 'zero', 'horizontal', 'stacked', 'angle-labels', 'highlight', 'trend', 'bins', 'bin-width', 'mark', 'percent', 'whiskers', 'line', 'line-series', 'line-prefix', 'line-suffix', 'line-decimals', 'line-label', 'line-zero', 'dates', 'log', 'dash', 'markers', 'patterns', 'zones', 'zone-labels', 'targets', 'totals',
  'center-label', 'theme', 'frame', 'corners', 'height', 'color', 'background', 'no-tooltips', 'static'];

const all = CHARTS.map((c) => c.id);
const only = (...ids) => ids;
const not = (...ids) => all.filter((id) => !ids.includes(id));
const statDefault = (ui) => (ui === 'spark' ? 'last' : 'none');
const effectiveStat = (ui, a) => a.stat || statDefault(ui);

// Every control in the panel. "only" limits it to the charts it makes sense for; "when" hides it until it applies.
const FIELDS = [
  { tab: 'data', kind: 'import', only: all },
  { tab: 'data', key: 'heading', kind: 'text', label: 'Title', placeholder: 'e.g. Monthly sales', only: all },
  { tab: 'data', kind: 'series', only: only('line', 'area', 'bars', 'grouped', 'histogram', 'boxplot', 'combo') },
  { tab: 'data', key: 'dates', kind: 'text', label: 'Dates', placeholder: 'e.g. 2026-01-01, 2026-01-08, 2026-03-01', only: only('line', 'area'),
    hint: 'One per point, as YYYY-MM-DD. Points then sit where they fall in time, and the axis picks its own steps.' },
  { tab: 'data', key: 'line', kind: 'text', label: 'Line values', placeholder: 'e.g. 3.1, 3.4, 3.6', only: only('combo'),
    hint: 'Read against the right-hand axis. Separate several lines with |.' },
  { tab: 'data', key: 'line-series', kind: 'text', label: 'Line names', placeholder: 'e.g. Conversion', only: only('combo') },
  { tab: 'data', kind: 'groups', only: only('scatter') },
  { tab: 'data', key: 'values', kind: 'numbers', only: only('spark', 'ring', 'donut', 'progress', 'heatmap'),
    label: { spark: 'Values', ring: 'Values, one ring each', donut: 'Values, one slice each', progress: 'Values, one segment each', heatmap: 'Values, one per day' },
    hint: 'Separate with commas, spaces or new lines. You can paste two columns from a spreadsheet to fill the labels as well.' },
  { tab: 'data', key: 'values', kind: 'number', label: 'Reading', only: only('gauge') },
  { tab: 'data', key: 'values', kind: 'numbers', label: 'Changes, in order', only: only('waterfall'),
    hint: 'Rises are positive and falls negative. For a total bar, put the opening amount for a start or 0 for a subtotal.' },
  { tab: 'data', key: 'values', kind: 'numbers', label: 'Actual values, one row each', only: only('bullet') },
  { tab: 'data', key: 'targets', kind: 'numbers', label: 'Targets', only: only('bullet'), hint: 'One per row, or one number for every row. Drawn as an upright line.' },
  { tab: 'data', key: 'labels', kind: 'list', label: 'Labels', only: only('spark', 'line', 'area', 'bars', 'grouped', 'combo', 'waterfall', 'ring', 'donut', 'progress', 'bullet'),
    hint: { waterfall: 'One per step, along the bottom.', bullet: 'One per row, on the left.', spark: 'One per value, shown in tooltips.', line: 'One per point, along the bottom.', area: 'One per point, along the bottom.', combo: 'One per column, along the bottom.', bars: 'One per bar, along the bottom.', grouped: 'One per group, along the bottom.', ring: 'One per ring.', donut: 'One per slice.', progress: 'One per segment.' } },
  { tab: 'data', key: 'labels', kind: 'text', label: 'Caption', placeholder: 'e.g. CPU', only: only('gauge') },
  { tab: 'data', key: 'labels', kind: 'list', label: 'Point names (optional)', hint: 'Shown in tooltips, in the same order as the points.', only: only('scatter') },
  { tab: 'data', kind: 'pair', only: only('gauge'), fields: [{ key: 'min', kind: 'number', label: 'Lowest', placeholder: '0' }, { key: 'max', kind: 'number', label: 'Highest', placeholder: '100' }] },
  { tab: 'data', key: 'totals', kind: 'list', label: 'Totals', only: only('waterfall'),
    hint: 'The bars that show the running total, by label (or position, counting from 0). They stand on zero in the total colour.' },
  { tab: 'data', key: 'max', kind: 'number', label: 'Out of', placeholder: '100', hint: 'The value that fills a ring. Leave empty for 100.', only: only('ring') },
  { tab: 'data', key: 'max', kind: 'number', label: 'Out of', placeholder: 'Total', hint: 'The full length of the bar. Leave empty to use the total.', only: only('progress') },
  { tab: 'data', kind: 'pair', only: only('scatter'), fields: [{ key: 'x-label', kind: 'text', label: 'Across (x) title', placeholder: 'e.g. Hours' }, { key: 'y-label', kind: 'text', label: 'Up (y) title', placeholder: 'e.g. Score' }] },
  { tab: 'data', key: 'start', kind: 'date', label: 'First day', only: only('heatmap') },

  { tab: 'style', key: 'theme', kind: 'seg', label: 'Theme', options: [['', 'Auto'], ['dark', 'Dark'], ['light', 'Light']], only: all, hint: 'Auto follows the light or dark setting of whoever is looking.' },
  { tab: 'style', key: 'frame', kind: 'seg', label: 'Frame', options: [['', 'Bezel'], ['none', 'None']], only: all },
  { tab: 'style', key: 'corners', kind: 'range', label: 'Corners', min: 1, max: 30, def: 22, only: all, when: (a) => a.frame !== 'none' },
  { tab: 'style', key: 'height', kind: 'range', label: 'Chart height', only: Object.keys(HEIGHTS), when: (a) => !('horizontal' in a) },
  { tab: 'style', kind: 'colours', only: all },
  { tab: 'style', kind: 'pair', only: all, fields: [{ key: 'prefix', kind: 'text', label: 'Before numbers', placeholder: '£' }, { key: 'suffix', kind: 'text', label: 'After numbers', placeholder: '%' }] },
  { tab: 'style', kind: 'pair', only: only('combo'), fields: [{ key: 'line-prefix', kind: 'text', label: 'Before line numbers', placeholder: '$' }, { key: 'line-suffix', kind: 'text', label: 'After line numbers', placeholder: '%' }] },
  { tab: 'style', key: 'line-decimals', kind: 'select', label: 'Line decimal places', options: [['', 'Automatic'], ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']], only: only('combo') },
  { tab: 'style', kind: 'pair', only: only('combo'), fields: [{ key: 'y-label', kind: 'text', label: 'Left axis title', placeholder: 'e.g. Sales' }, { key: 'line-label', kind: 'text', label: 'Right axis title', placeholder: 'e.g. Conversion' }] },
  { tab: 'style', key: 'decimals', kind: 'select', label: 'Decimal places', options: [['', 'Automatic'], ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']], only: all },
  { tab: 'style', key: 'compact', kind: 'toggle', label: 'Short big numbers (12.5k)', only: all },
  { tab: 'style', key: 'lang', kind: 'select', label: 'Language for numbers and dates', only: all,
    options: [['', 'English (UK)'], ['en-US', 'English (US)'], ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['es-ES', 'Español'], ['it-IT', 'Italiano'], ['fa-IR', 'فارسی']] },

  { tab: 'extras', key: 'stat', kind: 'stat', label: 'Headline number', only: only('spark', 'line', 'area', 'bars', 'grouped') },
  { tab: 'extras', key: 'delta', kind: 'select', label: 'Change since the start', only: only('spark', 'line', 'area', 'bars', 'grouped'), when: (a, ui) => effectiveStat(ui, a) === 'last',
    options: [['', 'Show it, rising is good'], ['inverse', 'Show it, falling is good'], ['none', 'Hide it']] },
  { tab: 'extras', key: 'delta-label', kind: 'text', label: 'Change wording', placeholder: 'since start', only: only('spark', 'line', 'area', 'bars', 'grouped'), when: (a, ui) => effectiveStat(ui, a) === 'last' && a.delta !== 'none' },
  { tab: 'extras', kind: 'pair', only: only('spark', 'line', 'area', 'bars', 'grouped', 'waterfall', 'boxplot', 'scatter'), fields: [{ key: 'goal', kind: 'number', label: 'Goal line at', placeholder: 'e.g. 100' }, { key: 'goal-label', kind: 'text', label: 'Goal wording', placeholder: 'Goal' }] },
  { tab: 'extras', key: 'goal', kind: 'number', label: 'Goal marker at', placeholder: 'e.g. 80', only: only('gauge', 'progress') },
  { tab: 'extras', kind: 'notes', only: only('spark', 'line', 'area', 'scatter') },
  { tab: 'extras', key: 'zones', kind: 'text', label: 'Zone breakpoints', placeholder: 'e.g. 60, 85', hint: 'The reading turns from green to amber to red as it passes each number.', only: only('gauge') },
  { tab: 'extras', key: 'zones', kind: 'text', label: 'Band edges', placeholder: 'e.g. 150, 180', only: only('bullet'),
    hint: 'Two numbers make three bands, darkest at the low end. Give each row its own with | between them.' },
  { tab: 'extras', key: 'zone-labels', kind: 'list', label: 'Band names', placeholder: 'e.g. Poor, Fair, Good', only: only('bullet'), hint: 'Shown in tooltips and the data table.' },
  { tab: 'extras', key: 'max', kind: 'number', label: 'Scale up to', placeholder: 'Automatic', only: only('bullet'), hint: 'The same end for every row. Leave empty and each row fits its own numbers.' },
  { tab: 'extras', key: 'center-label', kind: 'text', label: 'Centre wording', placeholder: 'Total', only: only('donut') },
  { tab: 'extras', key: 'show-values', kind: 'toggle', label: 'Show values on the chart', only: only('spark', 'line', 'area', 'bars', 'grouped') },
  { tab: 'extras', key: 'horizontal', kind: 'toggle', label: 'Horizontal bars', only: only('bars', 'grouped') },
  { tab: 'extras', key: 'horizontal', kind: 'toggle', label: 'Lay the boxes on their side', only: only('boxplot') },
  { tab: 'extras', key: 'stacked', kind: 'toggle', label: 'Stack the series in one bar', only: only('grouped') },
  { tab: 'extras', key: 'stacked', kind: 'toggle', label: 'Stack the bars', only: only('combo'), when: (a) => String(a.values || '').includes('|') },
  { tab: 'extras', key: 'line-zero', kind: 'toggle', label: 'Start the right axis at zero', only: only('combo') },
  { tab: 'extras', key: 'stacked', kind: 'seg', label: 'Several series', options: [['', 'Overlap'], ['true', 'Stack'], ['percent', 'Share of 100%']], only: only('area'),
    when: (a) => String(a.values || '').includes('|'), hint: 'Stack piles the series so the top edge is the total. Share of 100% shows how the total splits.' },
  { tab: 'extras', key: 'angle-labels', kind: 'toggle', label: 'Slant labels so every one fits', only: only('bars', 'grouped'), when: (a) => !('horizontal' in a) },
  { tab: 'extras', key: 'highlight', kind: 'toggle', invert: 'none', label: 'Highlight the highest bar', only: only('bars') },
  { tab: 'extras', key: 'straight', kind: 'toggle', label: 'Straight lines instead of curves', only: only('spark', 'line', 'area') },
  { tab: 'extras', key: 'zero', kind: 'toggle', label: 'Start the axis at zero', only: only('line', 'scatter') },
  { tab: 'extras', kind: 'pair', only: only('line', 'area'), fields: [{ key: 'min', kind: 'number', label: 'Axis from', placeholder: 'Auto' }, { key: 'max', kind: 'number', label: 'Axis to', placeholder: 'Auto' }] },
  { tab: 'extras', key: 'log', kind: 'toggle', label: 'Log scale, for values that grow fast', only: only('line') },
  { tab: 'extras', key: 'trend', kind: 'toggle', label: 'Trend line with its r value', only: only('scatter') },
  { tab: 'extras', kind: 'pair', only: only('histogram'), fields: [{ key: 'bins', kind: 'number', label: 'About how many ranges', placeholder: 'Auto' }, { key: 'bin-width', kind: 'number', label: 'Or each range’s width', placeholder: 'Auto' }] },
  { tab: 'extras', key: 'mark', kind: 'select', label: 'Lines for', only: only('histogram'),
    options: [['', 'Nothing'], ['mean', 'The mean'], ['median', 'The median'], ['mean,median', 'The mean and the median']] },
  { tab: 'extras', key: 'percent', kind: 'toggle', label: 'Show shares instead of counts', only: only('histogram') },
  { tab: 'extras', key: 'whiskers', kind: 'seg', label: 'Whiskers reach', only: only('boxplot'), options: [['', 'Typical values'], ['range', 'Lowest and highest']],
    hint: 'Typical values stop within one and a half box heights and show anything further out as a dot.' },
  { tab: 'extras', key: 'mark', kind: 'toggle', value: 'mean', label: 'A diamond at the mean', only: only('boxplot') },
  // Ways to tell series apart without relying on colour. Each only shows once there is more than one series to tell apart.
  { tab: 'extras', key: 'dash', kind: 'toggle', label: 'A different dash for each line', only: only('line', 'area', 'combo'), when: (a, ui) => String((ui === 'combo' ? a.line : a.values) || '').includes('|') },
  { tab: 'extras', key: 'markers', kind: 'toggle', label: 'Shapes on the points', only: only('line', 'area', 'combo', 'scatter'), when: (a, ui) => ui !== 'scatter' || String(a.x || '').includes('|') },
  { tab: 'extras', key: 'patterns', kind: 'toggle', label: 'A different pattern for each series', only: only('grouped', 'area', 'histogram', 'combo'), when: (a, ui) => ui === 'grouped' || String(a.values || '').includes('|') },
  { tab: 'extras', key: 'no-tooltips', kind: 'toggle', invert: true, label: 'Exact values on hover and with the keyboard', only: all },
  { tab: 'extras', key: 'static', kind: 'toggle', invert: true, label: 'Animate when it first appears', only: all },
];

/* ---------- small parsing helpers ---------- */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tokens = (text) => String(text ?? '').split(/[\s,;]+/).filter(Boolean);
const cleanNum = (s) => String(s).trim().replace(/[£$€¥%\s]/g, '').replace(/,(?=\d{3}\b)/g, '');
const isNum = (s) => cleanNum(s) !== '' && Number.isFinite(Number(cleanNum(s)));
const numbersFrom = (text) => tokens(text).map((t) => (isNum(t) ? String(Number(cleanNum(t))) : t)).join(',');
const listFrom = (text) => String(text ?? '').split(/\n|,/).map((s) => s.trim()).filter((s, i, arr) => s || i < arr.length - 1).join(',');
const listOf = (v) => (v ? String(v).split(',') : []);
const badTokens = (text) => tokens(text).filter((t) => !isNum(t));

/** A tidy title from a file name: "monthly-sales_2026.csv" becomes "Monthly sales 2026". */
const titleFrom = (name) => {
  const t = String(name).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : '';
};
const niceCeil = (n) => {
  if (n <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  return [1, 2, 2.5, 5, 10].map((k) => k * p).find((v) => v >= n);
};
const listNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// Blocks are redrawn as you edit, except while you're typing or picking inside one.
const isTyping = (box) => box.contains(document.activeElement) && document.activeElement.matches('input, select, textarea');

/* ---------- the Studio ---------- */

export function createStudio(root) {
  const $ = (sel) => root.querySelector(sel);
  const picker = $('#picker'), frame = $('#frame'), canvas = $('#canvas'), code = $('#code');
  const panes = { data: $('#pane-data'), style: $('#pane-style'), extras: $('#pane-extras') };
  const width = $('#pw'), widthOut = $('#pw-out');
  let ui = 'bars';
  let attrs = {};
  let el = null;
  let widthTouched = false;
  let table = null; // the last file or pasted table, re-used when the chart type changes
  let importNote = '';
  let sampleFile = ''; // set while a sample file is loaded, so the note can offer it as a download
  let withScript = true;

  const tagOf = () => `bezel-${byId[ui].tag}`;
  const pick = (v) => (typeof v === 'object' && v ? v[ui] : v);
  const set = (key, value) => {
    if (value === undefined || value === null || value === false || (value === '' && !isBoolean(key))) delete attrs[key];
    else attrs[key] = value === true ? '' : String(value);
  };
  // A key can be a toggle on one chart and a choice on another (stacked), so this looks at the current chart.
  const isBoolean = (key) => FIELDS.some((f) => f.key === key && f.kind === 'toggle' && f.only.includes(ui));

  /* picker */
  picker.innerHTML = CHARTS.map((c) => `
    <button type="button" role="radio" class="pick" data-ui="${c.id}" aria-checked="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${c.id === 'scatter' ? 3.2 : 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${c.icon}"/></svg>
      <span>${c.name}</span>
    </button>`).join('');
  picker.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ui]');
    if (b && b.dataset.ui !== ui) choose(b.dataset.ui);
  });
  picker.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const i = all.indexOf(ui) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    choose(all[(i + all.length) % all.length]);
    picker.querySelector(`[data-ui="${ui}"]`).focus();
  });

  /* tabs */
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const showTab = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      root.querySelector('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      showTab(next);
      next.focus();
    });
  });

  /* preview size and background */
  width.addEventListener('input', () => {
    widthTouched = true;
    applyWidth();
  });
  // The slider never goes wider than the preview area, so phones get a range that fits.
  const fitWidthRange = () => {
    const room = Math.floor(canvas.clientWidth - parseFloat(getComputedStyle(canvas).paddingLeft) * 2);
    if (room > 0) width.max = String(Math.max(240, Math.min(900, room)));
    applyWidth();
  };
  const applyWidth = () => {
    if (+width.value > +width.max) width.value = width.max;
    frame.style.width = `${width.value}px`;
    widthOut.textContent = `${width.value} px`;
  };
  addEventListener('resize', fitWidthRange);
  root.querySelectorAll('[data-bg-set]').forEach((b) =>
    b.addEventListener('click', () => {
      canvas.dataset.bg = b.dataset.bgSet;
      root.querySelectorAll('[data-bg-set]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }),
  );

  /* building the panes */
  const fieldsFor = (tab) => FIELDS.filter((f) => f.tab === tab && f.only.includes(ui));

  function control(f) {
    const id = `f-${f.key || f.kind}-${f.tab}`;
    const label = pick(f.label);
    const hint = pick(f.hint);
    const hintHtml = hint ? `<p class="hint">${esc(hint)}</p>` : '';
    let v = f.key ? attrs[f.key] ?? '' : '';
    // A bare attribute, such as stacked from pasted code, means the same as "true".
    if (f.kind === 'seg' && f.key in attrs && v === '' && f.options.some(([val]) => val === 'true')) v = 'true';
    switch (f.kind) {
      case 'text':
        return `<label class="field" for="${id}"><span>${esc(label)}</span><input id="${id}" type="text" data-key="${f.key}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" autocomplete="off">${hintHtml}</label>`;
      case 'number':
        return `<label class="field" for="${id}"><span>${esc(label)}</span><input id="${id}" type="text" inputmode="decimal" data-key="${f.key}" data-num value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" autocomplete="off">${hintHtml}<p class="warn" hidden></p></label>`;
      case 'date':
        return `<div class="field"><label for="${id}">${esc(label)}</label><div class="row"><input id="${id}" type="date" data-key="${f.key}" value="${esc(v)}"><button type="button" class="btn" data-sample-year>Fill with a sample year</button></div></div>`;
      case 'numbers':
        return `<label class="field" for="${id}"><span>${esc(label)}</span><textarea id="${id}" rows="${ui === 'heatmap' ? 4 : 2}" data-key="${f.key}" data-numbers spellcheck="false">${esc(v)}</textarea>${hintHtml}<p class="warn" hidden></p></label>`;
      case 'list':
        return `<label class="field" for="${id}"><span>${esc(label)}</span><textarea id="${id}" rows="2" data-key="${f.key}" data-list spellcheck="false">${esc(v)}</textarea>${hintHtml}</label>`;
      case 'select':
        return `<label class="field" for="${id}"><span>${esc(label)}</span><select id="${id}" data-key="${f.key}">${f.options.map(([val, text]) => `<option value="${esc(val)}"${val === v ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select>${hintHtml}</label>`;
      case 'stat': {
        const cur = effectiveStat(ui, attrs);
        const opts = [['none', 'None'], ['last', 'Latest value'], ['total', 'Total'], ['average', 'Average'], ['max', 'Highest'], ['min', 'Lowest']];
        return `<label class="field" for="${id}"><span>${esc(label)}</span><select id="${id}" data-stat>${opts.map(([val, text]) => `<option value="${val}"${val === cur ? ' selected' : ''}>${text}</option>`).join('')}</select><p class="hint">A big number above the chart.</p></label>`;
      }
      case 'seg':
        return `<div class="field"><span class="field__l">${esc(label)}</span><div class="seg seg--fill" role="group" aria-label="${esc(label)}">${f.options.map(([val, text]) => `<button type="button" data-seg="${f.key}" data-val="${esc(val)}" aria-pressed="${val === v}">${esc(text)}</button>`).join('')}</div>${hintHtml}</div>`;
      case 'range': {
        const [min, max, def] = f.key === 'height' ? HEIGHTS[ui] : [f.min, f.max, f.def];
        const cur = v || def;
        return `<label class="field" for="${id}"><span>${esc(label)} <output>${cur}</output></span><input id="${id}" type="range" min="${min}" max="${max}" value="${cur}" data-key="${f.key}" data-def="${def}"></label>`;
      }
      case 'toggle': {
        // invert: on unless the attribute is set (to f.invert). value: on when the attribute holds that value.
        const on = f.invert ? attrs[f.key] !== (f.invert === true ? '' : f.invert) && !(f.invert === true && f.key in attrs) : f.value ? attrs[f.key] === f.value : f.key in attrs;
        return `<label class="toggle" for="${id}"><input id="${id}" type="checkbox" data-toggle="${f.key}"${on ? ' checked' : ''}><span class="toggle__ui" aria-hidden="true"></span><span>${esc(label)}</span></label>`;
      }
      case 'pair':
        return `<div class="pair">${f.fields.map((sub) => control({ ...sub, tab: f.tab })).join('')}</div>`;
      case 'series':
        return `<div class="block" data-block="series"></div>`;
      case 'groups':
        return `<div class="block" data-block="groups"></div>`;
      case 'notes':
        return `<div class="block" data-block="notes"></div>`;
      case 'colours':
        return `<div class="block" data-block="colours"></div>`;
      case 'import':
        return `<div class="import">
          <div class="import__row">
            <button type="button" class="btn" data-import>Import a file</button>
            <span class="hint">CSV, Excel or JSON, or drop a file here</span>
          </div>
          <div class="import__row import__samples">
            <span class="hint">No file to hand? Try one:</span>
            ${SAMPLES.map((s) => `<button type="button" class="chip" data-sample="${esc(s.file)}">${esc(s.name)}</button>`).join('')}
          </div>
          <input type="file" id="import-file" accept=".csv,.tsv,.txt,.json,.xlsx,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
          ${importNote ? `<p class="import__note${importNote.startsWith('!') ? ' import__note--warn' : ''}" role="status">${esc(importNote.replace(/^!/, ''))}${
            sampleFile && !importNote.startsWith('!') ? ` <a href="samples/${esc(sampleFile)}" download>Download the file</a> to see how it's laid out.` : ''}</p>` : ''}
        </div>`;
    }
    return '';
  }

  /** Fills the current chart from a table read by table.js. Returns a sentence describing what was used. */
  function applyTable(t) {
    // Start from a clean sheet: words and units from the sample data don't belong to the user's file.
    for (const k of ['values', 'labels', 'series', 'x', 'y', 'x-label', 'y-label', 'notes', 'start', 'goal', 'goal-label', 'zones', 'max', 'min',
      'color', 'prefix', 'suffix', 'delta-label', 'center-label'])
      delete attrs[k];
    const unitFrom = (c) => {
      if (c?.prefix) attrs.prefix = c.prefix;
      if (c?.suffix) attrs.suffix = c.suffix;
    };
    unitFrom(ui === 'scatter' ? t.numbers[1] : t.numbers[0]);
    if (t.title && (!attrs.heading || attrs.heading === PRESETS[ui].heading)) attrs.heading = t.title;
    const B = t.body, N = t.numbers, L = t.label && t.label !== t.group ? t.label : null;
    const col = (c) => B.map((r) => toNum(t.cell(r, c)));
    // Dates as labels read better short: "1 Jan", or "1 Jan 25" when the data spans years.
    const shortDate = (() => {
      if (L?.kind !== 'date') return null;
      const days = B.map((r) => parseDate(t.cell(r, L))).filter(Boolean);
      const oneYear = new Set(days.map((d) => d.slice(0, 4))).size === 1;
      const f = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC', ...(oneYear ? {} : { year: '2-digit' }) });
      return (v) => { const d = parseDate(v); return d ? f.format(new Date(d + 'T00:00:00Z')) : v; };
    })();
    const labels = L ? B.map((r) => (shortDate ? shortDate(t.cell(r, L)) : t.cell(r, L)).replace(/,/g, ' ')) : [];
    const rows = `${B.length} row${B.length === 1 ? '' : 's'}${t.truncated ? ' (the first 5,000)' : ''}`;
    const from = L ? ` Labels from ${L.name || 'the first column'};` : '';
    const name = (c) => c.name || 'the numbers';
    if (labels.length) attrs.labels = labels.join(',');

    switch (ui) {
      case 'combo': {
        if (N.length < 2) return '!Bars and a line need two number columns: one for the bars and one for the line.';
        attrs.values = col(N[0]).join(',');
        attrs.line = col(N[1]).join(',');
        attrs.series = (N[0].name || 'Bars').replace(/,/g, ' ');
        attrs['line-series'] = (N[1].name || 'Line').replace(/,/g, ' ');
        return `${rows}.${from} bars from ${name(N[0])}, the line from ${name(N[1])}.`;
      }
      case 'line': case 'area': case 'bars': case 'grouped': case 'histogram': case 'boxplot': {
        if (ui === 'histogram' || ui === 'boxplot') delete attrs.labels;
        // A date column spaces line and area points in time.
        if ((ui === 'line' || ui === 'area') && shortDate) {
          const days = B.map((r) => parseDate(t.cell(r, L)));
          if (days.every(Boolean)) { attrs.dates = days.join(','); delete attrs.labels; }
        }
        const use = N.slice(0, 6);
        attrs.values = use.map((c) => col(c).join(',')).join('|');
        if (use.length > 1) attrs.series = use.map((c, i) => (c.name || `Series ${i + 1}`).replace(/,/g, ' ')).join(',');
        const extra = N.length > 6 ? ` The first 6 of ${N.length} number columns are shown.` : '';
        return `${rows}.${from} ${use.length > 1 ? 'series' : 'values'} from ${listNames(use.map(name))}.${extra}`;
      }
      case 'scatter': {
        if (N.length < 2) {
          delete attrs.labels;
          return '!A scatter plot needs two number columns: one for across (x) and one for up (y).';
        }
        const [cx, cy] = N;
        attrs['x-label'] = cx.name; attrs['y-label'] = cy.name;
        if (!attrs['x-label']) delete attrs['x-label'];
        if (!attrs['y-label']) delete attrs['y-label'];
        if (t.group) {
          const names = [...new Set(B.map((r) => t.cell(r, t.group)))];
          const pick = (g, c) => B.filter((r) => t.cell(r, t.group) === g).map((r) => toNum(t.cell(r, c))).join(',');
          attrs.x = names.map((g) => pick(g, cx)).join('|');
          attrs.y = names.map((g) => pick(g, cy)).join('|');
          attrs.series = names.map((g) => g.replace(/,/g, ' ') || 'Other').join(',');
          if (L) attrs.labels = names.flatMap((g) => B.filter((r) => t.cell(r, t.group) === g).map((r) => t.cell(r, L).replace(/,/g, ' '))).join(',');
          return `${rows}.${from} across from ${name(cx)}, up from ${name(cy)}, grouped by ${t.group.name || 'the text column'}.`;
        }
        attrs.x = col(cx).join(','); attrs.y = col(cy).join(',');
        return `${rows}.${from} across from ${name(cx)}, up from ${name(cy)}.`;
      }
      case 'heatmap': {
        delete attrs.labels;
        const c = N[0];
        if (t.date) {
          const d = daily(t, c);
          attrs.start = d.start; attrs.values = d.values.join(',');
          return `${rows}. ${name(c)} added up per day from ${d.start}${d.clipped ? ', showing the latest two years' : ''}.`;
        }
        attrs.values = col(c).join(',');
        return `${rows}. One square per row from ${name(c)}, ending today. Add a date column to place them on the right days.`;
      }
      case 'gauge': {
        delete attrs.labels;
        const vals = col(N[0]), last = vals[vals.length - 1];
        if (N[0].name) attrs.labels = N[0].name.replace(/,/g, ' ');
        const lo = Math.min(0, ...vals), hi = Math.max(...vals);
        const percent = N[0].suffix === '%' || /percent|%/i.test(N[0].name);
        if (lo < 0) attrs.min = String(-niceCeil(-lo));
        if (!percent || hi > 100 || lo < 0) attrs.max = String(niceCeil(hi));
        attrs.values = String(last);
        return `${rows}. Showing the last value of ${name(N[0])}.`;
      }
      case 'waterfall': {
        attrs.values = col(N[0]).join(',');
        delete attrs.totals;
        return `${rows}.${from} changes from ${name(N[0])}. Mark any totals under Totals.`;
      }
      case 'bullet': {
        attrs.values = col(N[0]).join(',');
        delete attrs.zones; delete attrs['zone-labels'];
        if (N[1]) attrs.targets = col(N[1]).join(','); else delete attrs.targets;
        return `${rows}.${from} values from ${name(N[0])}${N[1] ? `, targets from ${name(N[1])}` : ''}.`;
      }
      case 'ring': {
        const vals = col(N[0]).slice(0, 6), top = Math.max(...vals);
        attrs.values = vals.join(',');
        if (labels.length) attrs.labels = labels.slice(0, 6).join(',');
        // Percentages fill against 100. Anything else fills against a round number just above the largest value.
        const percent = N[0].suffix === '%' || /percent|%/i.test(N[0].name);
        if (!percent || top > 100) attrs.max = String(niceCeil(top));
        return `${rows}.${from} values from ${name(N[0])}.${B.length > 6 ? ' Rings show the first 6.' : ''}`;
      }
      default: {
        attrs.values = col(N[0]).join(',');
        return `${rows}.${from} values from ${name(N[0])}.${N.length > 1 ? ` This chart uses one number column; try Line or Grouped bars to see all ${N.length}.` : ''}`;
      }
    }
  }

  /** Reads rows into a table and redraws the chart with them. */
  function useRows(rows, title, source) {
    const t = describe(rows);
    if (!t) {
      importNote = "!Couldn't find a column of numbers in that data. Check the numbers aren't stored as text.";
      renderPanes();
      return false;
    }
    t.title = title;
    t.source = source;
    table = t;
    const target = ui === 'bars' && t.numbers.length > 1 ? 'grouped' : ui === 'grouped' && t.numbers.length === 1 ? 'bars' : ui;
    choose(target);
    return true;
  }

  async function importFile(file, sample) {
    if (!file) return;
    try {
      const rows = await readFile(file);
      sampleFile = sample ? sample.file : '';
      if (sample) ui = sample.ui;
      if (useRows(rows, titleFrom(file.name), `Loaded ${file.name}: `)) {
        if (sample?.extra) {
          Object.assign(attrs, sample.extra);
          update();
        }
        showTab(tabs[0]);
        toast(`${file.name} loaded`);
      }
    } catch (err) {
      importNote = '!' + (err.message || "That file couldn't be read.");
      renderPanes();
    }
  }

  function renderPanes() {
    for (const [tab, pane] of Object.entries(panes)) {
      pane.innerHTML = fieldsFor(tab).map((f, i) => `<div class="f" data-fi="${FIELDS.indexOf(f)}">${control(f)}</div>`).join('');
    }
    renderSeries();
    renderGroups();
    renderNotes();
    renderColours();
    syncWhen();
    validateAll();
  }

  /* series editor (line and bars) */
  function seriesRows() {
    const values = (attrs.values || '').split('|');
    const names = listOf(attrs.series);
    return values.map((v, i) => ({ name: names[i] || '', values: v }));
  }
  function writeSeries(rows) {
    set('values', rows.map((r) => numbersFrom(r.values)).join('|'));
    const named = rows.length > 1 || rows.some((r) => r.name);
    set('series', named ? rows.map((r, i) => (r.name || `Series ${i + 1}`).replace(/,/g, ' ')).join(',') : '');
  }
  function renderSeries() {
    const box = root.querySelector('[data-block="series"]');
    if (!box) return;
    const rows = seriesRows();
    const many = rows.length > 1;
    box.innerHTML = `<div class="block__head"><span>${many ? 'Series' : 'Values'}</span></div>` +
      rows.map((r, i) => `
      <div class="srow" data-row="${i}">
        ${many ? `<input type="text" class="srow__name" data-sname value="${esc(r.name)}" placeholder="Series ${i + 1} name" aria-label="Series ${i + 1} name">` : ''}
        <textarea rows="2" data-svalues spellcheck="false" aria-label="${many ? `Series ${i + 1} values` : 'Values'}">${esc(r.values.replace(/,/g, ', '))}</textarea>
        <p class="warn" hidden></p>
        ${many ? `<button type="button" class="link link--danger" data-sremove>Remove ${esc(r.name || `series ${i + 1}`)}</button>` : ''}
      </div>`).join('') +
      `<p class="hint">Separate values with commas, spaces or new lines. Paste a table from a spreadsheet to fill every series and the labels at once.</p>` +
      (rows.length < 6 ? `<button type="button" class="btn" data-sadd>Add a series</button>` : '');
  }

  /* scatter groups */
  function groupRows() {
    const xs = (attrs.x || '').split('|'), ys = (attrs.y || '').split('|'), names = listOf(attrs.series);
    return Array.from({ length: Math.max(xs.length, ys.length) }, (_, i) => ({ name: names[i] || '', x: xs[i] || '', y: ys[i] || '' }));
  }
  function writeGroups(rows) {
    set('x', rows.map((r) => numbersFrom(r.x)).join('|'));
    set('y', rows.map((r) => numbersFrom(r.y)).join('|'));
    const named = rows.length > 1 || rows.some((r) => r.name);
    set('series', named ? rows.map((r, i) => (r.name || `Group ${i + 1}`).replace(/,/g, ' ')).join(',') : '');
  }
  function renderGroups() {
    const box = root.querySelector('[data-block="groups"]');
    if (!box) return;
    const rows = groupRows();
    const many = rows.length > 1;
    box.innerHTML = `<div class="block__head"><span>${many ? 'Groups' : 'Points'}</span></div>` +
      rows.map((r, i) => `
      <div class="srow" data-row="${i}">
        ${many ? `<input type="text" class="srow__name" data-gname value="${esc(r.name)}" placeholder="Group ${i + 1} name" aria-label="Group ${i + 1} name">` : ''}
        <label class="sub"><span>Across (x)</span><textarea rows="2" data-gx spellcheck="false">${esc(r.x.replace(/,/g, ', '))}</textarea></label>
        <label class="sub"><span>Up (y)</span><textarea rows="2" data-gy spellcheck="false">${esc(r.y.replace(/,/g, ', '))}</textarea></label>
        <p class="warn" hidden></p>
        ${many ? `<button type="button" class="link link--danger" data-gremove>Remove ${esc(r.name || `group ${i + 1}`)}</button>` : ''}
      </div>`).join('') +
      `<p class="hint">One x and one y per point, in the same order. Paste two columns from a spreadsheet to fill both.</p>` +
      (rows.length < 6 ? `<button type="button" class="btn" data-gadd>Add a group</button>` : '');
  }

  /* notes */
  function notePoints() {
    const labels = listOf(attrs.labels);
    let count;
    if (ui === 'scatter') count = groupRows().reduce((a, r) => a + Math.min(tokens(r.x).length, tokens(r.y).length), 0);
    else count = Math.max(0, ...(attrs.values || '').split('|').map((v) => tokens(v).length));
    return Array.from({ length: count }, (_, i) => ({ key: labels[i] && ui !== 'scatter' ? labels[i] : String(i), text: labels[i] || `Point ${i + 1}` }));
  }
  function noteRows() {
    return (attrs.notes || '').split(';').filter(Boolean).map((part) => {
      const k = part.indexOf(':');
      return { key: part.slice(0, k).trim(), text: part.slice(k + 1).trim() };
    });
  }
  function writeNotes(rows) {
    set('notes', rows.filter((r) => r.text).map((r) => `${r.key}:${r.text.replace(/[;:]/g, ' ')}`).join(';'));
  }
  function renderNotes() {
    const box = root.querySelector('[data-block="notes"]');
    if (!box || isTyping(box)) return;
    const pts = notePoints(), rows = noteRows();
    const options = (key) => pts.map((p) => `<option value="${esc(p.key)}"${p.key === key ? ' selected' : ''}>${esc(p.text)}</option>`).join('');
    box.innerHTML = `<div class="block__head"><span>Notes</span></div>` +
      rows.map((r, i) => `
      <div class="nrow" data-row="${i}">
        <select data-nkey aria-label="Note ${i + 1} point">${options(r.key)}</select>
        <input type="text" data-ntext value="${esc(r.text)}" placeholder="e.g. Launch day" aria-label="Note ${i + 1} wording">
        <button type="button" class="icon-btn" data-nremove aria-label="Remove note ${i + 1}">×</button>
      </div>`).join('') +
      `<p class="hint">Pin a short note to a point, like a launch or a record.</p>` +
      (pts.length ? `<button type="button" class="btn" data-nadd>Add a note</button>` : '');
  }

  /* colours */
  function themeNow() {
    if (attrs.theme === 'dark' || attrs.theme === 'light') return attrs.theme;
    return el?.resolvedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function colourSlots() {
    const labels = listOf(attrs.labels);
    const valuesCount = tokens(attrs.values).length;
    switch (ui) {
      case 'combo': {
        const rows = seriesRows(), lines = String(attrs.line || '').split('|').filter((v) => v.trim()), names = listOf(attrs['line-series']);
        return rows.map((r, i) => r.name || (rows.length > 1 ? `Bars ${i + 1}` : 'Bars')).concat(lines.map((_, i) => names[i] || (lines.length > 1 ? `Line ${i + 1}` : 'Line')));
      }
      case 'line': case 'area': case 'bars': case 'grouped': case 'histogram': case 'boxplot': {
        const rows = seriesRows();
        return rows.length > 1 ? rows.map((r, i) => r.name || `Series ${i + 1}`) : [ui === 'line' ? 'Line' : ui === 'area' ? 'Area' : 'Bars'];
      }
      case 'scatter': {
        const rows = groupRows();
        return rows.length > 1 ? rows.map((r, i) => r.name || `Group ${i + 1}`) : ['Points'];
      }
      case 'ring': case 'donut': case 'progress': {
        const n = Math.max(1, Math.min(ui === 'donut' ? 6 : 8, valuesCount));
        return Array.from({ length: n }, (_, i) => (ui === 'donut' && valuesCount > 6 && i === 5 ? 'Other' : labels[i] || `#${i + 1}`));
      }
      case 'waterfall':
        return ['Rise', 'Fall', 'Total'];
      case 'bullet':
        return ['Actual'];
      case 'gauge': {
        const z = tokens(attrs.zones).length;
        return z ? ['Low', 'Middle', 'High', 'Very high', 'Top'].slice(0, Math.min(5, z + 1)) : ['Reading'];
      }
      default:
        return ['Colour'];
    }
  }
  function colourValues(slots) {
    const th = customElements.get('bezel-chart').themes[themeNow()];
    const given = listOf(attrs.color);
    const base = given.length ? given : ui === 'gauge' && tokens(attrs.zones).length ? [th.up, th.palette[3], th.down] : ui === 'waterfall' ? [th.up, th.down, th.palette[0]] : th.palette;
    return slots.map((_, i) => base[i % base.length]);
  }
  function renderColours() {
    const box = root.querySelector('[data-block="colours"]');
    if (!box || isTyping(box)) return;
    const th = customElements.get('bezel-chart').themes[themeNow()];
    const slots = colourSlots(), values = colourValues(slots);
    const changed = 'color' in attrs || 'background' in attrs;
    box.innerHTML = `<div class="block__head"><span>Colours</span>${changed ? '<button type="button" class="link" data-creset>Reset colours</button>' : ''}</div>
      <div class="swatches">
        ${slots.map((name, i) => `<label class="sw"><input type="color" value="${esc(values[i])}" data-colour="${i}"><span>${esc(name)}</span></label>`).join('')}
        <label class="sw sw--bg"><input type="color" value="${esc(attrs.background || th.tile)}" data-bg-colour><span>Tile</span></label>
      </div>
      ${changed ? '' : '<p class="hint">Default colours adapt to light and dark. Picking your own fixes them.</p>'}`;
  }

  /* hide fields that don't apply yet */
  function syncWhen() {
    root.querySelectorAll('.f[data-fi]').forEach((node) => {
      const f = FIELDS[+node.dataset.fi];
      node.hidden = f.when ? !f.when(attrs, ui) : false;
    });
  }

  /* friendly warnings for numbers that aren't numbers */
  function warnFor(textarea) {
    const warn = textarea.parentElement.querySelector('.warn');
    if (!warn) return;
    const bad = badTokens(textarea.value);
    warn.hidden = !bad.length;
    warn.textContent = bad.length ? `“${bad[0]}” isn't a number, so it's drawn as 0.` : '';
  }
  function validateAll() {
    root.querySelectorAll('[data-numbers], [data-svalues], [data-num]').forEach(warnFor);
    root.querySelectorAll('.srow').forEach((row) => {
      const gx = row.querySelector('[data-gx]'), gy = row.querySelector('[data-gy]');
      if (!gx) return;
      const warn = row.querySelector('.warn'), nx = tokens(gx.value).length, ny = tokens(gy.value).length;
      const bad = badTokens(gx.value + ' ' + gy.value);
      warn.hidden = nx === ny && !bad.length;
      warn.textContent = bad.length ? `“${bad[0]}” isn't a number, so it's drawn as 0.` : nx !== ny ? `Across has ${nx} values and up has ${ny}. Points need one of each, so ${Math.abs(nx - ny)} will be left out.` : '';
    });
  }

  /* events from all three panes */
  const panel = root.querySelector('.panel');
  panel.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.key && t.type === 'range') {
      t.previousElementSibling?.querySelector('output') && (t.previousElementSibling.querySelector('output').textContent = t.value);
      set(t.dataset.key, Number(t.value) === Number(t.dataset.def) ? '' : t.value);
    } else if (t.matches('[data-numbers]')) {
      set(t.dataset.key, numbersFrom(t.value));
      warnFor(t);
    } else if (t.matches('[data-list]')) {
      set(t.dataset.key, listFrom(t.value));
    } else if (t.matches('[data-num]')) {
      set(t.dataset.key, isNum(t.value) ? String(Number(cleanNum(t.value))) : t.value.trim());
      warnFor(t);
    } else if (t.dataset.key && (t.type === 'text' || t.type === 'date')) {
      set(t.dataset.key, t.value.trim());
    } else if (t.matches('[data-svalues], [data-sname]')) {
      const rows = seriesRows(), i = +t.closest('[data-row]').dataset.row;
      if (t.matches('[data-svalues]')) { rows[i].values = t.value; warnFor(t); } else rows[i].name = t.value;
      writeSeries(rows);
    } else if (t.matches('[data-gx], [data-gy], [data-gname]')) {
      const rows = groupRows(), i = +t.closest('[data-row]').dataset.row;
      if (t.matches('[data-gx]')) rows[i].x = t.value; else if (t.matches('[data-gy]')) rows[i].y = t.value; else rows[i].name = t.value;
      writeGroups(rows);
      validateAll();
    } else if (t.matches('[data-ntext]')) {
      const rows = noteRows(), i = +t.closest('[data-row]').dataset.row;
      rows[i].text = t.value;
      writeNotes(rows);
    } else if (t.matches('[data-colour]')) {
      const slots = colourSlots(), values = colourValues(slots);
      values[+t.dataset.colour] = t.value;
      set('color', values.join(','));
    } else if (t.matches('[data-bg-colour]')) {
      set('background', t.value);
    } else return;
    update();
  });

  panel.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'import-file') {
      importFile(t.files?.[0]);
      t.value = '';
      return;
    }
    if (t.matches('select[data-key]')) set(t.dataset.key, t.value);
    else if (t.matches('[data-stat]')) set('stat', t.value === statDefault(ui) ? '' : t.value);
    else if (t.matches('[data-toggle]')) {
      const f = FIELDS.find((x) => x.key === t.dataset.toggle && x.kind === 'toggle' && x.only.includes(ui));
      if (f.invert === true) set(f.key, t.checked ? null : true);
      else if (f.invert) set(f.key, t.checked ? null : f.invert);
      else set(f.key, t.checked ? f.value || true : null);
      if (f.key === 'horizontal') { update(); renderPanes(); return; }
    } else if (t.matches('[data-nkey]')) {
      const rows = noteRows(), i = +t.closest('[data-row]').dataset.row;
      rows[i].key = t.value;
      writeNotes(rows);
    } else if (t.matches('[data-colour], [data-bg-colour]')) {
      update();
      renderColoursNow();
      return;
    } else return;
    update();
  });

  // Colour inputs keep focus after a pick, so redraw the block once the change is final.
  const renderColoursNow = () => {
    const box = root.querySelector('[data-block="colours"]');
    if (box) { document.activeElement?.blur?.(); renderColours(); }
  };

  panel.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-import]')) {
      root.querySelector('#import-file').click();
      return;
    }
    if (t.dataset.sample) {
      const sample = SAMPLES.find((s) => s.file === t.dataset.sample);
      fetch(`samples/${sample.file}`)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error())))
        .then((text) => importFile(new File([text], sample.file, { type: 'text/csv' }), sample))
        .catch(() => toast("Couldn't load the sample. Check your connection and try again."));
      return;
    }
    if (t.dataset.seg) {
      set(t.dataset.seg, t.dataset.val);
      t.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      update();
      if (t.dataset.seg === 'theme') renderColours();
      return;
    }
    if (t.matches('[data-sadd]')) {
      const rows = seriesRows();
      const n = tokens(rows[0]?.values).length || 4;
      if (rows.length === 1 && !rows[0].name) rows[0].name = 'Series 1';
      rows.push({ name: `Series ${rows.length + 1}`, values: Array.from({ length: n }, (_, i) => Math.round(10 + ((i * 7 + rows.length * 5) % 13))).join(',') });
      writeSeries(rows);
    } else if (t.matches('[data-sremove]')) {
      const rows = seriesRows();
      rows.splice(+t.closest('[data-row]').dataset.row, 1);
      if (rows.length === 1 && /^Series \d+$/.test(rows[0].name)) rows[0].name = '';
      writeSeries(rows);
      if ('color' in attrs) set('color', listOf(attrs.color).slice(0, Math.max(1, rows.length)).join(','));
    } else if (t.matches('[data-gadd]')) {
      const rows = groupRows();
      if (rows.length === 1 && !rows[0].name) rows[0].name = 'Group 1';
      rows.push({ name: `Group ${rows.length + 1}`, x: '1,2,3,4,5', y: '3,5,4,7,8' });
      writeGroups(rows);
    } else if (t.matches('[data-gremove]')) {
      const rows = groupRows();
      rows.splice(+t.closest('[data-row]').dataset.row, 1);
      if (rows.length === 1 && /^Group \d+$/.test(rows[0].name)) rows[0].name = '';
      writeGroups(rows);
    } else if (t.matches('[data-nadd]')) {
      const rows = noteRows(), pts = notePoints();
      const used = new Set(rows.map((r) => r.key));
      const free = pts.find((p) => !used.has(p.key)) || pts[0];
      rows.push({ key: free.key, text: 'Note' });
      writeNotes(rows);
      update();
      renderNotes();
      root.querySelector('[data-block="notes"] .nrow:last-of-type [data-ntext]')?.select();
      return;
    } else if (t.matches('[data-nremove]')) {
      const rows = noteRows();
      rows.splice(+t.closest('[data-row]').dataset.row, 1);
      writeNotes(rows);
      update();
      renderNotes();
      return;
    } else if (t.matches('[data-creset]')) {
      delete attrs.color;
      delete attrs.background;
    } else if (t.matches('[data-sample-year]')) {
      const s = sampleYear();
      attrs.start = s.start;
      attrs.values = s.values;
    } else return;
    update();
    renderPanes();
  });

  /* pasting a table from a spreadsheet: anything with tabs is cells copied from Excel, Numbers or Sheets */
  panel.addEventListener('paste', (e) => {
    if (!e.target.matches('textarea, input[type="text"]')) return;
    const text = e.clipboardData?.getData('text/plain') || '';
    if (!/\t/.test(text)) return;
    e.preventDefault();
    if (useRows(parseDelimited(text), '', 'Pasted ')) {
      toast('Filled in from your spreadsheet');
    }
  });

  /* dropping a file anywhere on the Studio */
  root.addEventListener('dragover', (e) => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault();
    root.classList.add('is-drop');
  });
  root.addEventListener('dragleave', (e) => {
    if (!root.contains(e.relatedTarget)) root.classList.remove('is-drop');
  });
  root.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    root.classList.remove('is-drop');
    if (!file) return;
    e.preventDefault();
    importFile(file);
  });

  /* output */
  function chartHtml() {
    const keys = Object.keys(attrs).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
    const parts = keys.map((k) => (attrs[k] === '' ? k : `${k}="${esc(attrs[k])}"`));
    const tag = tagOf();
    const oneLine = `<${tag}${parts.length ? ' ' + parts.join(' ') : ''}></${tag}>`;
    return oneLine.length <= 90 ? oneLine : `<${tag}\n${parts.map((p) => '  ' + p).join('\n')}\n></${tag}>`;
  }
  const html = () => (withScript ? `${SCRIPT}\n\n${chartHtml()}` : chartHtml());
  function highlight(source) {
    return esc(source)
      .replace(/(&lt;\/?)(bezel-[a-z]+|script)/g, '$1<span class="t">$2</span>')
      .replace(/([\w-]+)=(&quot;.*?&quot;)/g, '<span class="a">$1</span>=<span class="s">$2</span>');
  }

  function update() {
    if (!el || el.localName !== tagOf()) {
      el = document.createElement(tagOf());
      frame.replaceChildren(el);
    }
    for (const a of [...el.attributes]) if (!(a.name in attrs)) el.removeAttribute(a.name);
    for (const [k, v] of Object.entries(attrs)) if (el.getAttribute(k) !== v) el.setAttribute(k, v);
    code.innerHTML = highlight(html());
    syncWhen();
    renderNotes();
    renderColours();
  }

  function choose(next, preset) {
    const kept = Object.fromEntries(KEEP.filter((k) => k in attrs).map((k) => [k, attrs[k]]));
    ui = next;
    attrs = { ...(preset || PRESETS[ui]), ...(preset ? {} : kept) };
    if (preset) { table = null; importNote = ''; sampleFile = ''; }
    if (table) {
      const note = applyTable(table).replace(/\.\s+([a-z])/g, (m, c) => `. ${c.toUpperCase()}`);
      importNote = note.startsWith('!') ? note : table.source + note;
    }
    if (ui === 'heatmap' && !attrs.values) Object.assign(attrs, sampleYear());
    picker.querySelectorAll('[data-ui]').forEach((b) => {
      const on = b.dataset.ui === ui;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (!widthTouched) {
      width.value = WIDE.has(ui) ? 640 : 400;
      fitWidthRange();
    }
    el = null;
    update();
    renderPanes();
  }

  /* buttons under the preview */
  const slug = () => (attrs.heading || byId[ui].name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart';
  $('#copy-html').addEventListener('click', () =>
    copyText(html(), withScript ? 'Copied the script and your chart. Paste both into your page.' : 'Chart copied. The page also needs the script line once.'));
  $('#with-script').addEventListener('change', (e) => {
    withScript = e.target.checked;
    code.innerHTML = highlight(html());
  });
  $('#copy-svg').addEventListener('click', () => copyText(el.toSVG(), 'SVG copied'));
  $('#save-svg').addEventListener('click', () => saveFile(`${slug()}.svg`, el.toSVG()));
  $('#share').addEventListener('click', () => {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify({ c: ui, a: attrs })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    copyText(`${location.origin}${location.pathname}#chart=${data}`, 'Link copied. It opens the Studio with this chart.');
  });
  $('#reset').addEventListener('click', () => {
    attrs = {};
    table = null;
    importNote = '';
    sampleFile = '';
    choose(ui);
    toast('Back to the sample data');
  });

  /** Loads a shared link like #chart=… if the page was opened with one. */
  function fromHash() {
    const m = /^#chart=([\w-]+)$/.exec(location.hash);
    if (!m) return false;
    try {
      const json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))));
      const { c, a } = JSON.parse(json);
      if (!byId[c] || typeof a !== 'object') return false;
      const safe = Object.fromEntries(Object.entries(a).filter(([k, v]) => ORDER.includes(k) && typeof v === 'string'));
      choose(c, safe);
      return true;
    } catch {
      return false;
    }
  }

  const pageDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  };
  canvas.dataset.bg = pageDark() ? 'dark' : 'light';
  root.querySelectorAll('[data-bg-set]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.bgSet === canvas.dataset.bg)));

  if (!fromHash()) choose('line');
  fitWidthRange();

  return {
    /** Opens a chart from the gallery in the Studio. */
    load(element) {
      const tag = element.localName.replace('bezel-', '');
      const a = {};
      for (const at of element.attributes) if (ORDER.includes(at.name)) a[at.name] = at.value;
      const id = tag === 'bars' && (a.values || '').includes('|') ? 'grouped' : tag;
      choose(id, a);
      showTab(tabs[0]);
      root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      toast(`${byId[id].name} loaded into the Studio`);
    },
    fromHash,
  };
}
