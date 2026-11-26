/**
 * Bands for line charts: shaded ranges between a low and a high series, each with an optional middle line. Used for
 * fan charts, such as forecast scenarios that carry on from a history line. Only line charts load this.
 */
import { r2, has, list, nums, series, fmt, ok, runsOf, pathOf, anim } from './util.js';
import { DASHES } from './series.js';
import { seriesLine } from './lines.js';

/** Middle lines are dashed, a different dash per band, so bands differ by more than colour. */
var MID_DASHES = ['dashed', 'dotted', 'dashdot'];

/**
 * The bands, from a bands array ({ name, low, high, mid, color }) given from JavaScript or Python, or from the
 * band-low, band-high, band-mid, band-series and band-color attributes, with bands separated by "|".
 * Each band gets a name, a colour (after the line colours, k is how many lines there are) and a dash.
 */
export function bandsOf(o, pal, k) {
  var B;
  if (Array.isArray(o.bands)) {
    B = o.bands.filter(function (b) { return b && typeof b === 'object'; }).map(function (b) {
      return { low: nums(b.low), high: nums(b.high), mid: nums(b.mid), name: b.name, color: b.color };
    });
  } else {
    var L = series(o.bandLow), H = series(o.bandHigh), M = series(o.bandMid), names = list(o.bandSeries), cols = list(o.bandColor);
    B = [];
    for (var j = 0; j < Math.max(L.length, H.length, M.length); j++) B.push({ low: L[j] || [], high: H[j] || [], mid: M[j] || [], name: names[j], color: cols[j] });
  }
  return B.map(function (b, j) {
    return {
      low: b.low, high: b.high, mid: b.mid, name: has(b.name) ? String(b.name) : 'Band ' + (j + 1),
      color: has(b.color) ? String(b.color) : pal[(k + j) % pal.length], dash: MID_DASHES[j % MID_DASHES.length],
      n: Math.max(b.low.length, b.high.length, b.mid.length),
    };
  });
}

/** Whether any band has a value at point i. */
export function bandAt(B, i) {
  return B.some(function (b) { return ok(b.low[i]) || ok(b.high[i]) || ok(b.mid[i]); });
}

/** Every number in the bands, for the value axis. */
export function bandValues(B) {
  return [].concat.apply([], B.map(function (b) { return b.low.concat(b.high, b.mid); }));
}

/** A legend swatch for a band: its shading, with its middle line's dash across it when it has one. */
export function bandKey(b, x, y) {
  return '<rect x="' + r2(x) + '" y="' + r2(y + 1) + '" width="18" height="10" rx="2" fill="' + b.color + '" fill-opacity=".28"/>' + (!b.mid.some(ok) ? '' :
    '<line x1="' + r2(x + 1) + '" x2="' + r2(x + 17) + '" y1="' + r2(y + 6) + '" y2="' + r2(y + 6) + '" stroke="' + b.color + '" stroke-width="2" stroke-dasharray="' + DASHES[b.dash] + '"/>');
}

/**
 * The shaded ranges, then the middle lines on top. Where a low or high is missing the shading breaks, as lines do.
 * Each band has a faint edge, so it still reads where bands overlap or in greyscale.
 */
export function drawBands(o, B, X, Y, straight, bg, k0) {
  var s = '';
  B.forEach(function (b, j) {
    var hi = [], lo = [];
    for (var i = 0; i < b.n; i++) { hi.push([X(i), Y(b.high[i])]); lo.push([X(i), Y(b.low[i])]); }
    var runs = runsOf(hi.map(function (p, i) { return [i, isFinite(p[1]) && isFinite(lo[i][1]) ? 1 : NaN]; }));
    var fill = '', edge = '';
    runs.forEach(function (r) {
      var a = r[0][0], z = r[r.length - 1][0] + 1, top = hi.slice(a, z), base = lo.slice(a, z);
      fill += pathOf(top, straight) + pathOf(base.slice().reverse(), straight).replace(/^M/, 'L') + 'Z';
      edge += pathOf(top, straight) + pathOf(base, straight);
    });
    if (fill) {
      s += '<path d="' + fill + '" fill="' + b.color + '" fill-opacity=".2"' + anim(o, 'bzc-a', j * 0.1) + '/>' +
        '<path d="' + edge + '" fill="none" stroke="' + b.color + '" stroke-opacity=".5" stroke-width="1"' + anim(o, 'bzc-a', j * 0.1) + '/>';
    }
  });
  B.forEach(function (b, j) {
    var mid = runsOf(b.mid.map(function (v, i) { return [X(i), Y(v)]; }));
    if (!mid.length) return;
    var e = mid[mid.length - 1], last = e[e.length - 1];
    s += seriesLine(o, mid.map(function (r) { return pathOf(r, straight); }).join(''), b.color, k0 + j, DASHES[b.dash]) +
      '<circle cx="' + r2(last[0]) + '" cy="' + r2(last[1]) + '" r="3.5" fill="' + b.color + '" stroke="' + bg + '" stroke-width="2"/>';
  });
  return s;
}

/**
 * A band's line in a tooltip at point i, such as "Good: 120 to 180, mid 150", or '' where it has nothing there. Where
 * the band narrows to one number, such as where it starts from the last actual value, it just gives that number.
 */
export function bandTip(b, i, o) {
  var lo = b.low[i], hi = b.high[i], mid = b.mid[i], range = ok(lo) && ok(hi);
  if (!range && !ok(mid)) return '';
  if (range && lo === hi && (!ok(mid) || mid === lo)) return '\n' + b.name + ': ' + fmt(lo, o);
  return '\n' + b.name + ': ' + (range ? fmt(lo, o) + ' to ' + fmt(hi, o) : '') + (ok(mid) ? (range ? ', mid ' : 'mid ') + fmt(mid, o) : '');
}

/** The data table's columns for the bands: low, middle (when a band has one) and high. */
export function bandTable(t, B, o, n) {
  B.forEach(function (b) {
    var mids = b.mid.some(ok);
    t.head.push(b.name + ' low');
    if (mids) t.head.push(b.name + ' mid');
    t.head.push(b.name + ' high');
    for (var i = 0; i < n; i++) {
      var cell = function (v) { return i < v.length ? fmt(v[i], o) : ''; };
      t.rows[i].push(cell(b.low));
      if (mids) t.rows[i].push(cell(b.mid));
      t.rows[i].push(cell(b.high));
    }
  });
  return t;
}
