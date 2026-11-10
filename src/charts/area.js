import { newId, r2, num, has, list, series, bool, fmt, pathOf, text, small, palette, emptyState, parseNotes, statOf } from '../core/util.js';
import { seriesTable, styleOf, pattern, DASHES, SHAPES, PATTERNS } from '../core/series.js';
import { xyFrame, xyFinish } from '../core/xy.js';
import { lineKey, seriesLine, pointMarks } from '../core/lines.js';
import { parseDates, hasTimes, pointName, datedTable } from '../core/time.js';
import { tile } from '../core/tile.js';

/**
 * Areas over time. Several series overlap as see-through fills; `stacked` piles them so the top edge is the total,
 * and stacked="percent" scales each column to 100% to show shares. The axis always includes zero, since an area's
 * height reads as an amount.
 */
export default function area(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var h = num(o.height, 170), k = S.length, n = Math.max.apply(null, [0].concat(S.map(function (s) { return s.length; })));
  var mode = k > 1 ? (o.stacked === 'percent' ? 'percent' : bool(o.stacked) ? 'stack' : '') : '';
  var notes = parseNotes(o, labels), multi = k > 1 || names.length > 0;
  var nameOf = function (j) { return names[j] || 'Series ' + (j + 1); };
  var val = function (j, i) { return i < S[j].length ? S[j][i] : 0; };

  // Where each band starts and ends in every column. In a stack, positive parts pile up from zero and negative parts
  // down from it, as stacked bars do. In a percent stack, each column's positive parts are scaled to add up to 100.
  var lows = S.map(function () { return []; }), highs = S.map(function () { return []; }), totals = [], pos = [];
  for (var i = 0; i < n; i++) {
    var up = 0, down = 0, t = 0, p = 0;
    for (var j = 0; j < k; j++) { t += val(j, i); p += Math.max(0, val(j, i)); }
    totals.push(t); pos.push(p);
    for (j = 0; j < k; j++) {
      var v = mode === 'percent' ? (p ? Math.max(0, val(j, i)) / p * 100 : 0) : val(j, i);
      if (!mode) { lows[j].push(0); highs[j].push(v); }
      else if (v >= 0) { lows[j].push(up); up += v; highs[j].push(up); }
      else { lows[j].push(down); down += v; highs[j].push(down); }
    }
  }
  var edges = [].concat.apply([], lows.concat(highs));

  var dashOf = styleOf(o.dash, Object.keys(DASHES), 'solid'), markOf = styleOf(o.markers, SHAPES, 'none');
  var patOf = k > 1 ? styleOf(o.patterns, PATTERNS, 'solid') : null, bg = o.background || th.tile, defs = '', fills = [];
  for (var q = 0; patOf && q < k; q++) {
    if (patOf(q) === 'solid') continue;
    var pid = newId('g');
    defs += pattern(pid, patOf(q), pal[q % pal.length], bg);
    fills[q] = 'url(#' + pid + ')';
  }
  // The legend shows each band's pattern, or a sample of its edge when lines have dashes or markers.
  var key = patOf
    ? function (j, x, y) { return '<rect x="' + r2(x) + '" y="' + r2(y + 1) + '" width="10" height="10" rx="2" fill="' + (fills[j] || pal[j % pal.length]) + '"/>'; }
    : (dashOf || markOf) && lineKey(pal, dashOf, markOf, bg);
  var T = parseDates(o, n), timed = T && hasTimes(T), lang = o.lang || 'en-GB';
  var share = function (j, i) { return pos[i] ? Math.round(Math.max(0, val(j, i)) / pos[i] * 100) : 0; };

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!n) return emptyState(th, x0, y0, w, h);
    var f = xyFrame(o, th, {
      n: n, names: multi ? S.map(function (_, j) { return nameOf(j); }) : null, pal: pal, key: key, kw: key && (patOf ? 15 : 24),
      lo: Math.min.apply(null, edges), hi: Math.max.apply(null, edges), zero: true, labels: labels, notes: notes, dates: T,
      // Areas are measured from zero, so a min above zero would cut off their base: only max and a min at or below zero apply.
      min: has(o.min) && +o.min <= 0 ? +o.min : NaN, max: has(o.max) ? +o.max : NaN,
      tick: mode === 'percent' ? function (t) { return fmt(t, { lang: o.lang }, true) + '%'; } : function (t) { return fmt(t, o, true); },
    }, x0, y0, w, h);
    var s = (defs ? '<defs>' + defs + '</defs>' : '') + f.svg + (f.clip ? '<g' + f.clip + '>' : ''), X = f.X, Y = f.Y;
    // One value stretches across the chart, like a line chart does.
    var pts = function (ys) {
      var P = ys.map(function (y, i) { return [X(i), Y(y)]; });
      return P.length === 1 ? [[f.px, P[0][1]], [f.px + f.pw, P[0][1]]] : P;
    };
    var straight = bool(o.straight), alpha = mode ? '.8' : '.22';
    var shown = function (j) { return mode ? highs[j] : S[j]; };
    // Fills first, so no band covers another's edge.
    S.forEach(function (_, j) {
      var top = pts(shown(j)), base = pts(mode ? lows[j] : shown(j).map(function () { return 0; })).reverse();
      s += '<path d="' + pathOf(top, straight) + pathOf(base, straight).replace(/^M/, 'L') + 'Z" fill="' + (fills[j] || pal[j % pal.length]) +
        '" fill-opacity="' + alpha + '"' + (o.animate ? ' class="bzc-a" style="animation-delay:' + r2(j * 0.1) + 's"' : '') + '/>';
    });
    S.forEach(function (_, j) {
      var c = pal[j % pal.length], ys = shown(j), P = pts(ys), mk = markOf ? markOf(j) : 'none';
      s += seriesLine(o, pathOf(P, straight), c, j, dashOf ? DASHES[dashOf(j)] : '');
      if (mk !== 'none') s += pointMarks(o, mk, ys, X, Y, c, bg, j);
      else if (!mode) s += '<circle cx="' + r2(P[P.length - 1][0]) + '" cy="' + r2(P[P.length - 1][1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>';
      if (bool(o.showValues) && !mode) ys.forEach(function (y, i) { s += text(X(i), Y(y) - 8, fmt(y, o, true), small(th, 9, 'text-anchor="middle"')); });
    });
    // A stack writes its total above each column. Every column of a percent stack is 100%, so it writes nothing.
    if (bool(o.showValues) && mode === 'stack') {
      totals.forEach(function (t, i) {
        var top = Math.max.apply(null, highs.map(function (hs) { return hs[i]; }).concat([0]));
        s += text(X(i), Y(top) - 8, fmt(t, o, true), small(th, 9, 'text-anchor="middle"'));
      });
    }
    return s + (f.clip ? '</g>' : '') + xyFinish(o, th, f, n, function (i) {
      var tip = pointName(labels, T, i, lang, timed);
      S.forEach(function (ser, j) {
        if (i < ser.length) tip += '\n' + (multi ? nameOf(j) + ': ' : '') + fmt(ser[i], o) + (mode === 'percent' ? ' (' + share(j, i) + '%)' : '');
      });
      return tip + (mode ? '\nTotal: ' + fmt(totals[i], o) : '');
    }, S);
  }, {
    stat: statOf(mode ? totals : S[0] || [], o, ''),
    summary: k + ' series ' + (mode === 'percent' ? 'as shares of each total' : mode ? 'stacked' : 'filled') + ' over ' + n + ' points',
  });
}

area.table = function (o) {
  var S = series(o.values), t = seriesTable(o, S.length > 1 && (o.stacked === 'percent' || bool(o.stacked)));
  return datedTable(t, o, t.rows.length);
};
