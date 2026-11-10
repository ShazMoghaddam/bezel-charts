import { r2, num, has, list, series, bool, fmt, tw, trunc, text, small, hit, anim, palette, emptyState, goalLine } from '../core/util.js';
import { niceScale, marker } from '../core/series.js';
import { tile } from '../core/tile.js';

/**
 * Box plots: one box per group of raw values, side by side so spreads compare. The box runs from the lower to the
 * upper quartile with a line at the median, and whiskers reach the furthest values within 1.5 times the box's height.
 * Anything further out is an outlier dot. whiskers="range" reaches the lowest and highest values instead.
 * Quartiles use linear interpolation, as pandas, NumPy and Excel's QUARTILE.INC do.
 */
export default function boxplot(o, th) {
  var S = series(o.values), names = list(o.series), pal = palette(o, th), k = S.length;
  var horiz = bool(o.horizontal), many = list(o.color).length > 1, showMean = list(o.mark).indexOf('mean') >= 0;
  var stats = S.map(function (v) { return summary(v, o.whiskers === 'range'); });
  var nameOf = function (i) { return names[i] || 'Group ' + (i + 1); };
  var h = num(o.height, horiz ? Math.max(120, k * 36 + 24) : 200);
  var f = function (v) { return fmt(v, o); };

  var meds = stats.map(function (s) { return s.median; });
  var about = k === 1
    ? 'median ' + f(stats[0].median) + ', middle half ' + f(stats[0].q1) + ' to ' + f(stats[0].q3)
    : k + ' groups, medians from ' + f(Math.min.apply(null, meds)) + ' to ' + f(Math.max.apply(null, meds));

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!k) return emptyState(th, x0, y0, w, h);
    var lo = Math.min.apply(null, stats.map(function (s) { return s.min; })), hi = Math.max.apply(null, stats.map(function (s) { return s.max; }));
    if (has(o.goal)) { lo = Math.min(lo, +o.goal); hi = Math.max(hi, +o.goal); }
    var sc = niceScale(lo, hi, 4), s = '';
    var tl = sc.ticks.map(function (t) { return fmt(t, o, true); });
    // Value axis: up the left when upright, along the bottom when horizontal. Group names take the other side.
    var nameW = horiz ? Math.min(w * 0.4, Math.max.apply(null, S.map(function (_, i) { return tw(nameOf(i), 11); })) + 12) : 0;
    var axisW = horiz ? 0 : Math.max.apply(null, tl.map(function (t) { return tw(t, 10, true); })) + 10;
    var px = x0 + (horiz ? nameW : axisW), pw = w - (horiz ? nameW : axisW), ph = h - 20;
    var V = horiz
      ? function (v) { return px + (v - sc.lo) / (sc.hi - sc.lo) * pw; }
      : function (v) { return y0 + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph; };
    var band = (horiz ? ph : pw) / k, half = Math.min(28, band * 0.28);
    var C = function (i) { return (horiz ? y0 : px) + band * (i + 0.5); };
    // A point from a group's centre line c and a value position v.
    var P = function (c, v) { return horiz ? [v, c] : [c, v]; };
    var seg = function (c1, v1, c2, v2, attrs) {
      var a = P(c1, v1), b = P(c2, v2);
      return '<line x1="' + r2(a[0]) + '" y1="' + r2(a[1]) + '" x2="' + r2(b[0]) + '" y2="' + r2(b[1]) + '"' + attrs + '/>';
    };

    sc.ticks.forEach(function (t, i) {
      var v = V(t);
      s += seg(horiz ? y0 : px, v, horiz ? y0 + ph : px + pw, v, ' stroke="' + th.grid + '"' + (t === 0 ? '' : ' stroke-dasharray="2 4"')) +
        (horiz ? text(v, y0 + ph + 15, tl[i], small(th, 10, 'text-anchor="middle"')) : text(px - 8, v + 3.5, tl[i], small(th, 10, 'text-anchor="end"')));
    });
    stats.forEach(function (st, i) {
      var c = C(i), col = many ? pal[i % pal.length] : pal[0], line = ' stroke="' + col + '" stroke-width="1.5"';
      // One unnamed group needs no name under it.
      if (k > 1 || names.length) {
        var label = fit(nameOf(i), horiz ? nameW - 10 : band - 6, horiz ? 11 : 10, !horiz);
        s += horiz
          ? text(x0, c + 4, label, small(th, 11, '', th.fg))
          : text(c, y0 + ph + 15, label, small(th, 10, 'text-anchor="middle"'));
      }
      if (!st.n) return;
      var a1 = P(c - half, V(st.q1)), a2 = P(c + half, V(st.q3));
      s += '<g' + anim(o, 'bzc-a', Math.min(0.6, i * 0.06)) + '>' +
        seg(c, V(st.low), c, V(st.q1), line) + seg(c, V(st.q3), c, V(st.high), line) +
        seg(c - half / 2, V(st.low), c + half / 2, V(st.low), line) + seg(c - half / 2, V(st.high), c + half / 2, V(st.high), line) +
        '<rect x="' + r2(Math.min(a1[0], a2[0])) + '" y="' + r2(Math.min(a1[1], a2[1])) + '" width="' + r2(Math.abs(a2[0] - a1[0])) + '" height="' + r2(Math.max(1, Math.abs(a2[1] - a1[1]))) +
        '" rx="3" fill="' + col + '" fill-opacity=".22"' + line + '/>' +
        seg(c - half, V(st.median), c + half, V(st.median), ' stroke="' + col + '" stroke-width="2.5"');
      st.outliers.forEach(function (v) {
        var p = P(c, V(v));
        s += '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="2.5" fill="none"' + line + '/>';
      });
      if (showMean) {
        var m = P(c, V(st.mean));
        s += marker('diamond', m[0], m[1], 4, ' fill="' + (o.background || th.tile) + '"' + line);
      }
      s += '</g>';
    });
    if (has(o.goal)) {
      var g = V(+o.goal);
      s += horiz
        ? seg(g, y0, g, y0 + ph, ' stroke="' + th.fg + '" stroke-opacity=".55" stroke-dasharray="4 4"')
        : goalLine(o, th, px, px + pw, g);
    }
    stats.forEach(function (st, i) {
      if (!st.n) return;
      var tip = nameOf(i) + '\nMedian ' + f(st.median) + '\nMiddle half ' + f(st.q1) + ' to ' + f(st.q3) +
        '\n' + (st.outliers.length ? 'Range without outliers ' : 'Range ') + f(st.low) + ' to ' + f(st.high) +
        (st.outliers.length ? '\n' + st.outliers.length + (st.outliers.length === 1 ? ' outlier' : ' outliers') : '') +
        (showMean ? '\nMean ' + f(st.mean) : '') + '\nn = ' + st.n;
      s += horiz ? hit(px, C(i) - band / 2, pw, band, tip, i, st.median, i) : hit(C(i) - band / 2, y0, band, ph, tip, i, st.median, i);
    });
    return s;
  }, { summary: k ? about : 'no data' });
}

