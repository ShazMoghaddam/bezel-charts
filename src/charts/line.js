import { newId, r2, clamp, num, has, list, series, tw, bool, fmt, niceScale, pathOf, text, small, hit, anim, palette, emptyState, parseNotes, goalLine, statOf, legend, SANS } from '../core/util.js';
import { tile } from '../core/tile.js';

export default function line(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var h = num(o.height, 170), n = Math.max.apply(null, [0].concat(S.map(function (s) { return s.length; })));
  var notes = parseNotes(o, labels), multi = S.length > 1 || names.length > 0;
  var st = statOf(S[0] || [], o, '');
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!n) return emptyState(th, x0, y0, w, h);
    var s = '', top = y0;
    if (multi) {
      var lg = legend(S.map(function (_, k) { return names[k] || 'Series ' + (k + 1); }), pal, th, x0, top, w);
      s += lg.svg;
      top += lg.height;
    }
    var all = [].concat.apply([], S);
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all);
    if (has(o.goal)) { mn = Math.min(mn, +o.goal); mx = Math.max(mx, +o.goal); }
    if (bool(o.zero)) { mn = Math.min(0, mn); mx = Math.max(0, mx); }
    var sc = niceScale(mn, mx, 4);
    var tl = sc.ticks.map(function (t) { return fmt(t, o, true); });
    var axisW = Math.max.apply(null, tl.map(function (t) { return tw(t, 10, true); })) + 10;
    var bottom = labels.length ? 20 : 4;
    var px = x0 + axisW, pw = w - axisW, ph = h - (top - y0) - bottom;
    var X = function (i) { return n === 1 ? px + pw / 2 : px + i * pw / (n - 1); };
    var Y = function (v) { return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph; };
    sc.ticks.forEach(function (t, i) {
      var y = Y(t);
      s += '<line x1="' + r2(px) + '" x2="' + r2(px + pw) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.grid + '"' + (t === 0 ? '' : ' stroke-dasharray="2 4"') + '/>' +
        text(px - 8, y + 3.5, tl[i], small(th, 10, 'text-anchor="end"'));
    });
    if (labels.length) {
      var every = Math.max(1, Math.ceil(n * (Math.max.apply(null, labels.map(function (l) { return tw(l, 10, true); })) + 10) / pw));
      for (var i = 0; i < n; i += every) {
        if (labels[i] == null) continue;
        var anchor = n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle';
        s += text(X(i), top + ph + 15, labels[i], small(th, 10, 'text-anchor="' + anchor + '"'));
      }
    }
    notes.forEach(function (nt) {
      if (nt.i >= n) return;
      var x = X(nt.i);
      s += '<line x1="' + r2(x) + '" x2="' + r2(x) + '" y1="' + r2(top + 12) + '" y2="' + r2(top + ph) + '" stroke="' + th.fg + '" stroke-opacity=".4" stroke-dasharray="3 3"/>' +
        text(clamp(x, px + 30, px + pw - 30), top + 8, nt.text, small(th, 10, 'text-anchor="middle"', th.fg));
    });
    S.forEach(function (v, k) {
      var c = pal[k % pal.length];
      var P = v.map(function (y, i) { return [X(i), Y(y)]; });
      if (P.length === 1) P = [[px, P[0][1]], [px + pw, P[0][1]]];
      var d = pathOf(P, bool(o.straight));
      if (k === 0) {
        var g = newId('g'), last = P[P.length - 1];
        s += '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".26"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
          '<path d="' + d + 'L' + r2(last[0]) + ',' + r2(top + ph) + 'L' + r2(P[0][0]) + ',' + r2(top + ph) + 'Z" fill="url(#' + g + ')"' + anim(o, 'bzc-a') + '/>';
      }
      s += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1' + (o.animate ? ';animation-delay:' + k * 0.15 + 's' : '') + '"' + (o.animate ? ' class="bzc-d"' : '') + '/>';
      var e = P[P.length - 1];
      s += '<circle cx="' + r2(e[0]) + '" cy="' + r2(e[1]) + '" r="4" fill="' + c + '" stroke="' + (o.background || th.tile) + '" stroke-width="2"/>';
      if (bool(o.showValues)) v.forEach(function (y, i) { s += text(X(i), Y(y) - 8, fmt(y, o, true), small(th, 9, 'text-anchor="middle"')); });
    });
    if (has(o.goal)) s += goalLine(o, th, px, px + pw, Y(+o.goal));
    var step = n > 1 ? pw / (n - 1) : pw;
    for (var j = 0; j < n; j++) {
      var tip = labels[j] || '#' + (j + 1);
      S.forEach(function (v, k) { if (j < v.length) tip += '\n' + (multi ? (names[k] || 'Series ' + (k + 1)) + ': ' : '') + fmt(v[j], o); });
      s += hit(X(j) - step / 2, top, step, ph, tip);
    }
    return s;
  }, { stat: st, summary: S.length + ' series over ' + n + ' points' });
}
