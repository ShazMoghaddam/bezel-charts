/** The axis frame line and area charts share: dates, fixed ranges and log scales included. Other charts don't load it. */
import { newId, r2, clamp, has, tw, text, small, hit, goalLine } from './util.js';
import { niceScale, legend } from './series.js';
import { dateTicks } from './time.js';

/**
 * The frame line and area charts share: the legend, the value axis with its gridlines, labels along the bottom and notes.
 * c holds n (points), names (legend names, or null for no legend), pal, key and kw (legend swatches), lo and hi (the data
 * range), zero (keep zero on the axis), labels, notes and tick (formats an axis number). Optionally, dates (a UTC time
 * per point, spacing points in time), min and max (fixing the value axis, NaN when not set) and log (with posLo and
 * posHi, the data's smallest and largest positive values).
 * Returns the SVG so far, the scales X(i) and Y(v), the plot box (px, pw, top, ph), and clip: an attribute that keeps
 * series inside the plot when min or max is set, or ''.
 */
export function xyFrame(o, th, c, x0, y0, w, h) {
  var s = '', top = y0, n = c.n, labels = c.labels, T = c.dates;
  if (c.names) {
    var lg = legend(c.names, c.pal, th, x0, top, w, c.key, c.kw);
    s += lg.svg;
    top += lg.height;
  }
  var mn = c.lo, mx = c.hi;
  if (has(o.goal)) { mn = Math.min(mn, +o.goal); mx = Math.max(mx, +o.goal); }
  if (c.zero) { mn = Math.min(0, mn); mx = Math.max(0, mx); }
  // A min or max you set wins over the data, the goal and zero. Both together must leave some room between them.
  var hasMin = isFinite(c.min), hasMax = isFinite(c.max);
  if (hasMin && hasMax && c.min >= c.max) hasMin = hasMax = false;
  var sc = c.log ? logScale(hasMin && c.min > 0 ? c.min : c.posLo, hasMax && c.max > 0 ? c.max : c.posHi)
    : hasMin || hasMax ? fixedScale(hasMin ? c.min : mn, hasMax ? c.max : mx, hasMin, hasMax)
    : niceScale(mn, mx, 4);
  var tl = sc.ticks.map(c.tick);
  var axisW = Math.max.apply(null, tl.map(function (t) { return tw(t, 10, true); })) + 10;
  var bottom = labels.length || T ? 20 : 4;
  var px = x0 + axisW, pw = w - axisW, ph = h - (top - y0) - bottom;
  var t0 = T ? Math.min.apply(null, T) : 0, span = T ? Math.max.apply(null, T) - t0 : 0;
  // With dates, points sit where they fall in time; otherwise they are evenly spaced.
  var X = T
    ? function (i) { return span ? px + (T[i] - t0) / span * pw : px + pw / 2; }
    : function (i) { return n === 1 ? px + pw / 2 : px + i * pw / (n - 1); };
  var Y = sc.log
    ? function (v) { return top + ph - (Math.log10(v) - sc.a) / (sc.b - sc.a) * ph; }
    : function (v) { return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph; };
  var clip = '';
  if (hasMin || hasMax) {
    var cid = newId('c');
    s += '<defs><clipPath id="' + cid + '"><rect x="' + r2(px - 4) + '" y="' + r2(top - 4) + '" width="' + r2(pw + 8) + '" height="' + r2(ph + 8) + '"/></clipPath></defs>';
    clip = ' clip-path="url(#' + cid + ')"';
  }
  sc.ticks.forEach(function (t, i) {
    var y = Y(t);
    s += '<line x1="' + r2(px) + '" x2="' + r2(px + pw) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.grid + '"' + (t === 0 ? '' : ' stroke-dasharray="2 4"') + '/>' +
      text(px - 8, y + 3.5, tl[i], small(th, 10, 'text-anchor="end"'));
  });
  if (T) {
    // Date ticks pick their own step, and labels near the ends are nudged in so they stay inside the plot.
    dateTicks(t0, t0 + span, pw, o.lang || 'en-GB').forEach(function (d) {
      var half = tw(d.text, 10, true) / 2, x = span ? px + (d.t - t0) / span * pw : px + pw / 2;
      s += text(clamp(x, px + half, px + pw - half), top + ph + 15, d.text, small(th, 10, 'text-anchor="middle"'));
    });
  } else if (labels.length) {
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
  return { svg: s, X: X, Y: Y, px: px, pw: pw, top: top, ph: ph, clip: clip, uneven: !!T };
}

/**
 * A scale from lo to hi where min, max or both are fixed. Gridlines fall on the round steps inside the range, and a
 * fixed end gets its own line too unless a round one sits close by.
 */
function fixedScale(lo, hi, hasMin, hasMax) {
  var nice = niceScale(lo, hi, 4), a = hasMin ? lo : nice.lo, b = hasMax ? hi : nice.hi, step = nice.ticks[1] - nice.ticks[0];
  var ticks = nice.ticks.filter(function (t) { return t >= a - step * 1e-9 && t <= b + step * 1e-9; });
  if (hasMin && (!ticks.length || ticks[0] - a > step * 0.4)) ticks.unshift(a);
  if (hasMax && (!ticks.length || b - ticks[ticks.length - 1] > step * 0.4)) ticks.push(b);
  return { lo: a, hi: b, ticks: ticks };
}

/** A log scale over whole powers of ten from lo to hi, with 2 and 5 between them when it spans two powers or fewer. */
function logScale(lo, hi) {
  var a = Math.floor(Math.log10(lo)), b = Math.ceil(Math.log10(hi)), ticks = [];
  if (b === a) b++;
  for (var e = a; e <= b; e++) {
    var p = Number('1e' + e);
    ticks.push(p);
    if (b - a <= 2 && e < b) ticks.push(2 * p, 5 * p);
  }
  return { log: true, a: a, b: b, lo: ticks[0], hi: ticks[ticks.length - 1], ticks: ticks };
}

/**
 * The goal line, then one hover column per point. Evenly spaced points get equal columns centred on them; dated points
 * get columns that reach halfway to each neighbour. tip(j) gives each column's tooltip.
 */
export function xyFinish(o, th, f, n, tip) {
  var g = has(o.goal) ? f.Y(+o.goal) : NaN;
  var s = isFinite(g) ? goalLine(o, th, f.px, f.px + f.pw, g) : '';
  var step = n > 1 ? f.pw / (n - 1) : f.pw, X = f.X;
  for (var j = 0; j < n; j++) {
    if (!f.uneven) { s += hit(X(j) - step / 2, f.top, step, f.ph, tip(j)); continue; }
    var l = j ? (X(j - 1) + X(j)) / 2 : X(0) - (n > 1 ? (X(1) - X(0)) / 2 : f.pw / 2);
    var r = j < n - 1 ? (X(j) + X(j + 1)) / 2 : X(j) + (n > 1 ? (X(j) - X(j - 1)) / 2 : f.pw / 2);
    s += hit(l, f.top, Math.max(1, r - l), f.ph, tip(j));
  }
  return s;
}
