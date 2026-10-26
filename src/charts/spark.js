import { newId, r2, clamp, num, has, nums, list, bool, fmt, pathOf, text, small, hit, anim, palette, emptyState, parseNotes, goalLine, statOf } from '../core/util.js';
import { tile } from '../core/tile.js';

export default function spark(o, th) {
  var v = nums(o.values), c = palette(o, th)[0], h = num(o.height, 64);
  var labels = list(o.labels), notes = parseNotes(o, labels);
  var st = statOf(v, o, 'last');
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!v.length) return emptyState(th, x0, y0, w, h);
    var pts = v.length === 1 ? [v[0], v[0]] : v;
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts);
    if (has(o.goal)) { mn = Math.min(mn, +o.goal); mx = Math.max(mx, +o.goal); }
    var pad = (mx - mn || Math.abs(mx) || 1) * 0.12; mn -= pad; mx += pad;
    var X = function (i) { return x0 + i * w / (pts.length - 1); };
    var Y = function (n) { return y0 + h - (n - mn) / (mx - mn) * h; };
    var P = pts.map(function (n, i) { return [X(i), Y(n)]; });
    var d = pathOf(P, bool(o.straight)), g = newId('g'), last = P[P.length - 1];
    var s = '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".32"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>';
    [1 / 3, 2 / 3].forEach(function (f) {
      s += '<line x1="' + x0 + '" x2="' + (x0 + w) + '" y1="' + r2(y0 + h * f) + '" y2="' + r2(y0 + h * f) + '" stroke="' + th.grid + '" stroke-dasharray="2 4"/>';
    });
    s += '<path d="' + d + 'L' + r2(last[0]) + ',' + (y0 + h) + 'L' + x0 + ',' + (y0 + h) + 'Z" fill="url(#' + g + ')"' + anim(o, 'bzc-a') + '/>';
    s += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1"' + anim(o, 'bzc-d') + '/>';
    if (has(o.goal)) s += goalLine(o, th, x0, x0 + w, Y(+o.goal));
    notes.forEach(function (n) {
      if (n.i >= v.length) return;
      var p = P[n.i];
      s += '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="3.5" fill="' + th.fg + '"/>' +
        text(clamp(p[0], x0 + 30, x0 + w - 30), p[1] - 9, n.text, small(th, 10, 'text-anchor="middle"', th.fg));
    });
    s += '<circle cx="' + r2(last[0]) + '" cy="' + r2(last[1]) + '" r="9" fill="' + c + '" fill-opacity=".25"/><circle cx="' + r2(last[0]) + '" cy="' + r2(last[1]) + '" r="4.5" fill="' + c + '"/>';
    if (bool(o.showValues)) {
      P.forEach(function (p, i) { if (i < v.length) s += text(p[0], p[1] - 8, fmt(v[i], o, true), small(th, 9, 'text-anchor="middle"')); });
    }
    var step = v.length > 1 ? w / (v.length - 1) : w;
    v.forEach(function (n, i) {
      s += hit(X(i) - step / 2, y0 - 6, step, h + 12, (labels[i] || '#' + (i + 1)) + ': ' + fmt(n, o));
    });
    return s;
  }, { stat: st, summary: v.length ? 'latest ' + fmt(v[v.length - 1], o) : 'no data' });
}
