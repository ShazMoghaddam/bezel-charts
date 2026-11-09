/** Helpers for the charts with axes and several series: line, bars and scatter. Kept apart from util.js so the other charts don't load them. */
import { r2, list, series, fmt, tw, text, SANS } from './util.js';

export function niceScale(min, max, count) {
  if (min === max) {
    if (min === 0) max = 1;
    else { var p = Math.abs(min) * 0.1; min -= p; max += p; }
  }
  var step0 = (max - min) / (count || 4);
  var mag = Math.pow(10, Math.floor(Math.log10(step0)));
  var err = step0 / mag;
  var step = (err <= 1 ? 1 : err <= 2 ? 2 : err <= 5 ? 5 : 10) * mag;
  var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (var t = lo; t <= hi + step / 2; t += step) ticks.push(+t.toFixed(10));
  return { lo: lo, hi: hi, ticks: ticks };
}

/**
 * A wrapping row of coloured dots and series names. Returns the SVG and the height it used.
 * key(k, x, y) draws a different swatch, such as a dashed line, and kw is the room it takes before the name.
 */
export function legend(names, pal, th, x0, y0, w, key, kw) {
  var x = x0, y = y0, s = '', off = kw || 13;
  names.forEach(function (nm, k) {
    var wd = off + tw(nm, 12) + 16;
    if (x > x0 && x + wd - 16 > x0 + w) { x = x0; y += 20; }
    s += (key ? key(k, x, y) : '<circle cx="' + r2(x + 4) + '" cy="' + r2(y + 6) + '" r="4" fill="' + pal[k % pal.length] + '"/>') +
      text(x + off, y + 10, nm, 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
    x += wd;
  });
  return { svg: s, height: y - y0 + 24 };
}

/** Line dashes, marker shapes and bar patterns, so series differ by more than colour. "auto" hands them out in this order. */
export var DASHES = { solid: '', dashed: '7 5', dotted: '1 5', dashdot: '9 4 1 4' };
export var SHAPES = ['circle', 'square', 'triangle', 'diamond'];
export var PATTERNS = ['solid', 'stripes', 'dots', 'grid'];

/**
 * Reads dash, markers or patterns. The bare attribute or "auto" hands out every style in turn; a list sets one per series,
 * repeating like colours do. Returns a function from series index to style name, or null when the option is off.
 */
export function styleOf(v, names, off) {
  if (v == null || v === false || v === 'none' || v === 'false') return null;
  var l = v === true || v === '' || v === 'auto' ? names : list(v).map(function (s) { return names.indexOf(s) < 0 ? off : s; });
  if (!l.length) return null;
  return function (k) { return l[k % l.length]; };
}

/** A point marker centred on x, y. attrs carries the fill and stroke. */
export function marker(kind, x, y, r, attrs) {
  var a = r * 1.15, b = r * 0.85;
  if (kind === 'square') return '<rect x="' + r2(x - b) + '" y="' + r2(y - b) + '" width="' + r2(2 * b) + '" height="' + r2(2 * b) + '" rx="1"' + attrs + '/>';
  if (kind === 'triangle') return '<path d="M' + r2(x) + ',' + r2(y - a) + 'L' + r2(x + a) + ',' + r2(y + b) + 'L' + r2(x - a) + ',' + r2(y + b) + 'Z"' + attrs + '/>';
  if (kind === 'diamond') return '<path d="M' + r2(x) + ',' + r2(y - a * 1.1) + 'L' + r2(x + a) + ',' + r2(y) + 'L' + r2(x) + ',' + r2(y + a * 1.1) + 'L' + r2(x - a) + ',' + r2(y) + 'Z"' + attrs + '/>';
  return '<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r2(r) + '"' + attrs + '/>';
}

/** A fill pattern in colour c, with stripes, dots or a grid drawn in the tile colour so they show on any colour. */
export function pattern(id, kind, c, bg) {
  var ink = ' stroke="' + bg + '" stroke-opacity=".55" stroke-width="1.5"';
  return '<pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse"' + (kind === 'dots' ? '' : ' patternTransform="rotate(45)"') +
    '><rect width="6" height="6" fill="' + c + '"/>' +
    (kind === 'dots' ? '<circle cx="3" cy="3" r="1.3" fill="' + bg + '" fill-opacity=".55"/>' : '<path d="M3,0V6' + (kind === 'grid' ? 'M0,3H6' : '') + '"' + ink + '/>') +
    '</pattern>';
}

/** Value axis: gridlines plus tick labels on the left. Returns the axis width it reserved. */
export function axisWidth(ticks) {
  return Math.max.apply(null, ticks.map(function (t) { return tw(t, 10, true); })) + 10;
}

/** The data table for charts with labels and one or more series. total adds a column adding each row up. */
export function seriesTable(o, total) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), rows = [];
  var n = Math.max.apply(null, [0].concat(S.map(function (s) { return s.length; })));
  for (var i = 0; i < n; i++) {
    var row = [labels[i] || '#' + (i + 1)], t = 0;
    S.forEach(function (s) { row.push(i < s.length ? fmt(s[i], o) : ''); t += i < s.length ? s[i] : 0; });
    if (total) row.push(fmt(t, o));
    rows.push(row);
  }
  var head = S.length > 1 || names.length ? S.map(function (_, k) { return names[k] || 'Series ' + (k + 1); }) : ['Value'];
  return { head: ['Label'].concat(head, total ? ['Total'] : []), rows: rows };
}