boxplot.table = function (o) {
  var S = series(o.values), names = list(o.series), showMean = list(o.mark).indexOf('mean') >= 0;
  var f = function (v) { return fmt(v, o); };
  return {
    head: ['Group', 'Count', 'Lowest', 'Lower quartile', 'Median', 'Upper quartile', 'Highest', 'Outliers'].concat(showMean ? ['Mean'] : []),
    rows: S.map(function (v, i) {
      var st = summary(v, o.whiskers === 'range');
      return [names[i] || 'Group ' + (i + 1), String(st.n), f(st.min), f(st.q1), f(st.median), f(st.q3), f(st.max), String(st.outliers.length)].concat(showMean ? [f(st.mean)] : []);
    }),
  };
};

/** Shortens a name with an ellipsis until it fits the width. */
function fit(name, width, size, mono) {
  var t = String(name);
  while (t.length > 1 && tw(t, size, mono) > width) t = trunc(t, t.length - 1);
  return t;
}

/** Quartile p of sorted values, interpolating between neighbours (pandas' default, also called type 7). */
function quantile(s, p) {
  var h = (s.length - 1) * p, i = Math.floor(h);
  return i + 1 < s.length ? s[i] + (h - i) * (s[i + 1] - s[i]) : s[i];
}

/** The five numbers, the mean and the outliers for one group. range makes the whiskers reach the extremes. */
function summary(v, range) {
  var s = v.slice().sort(function (a, b) { return a - b; }), n = s.length;
  if (!n) return { n: 0, outliers: [] };
  var q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1, t = 0;
  var lowFence = range ? -Infinity : q1 - 1.5 * iqr, highFence = range ? Infinity : q3 + 1.5 * iqr;
  var inside = s.filter(function (x) { return x >= lowFence && x <= highFence; });
  s.forEach(function (x) { t += x; });
  return {
    n: n, min: s[0], max: s[n - 1], q1: q1, median: quantile(s, 0.5), q3: q3, mean: t / n,
    low: inside[0], high: inside[inside.length - 1],
    outliers: s.filter(function (x) { return x < lowFence || x > highFence; }),
  };
}
