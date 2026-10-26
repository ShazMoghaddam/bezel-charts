import { r2, clamp, num, has, list, series, bool, fmt, niceScale, text, small, hit, palette, emptyState, parseNotes, goalLine, legend, axisWidth, SANS } from '../core/util.js';
import { tile } from '../core/tile.js';

/** Least-squares fit. Returns slope, intercept and Pearson's r, or null when x has no spread. */
export function fit(xs, ys) {
  var n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  var mx = 0, my = 0, i;
  for (i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  var sxx = 0, syy = 0, sxy = 0;
  for (i = 0; i < n; i++) { sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my); sxy += (xs[i] - mx) * (ys[i] - my); }
  if (!sxx) return null;
  var slope = sxy / sxx;
  return { slope: slope, intercept: my - slope * mx, r: syy ? sxy / Math.sqrt(sxx * syy) : 0 };
}

/**
 * Scatter plot. Pass matching x and y lists; separate groups with "|":
 * x="1,2,3|2,4" y="5,7,6|3,8" series="Team A,Team B" trend.
 */
export default function scatter(o, th) {
  var X = series(o.x), Y = series(o.y), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var groups = [];
  for (var g = 0; g < Math.max(X.length, Y.length); g++) {
    var xs = X[g] || [], ys = Y[g] || [], m = Math.min(xs.length, ys.length);
    groups.push({ xs: xs.slice(0, m), ys: ys.slice(0, m) });
  }
  groups = groups.filter(function (gr) { return gr.xs.length; });
  var count = groups.reduce(function (a, gr) { return a + gr.xs.length; }, 0);
  var h = num(o.height, 210), multi = groups.length > 1 || names.length > 0, trend = bool(o.trend);
  var nameOf = function (j) { return names[j] || 'Group ' + (j + 1); };
  var xo = { decimals: o.decimals, compact: o.compact, lang: o.lang };
  var notes = parseNotes(o, labels);

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!count) return emptyState(th, x0, y0, w, h);
    var s = '', top = y0;
    if (multi) {
      var lg = legend(groups.map(function (_, j) { return nameOf(j); }), pal, th, x0, top, w);
      s += lg.svg;
      top += lg.height;
    }
    var ax = [].concat.apply([], groups.map(function (gr) { return gr.xs; }));
    var ay = [].concat.apply([], groups.map(function (gr) { return gr.ys; }));
    var ymin = Math.min.apply(null, ay), ymax = Math.max.apply(null, ay);
    if (has(o.goal)) { ymin = Math.min(ymin, +o.goal); ymax = Math.max(ymax, +o.goal); }
    if (bool(o.zero)) { ymin = Math.min(0, ymin); ymax = Math.max(0, ymax); }
    var sy = niceScale(ymin, ymax, 4), sx = niceScale(Math.min.apply(null, ax), Math.max.apply(null, ax), 5);
    var tly = sy.ticks.map(function (t) { return fmt(t, o, true); });
    var axisW = axisWidth(tly) + (has(o.yLabel) ? 14 : 0);
    var bottom = 20 + (has(o.xLabel) ? 16 : 0);
    var px = x0 + axisW, pw = w - axisW, ph = h - (top - y0) - bottom;
    var PX = function (v) { return px + 6 + (v - sx.lo) / (sx.hi - sx.lo) * (pw - 12); };
    var PY = function (v) { return top + 6 + ph - 6 - (v - sy.lo) / (sy.hi - sy.lo) * (ph - 6); };

    sy.ticks.forEach(function (t, i) {
      var y = PY(t);
      s += '<line x1="' + r2(px) + '" x2="' + r2(px + pw) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.grid + '" stroke-dasharray="2 4"/>' +
        text(px - 8, y + 3.5, tly[i], small(th, 10, 'text-anchor="end"'));
    });
    var every = Math.max(1, Math.ceil(sx.ticks.length * 44 / pw));
    sx.ticks.forEach(function (t, i) {
      if (i % every) return;
      var x = PX(t);
      s += '<line x1="' + r2(x) + '" x2="' + r2(x) + '" y1="' + r2(top) + '" y2="' + r2(top + ph) + '" stroke="' + th.grid + '" stroke-dasharray="2 4"/>' +
        text(x, top + ph + 15, fmt(t, xo, true), small(th, 10, 'text-anchor="middle"'));
    });
    if (has(o.xLabel)) s += text(px + pw / 2, top + ph + 32, o.xLabel, small(th, 10, 'text-anchor="middle" font-weight="600"'));
    if (has(o.yLabel)) {
      var cy = top + ph / 2;
      s += '<text x="' + r2(x0 + 4) + '" y="' + r2(cy) + '" transform="rotate(-90 ' + r2(x0 + 4) + ' ' + r2(cy) + ')" text-anchor="middle" ' +
        small(th, 10, 'font-weight="600"') + ' dominant-baseline="hanging">' + String(o.yLabel).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</text>';
    }
    if (has(o.goal)) s += goalLine(o, th, px, px + pw, PY(+o.goal));

    if (trend) {
      groups.forEach(function (gr, j) {
        var f = fit(gr.xs, gr.ys);
        if (!f) return;
        var xa = Math.min.apply(null, gr.xs), xb = Math.max.apply(null, gr.xs);
        var ya = f.slope * xa + f.intercept, yb = f.slope * xb + f.intercept;
        var c = pal[j % pal.length];
        s += '<line x1="' + r2(PX(xa)) + '" y1="' + r2(clamp(PY(ya), top, top + ph)) + '" x2="' + r2(PX(xb)) + '" y2="' + r2(clamp(PY(yb), top, top + ph)) +
          '" stroke="' + c + '" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round" stroke-opacity=".9"/>';
        s += text(Math.min(PX(xb), px + pw) - 2, clamp(PY(yb), top + 10, top + ph) - 7, 'r = ' + f.r.toFixed(2), small(th, 10, 'text-anchor="end" font-weight="600"', c));
      });
    }

    var idx = 0, r = count > 150 ? 3 : 4.5;
    groups.forEach(function (gr, j) {
      var c = pal[j % pal.length];
      gr.xs.forEach(function (xv, i) {
        var cx = PX(xv), cy = PY(gr.ys[i]);
        var tip = (labels[idx] ? labels[idx] + '\n' : multi ? nameOf(j) + '\n' : '') +
          (has(o.xLabel) ? o.xLabel : 'x') + ': ' + fmt(xv, xo) + '\n' + (has(o.yLabel) ? o.yLabel : 'y') + ': ' + fmt(gr.ys[i], o);
        s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r + '" fill="' + c + '" fill-opacity=".85" stroke="' + (o.background || th.tile) + '" stroke-width="1.5"' +
          (o.animate ? ' class="bzc-a" style="animation-delay:' + r2(Math.min(0.8, idx * 0.012)) + 's"' : '') + '/>';
        s += hit(cx - 8, cy - 8, 16, 16, tip);
        idx++;
      });
    });

    // Notes point at a point by its position across all groups, or by its label.
    var flat = [];
    groups.forEach(function (gr) { gr.xs.forEach(function (xv, i) { flat.push([PX(xv), PY(gr.ys[i])]); }); });
    notes.forEach(function (nt) {
      var p = flat[nt.i];
      if (!p) return;
      s += '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="' + (r + 4) + '" fill="none" stroke="' + th.fg + '" stroke-width="1.5"/>' +
        text(clamp(p[0], px + 30, px + pw - 30), p[1] - r - 9, nt.text, small(th, 10, 'text-anchor="middle"', th.fg));
    });
    return s;
  }, { summary: count + ' points' + (multi ? ' in ' + groups.length + ' groups' : '') });
}
