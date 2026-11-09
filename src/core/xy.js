/** The axis frame and series lines line and area charts share. Kept apart so other charts don't load them. */
import { r2, clamp, has, tw, text, small, hit, anim, goalLine } from './util.js';
import { niceScale, legend, marker, DASHES } from './series.js';

/**
 * The frame line and area charts share: the legend, the value axis with its gridlines, labels along the bottom and notes.
 * c holds n (points), names (legend names, or null for no legend), pal, key and kw (legend swatches), lo and hi (the data
 * range), zero (keep zero on the axis), labels, notes and tick (formats an axis number).
 * Returns the SVG so far, the scales X(i) and Y(v), and the plot box: px, pw, top, ph.
 */
export function xyFrame(o, th, c, x0, y0, w, h) {
  var s = '', top = y0, n = c.n, labels = c.labels;
  if (c.names) {
    var lg = legend(c.names, c.pal, th, x0, top, w, c.key, c.kw);
    s += lg.svg;
    top += lg.height;
  }
  var mn = c.lo, mx = c.hi;
  if (has(o.goal)) { mn = Math.min(mn, +o.goal); mx = Math.max(mx, +o.goal); }
  if (c.zero) { mn = Math.min(0, mn); mx = Math.max(0, mx); }
  var sc = niceScale(mn, mx, 4);
  var tl = sc.ticks.map(c.tick);
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
  c.notes.forEach(function (nt) {
    if (nt.i >= n) return;
    var x = X(nt.i);
    s += '<line x1="' + r2(x) + '" x2="' + r2(x) + '" y1="' + r2(top + 12) + '" y2="' + r2(top + ph) + '" stroke="' + th.fg + '" stroke-opacity=".4" stroke-dasharray="3 3"/>' +
      text(clamp(x, px + 30, px + pw - 30), top + 8, nt.text, small(th, 10, 'text-anchor="middle"', th.fg));
  });
  return { svg: s, X: X, Y: Y, px: px, pw: pw, top: top, ph: ph };
}

/** The goal line, then one hover column per point, centred on it. tip(j) gives each column's tooltip. */
export function xyFinish(o, th, f, n, tip) {
  var s = has(o.goal) ? goalLine(o, th, f.px, f.px + f.pw, f.Y(+o.goal)) : '';
  var step = n > 1 ? f.pw / (n - 1) : f.pw;
  for (var j = 0; j < n; j++) s += hit(f.X(j) - step / 2, f.top, step, f.ph, tip(j));
  return s;
}

/** A legend swatch for a line: a short sample with its dash and marker. */
export function lineKey(pal, dashOf, markOf, bg) {
  return function (k, x, y) {
    var c = pal[k % pal.length], dk = dashOf ? DASHES[dashOf(k)] : '', mk = markOf ? markOf(k) : 'none';
    return '<line x1="' + r2(x) + '" x2="' + r2(x + 18) + '" y1="' + r2(y + 6) + '" y2="' + r2(y + 6) + '" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round"' +
      (dk ? ' stroke-dasharray="' + dk + '"' : '') + '/>' + (mk !== 'none' ? marker(mk, x + 9, y + 6, 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"') : '');
  };
}

/** A series line along path d. The draw-in animation is itself a dash, so dashed lines fade in instead. */
export function seriesLine(o, d, c, k, dk) {
  return dk
    ? '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + dk + '"' + anim(o, 'bzc-a', k * 0.15) + '/>'
    : '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1' + (o.animate ? ';animation-delay:' + k * 0.15 + 's' : '') + '"' + (o.animate ? ' class="bzc-d"' : '') + '/>';
}

/** Markers on a series' points. Long series get one on every few points, and always on the last. */
export function pointMarks(o, mk, ys, X, Y, c, bg, k) {
  var s = '', every = Math.ceil(ys.length / 40);
  ys.forEach(function (y, i) {
    if (i % every === 0 || i === ys.length - 1) s += marker(mk, X(i), Y(y), 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"' + anim(o, 'bzc-a', 0.6 + k * 0.15));
  });
  return s;
}
