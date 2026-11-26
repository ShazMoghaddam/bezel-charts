import { newId, r2, num, has, list, series, bool, fmt, fmtv, real, runsOf, gapNote, fillOf, pathOf, text, small, anim, palette, emptyState, parseNotes, statOf } from '../core/util.js';
import { seriesTable, styleOf, DASHES, SHAPES } from '../core/series.js';
import { xyFrame, xyFinish } from '../core/xy.js';
import { lineKey, seriesLine, pointMarks, runsPath, loneDots } from '../core/lines.js';
import { parseDates, hasTimes, pointName, datedTable } from '../core/time.js';
import { tile } from '../core/tile.js';
import { bandsOf, bandValues, bandKey, drawBands, bandTip, bandTable, bandAt } from '../core/bands.js';

/**
 * One or more lines over time. Bands add shaded ranges with a middle line, for fan charts such as forecast scenarios:
 * band-low="..." band-high="..." band-mid="..." band-series="Bad,Middling,Good", bands separated by "|".
 */
export default function line(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th), B = bandsOf(o, pal, S.length);
  var h = num(o.height, 170), n = Math.max.apply(null, [0].concat(S.map(function (s) { return s.length; }), B.map(function (b) { return b.n; })));
  var notes = parseNotes(o, labels), multi = S.length > 1 || names.length > 0 || B.length > 0;
  var st = statOf(S[0] || [], o, '');
  var dashOf = styleOf(o.dash, Object.keys(DASHES), 'solid'), markOf = styleOf(o.markers, SHAPES, 'none');
  var bg = o.background || th.tile;
  // With dashes, markers or bands, the legend shows a short sample of each line instead of a dot, and each band's shading.
  var key = (dashOf || markOf || B.length) && lineKey(pal, dashOf, markOf, bg);
  if (B.length) key = (function (lk) { return function (k, x, y) { return k < S.length ? lk(k, x, y) : bandKey(B[k - S.length], x, y); }; })(key);
  var nameOf = function (k) { return names[k] || 'Series ' + (k + 1); };
  var T = parseDates(o, n), timed = T && hasTimes(T), lang = o.lang || 'en-GB';
  // A log scale needs positive values; zero and negative ones leave gaps. With none at all, the axis stays linear.
  var flat = [].concat.apply([], S), all = real(flat.concat(bandValues(B))), pos = all.filter(function (v) { return v > 0; });
  if (has(o.goal) && +o.goal > 0) pos.push(+o.goal);
  // Bands are shaded already, so the soft fill under the first line is off unless you ask for it.
  var log = bool(o.log) && pos.length > 0, fill = B.length && !has(o.fill) ? 'none' : fillOf(o);
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!all.length) return emptyState(th, x0, y0, w, h);
    var f = xyFrame(o, th, {
      n: n, names: multi ? S.map(function (_, k) { return nameOf(k); }).concat(B.map(function (b) { return b.name; })) : null, pal: pal, key: key, kw: key && 24,
      lo: Math.min.apply(null, all), hi: Math.max.apply(null, all), zero: bool(o.zero), labels: labels, notes: notes,
      tick: function (t) { return fmt(t, o, true); }, dates: T, min: has(o.min) ? +o.min : NaN, max: has(o.max) ? +o.max : NaN,
      log: log, posLo: log ? Math.min.apply(null, pos) : 0, posHi: log ? Math.max.apply(null, pos) : 0,
    }, x0, y0, w, h);
    var s = f.svg + (f.clip ? '<g' + f.clip + '>' : ''), X = f.X, Y = f.Y, px = f.px, pw = f.pw, top = f.top, ph = f.ph;
    // Bands go underneath, so the lines read on top of them.
    if (B.length) s += drawBands(o, B, X, Y, bool(o.straight), bg, S.length);
    S.forEach(function (v, k) {
      var c = pal[k % pal.length];
      var P = v.map(function (y, i) { return [X(i), Y(y)]; });
      if (P.length === 1) P = [[px, P[0][1]], [px + pw, P[0][1]]];
      // The line breaks at a missing value, and on a log scale around points it can't place.
      var runs = runsOf(P);
      if (!runs.length) return;
      var d = runsPath(runs, bool(o.straight));
      P = [].concat.apply([], runs);
      // A soft fill under the first line, every line or none. It has no floor to reach on a log scale, so it's left out there.
      if ((fill === 'all' || fill === 'first' && k === 0) && !log) {
        var g = newId('g');
        s += '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity="' + (fill === 'all' && S.length > 1 ? '.16' : '.26') + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
          '<path d="' + runs.map(function (r) {
            return pathOf(r, bool(o.straight)) + 'L' + r2(r[r.length - 1][0]) + ',' + r2(top + ph) + 'L' + r2(r[0][0]) + ',' + r2(top + ph) + 'Z';
          }).join('') + '" fill="url(#' + g + ')"' + anim(o, 'bzc-a') + '/>';
      }
      var mk = markOf ? markOf(k) : 'none';
      s += seriesLine(o, d, c, k, dashOf ? DASHES[dashOf(k)] : '');
      if (mk !== 'none') {
        s += pointMarks(o, mk, v, X, Y, c, bg, k);
      } else {
        s += loneDots(runs, c);
        var e = P[P.length - 1];
        s += '<circle cx="' + r2(e[0]) + '" cy="' + r2(e[1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>';
      }
      if (bool(o.showValues)) v.forEach(function (y, i) { if (isFinite(Y(y))) s += text(X(i), Y(y) - 8, fmt(y, o, true), small(th, 9, 'text-anchor="middle"')); });
    });
    return s + (f.clip ? '</g>' : '') + xyFinish(o, th, f, n, function (j) {
      var tip = pointName(labels, T, j, lang, timed);
      var tips = B.map(function (b) { return bandTip(b, j, o); }).join('');
      // Where the bands carry on past a line, such as a forecast after its history, the line's gap isn't listed.
      S.forEach(function (v, k) { if (j < v.length && !(tips && !isFinite(v[j]))) tip += '\n' + (multi ? nameOf(k) + ': ' : '') + fmtv(v[j], o); });
      return tip + tips;
    }, S);
  }, {
    stat: st,
    // A line that stops where the bands carry on, such as history before a forecast, isn't missing anything there.
    summary: S.length + ' series' + (B.length ? ' and ' + B.length + (B.length === 1 ? ' band' : ' bands') : '') + ' over ' + n + ' points' +
      gapNote(B.length ? [].concat.apply([], S.map(function (v) { return v.filter(function (_, i) { return !bandAt(B, i); }); })) : flat),
  });
}

line.table = function (o) {
  var t = seriesTable(o), S = series(o.values), B = bandsOf(o, [''], S.length), labels = list(o.labels);
  var n = Math.max.apply(null, [t.rows.length].concat(B.map(function (b) { return b.n; })));
  // Bands can run past the lines, so the table runs to the longest of them.
  for (var i = t.rows.length; i < n; i++) t.rows.push([labels[i] || '#' + (i + 1)].concat(S.map(function () { return ''; })));
  return datedTable(B.length ? bandTable(t, B, o, n) : t, o, n);
};
