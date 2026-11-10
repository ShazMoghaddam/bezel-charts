import { newId, r2, num, has, list, series, bool, fmt, pathOf, text, small, anim, palette, emptyState, parseNotes, statOf } from '../core/util.js';
import { seriesTable, styleOf, DASHES, SHAPES } from '../core/series.js';
import { xyFrame, xyFinish } from '../core/xy.js';
import { lineKey, seriesLine, pointMarks } from '../core/lines.js';
import { parseDates, hasTimes, pointName, datedTable } from '../core/time.js';
import { tile } from '../core/tile.js';

export default function line(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var h = num(o.height, 170), n = Math.max.apply(null, [0].concat(S.map(function (s) { return s.length; })));
  var notes = parseNotes(o, labels), multi = S.length > 1 || names.length > 0;
  var st = statOf(S[0] || [], o, '');
  var dashOf = styleOf(o.dash, Object.keys(DASHES), 'solid'), markOf = styleOf(o.markers, SHAPES, 'none');
  var bg = o.background || th.tile;
  // With dashes or markers, the legend shows a short sample of each line instead of a dot.
  var key = (dashOf || markOf) && lineKey(pal, dashOf, markOf, bg);
  var nameOf = function (k) { return names[k] || 'Series ' + (k + 1); };
  var T = parseDates(o, n), timed = T && hasTimes(T), lang = o.lang || 'en-GB';
  // A log scale needs positive values; zero and negative ones leave gaps. With none at all, the axis stays linear.
  var all = [].concat.apply([], S), pos = all.filter(function (v) { return v > 0; });
  if (has(o.goal) && +o.goal > 0) pos.push(+o.goal);
  var log = bool(o.log) && pos.length > 0;
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!n) return emptyState(th, x0, y0, w, h);
    var f = xyFrame(o, th, {
      n: n, names: multi ? S.map(function (_, k) { return nameOf(k); }) : null, pal: pal, key: key, kw: key && 24,
      lo: Math.min.apply(null, all), hi: Math.max.apply(null, all), zero: bool(o.zero), labels: labels, notes: notes,
      tick: function (t) { return fmt(t, o, true); }, dates: T, min: has(o.min) ? +o.min : NaN, max: has(o.max) ? +o.max : NaN,
      log: log, posLo: log ? Math.min.apply(null, pos) : 0, posHi: log ? Math.max.apply(null, pos) : 0,
    }, x0, y0, w, h);
    var s = f.svg + (f.clip ? '<g' + f.clip + '>' : ''), X = f.X, Y = f.Y, px = f.px, pw = f.pw, top = f.top, ph = f.ph;
    S.forEach(function (v, k) {
      var c = pal[k % pal.length];
      var P = v.map(function (y, i) { return [X(i), Y(y)]; });
      if (P.length === 1) P = [[px, P[0][1]], [px + pw, P[0][1]]];
      // On a log scale the line breaks around points it can't place.
      var runs = log ? P.reduce(function (r, p) {
        if (isFinite(p[1])) r[r.length - 1].push(p); else if (r[r.length - 1].length) r.push([]);
        return r;
      }, [[]]).filter(function (r) { return r.length; }) : [P];
      if (!runs.length) return;
      var d = runs.map(function (r) { return pathOf(r, bool(o.straight)); }).join('');
      P = [].concat.apply([], runs);
      // The soft fill under the first line has no floor to reach on a log scale, so it's left out there.
      if (k === 0 && !log) {
        var g = newId('g'), last = P[P.length - 1];
        s += '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".26"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
          '<path d="' + d + 'L' + r2(last[0]) + ',' + r2(top + ph) + 'L' + r2(P[0][0]) + ',' + r2(top + ph) + 'Z" fill="url(#' + g + ')"' + anim(o, 'bzc-a') + '/>';
      }
      var mk = markOf ? markOf(k) : 'none';
      s += seriesLine(o, d, c, k, dashOf ? DASHES[dashOf(k)] : '');
      if (mk !== 'none') {
        s += pointMarks(o, mk, v, X, Y, c, bg, k);
      } else {
        var e = P[P.length - 1];
        s += '<circle cx="' + r2(e[0]) + '" cy="' + r2(e[1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>';
      }
      if (bool(o.showValues)) v.forEach(function (y, i) { if (isFinite(Y(y))) s += text(X(i), Y(y) - 8, fmt(y, o, true), small(th, 9, 'text-anchor="middle"')); });
    });
    return s + (f.clip ? '</g>' : '') + xyFinish(o, th, f, n, function (j) {
      var tip = pointName(labels, T, j, lang, timed);
      S.forEach(function (v, k) { if (j < v.length) tip += '\n' + (multi ? nameOf(k) + ': ' : '') + fmt(v[j], o); });
      return tip;
    });
  }, { stat: st, summary: S.length + ' series over ' + n + ' points' });
}

line.table = function (o) { var t = seriesTable(o); return datedTable(t, o, t.rows.length); };
