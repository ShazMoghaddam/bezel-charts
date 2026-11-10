import { newId, r2, num, has, list, series, bool, fmt, tw, text, small, hit, anim, palette, emptyState } from '../core/util.js';
import { niceScale, legend, styleOf, pattern, PATTERNS } from '../core/series.js';
import { tile } from '../core/tile.js';

/**
 * How raw values spread out. The chart counts how many fall into each range: the ranges have round edges, include
 * their lower edge and not their upper one, except the last, which includes both so the largest value is counted.
 * Several series share the same ranges and overlap, so their spreads can be compared.
 */
export default function histogram(o, th) {
  var b = binned(o), names = list(o.series), pal = palette(o, th), h = num(o.height, 190);
  var S = b ? b.S : [], k = S.length, multi = k > 1 || names.length > 0, pct = bool(o.percent);
  var nameOf = function (j) { return names[j] || 'Series ' + (j + 1); };
  // Range edges get as many decimals as the range width needs, so 0.5-wide ranges read 2.5, 3.0, 3.5.
  var eo = Object.assign({}, o, { decimals: has(o.decimals) ? o.decimals : b ? b.dp : 0 });
  var range = function (i) { return fmt(b.edge(i), eo) + ' to ' + fmt(b.edge(i + 1), eo); };
  var share = function (j, i) { return Math.round(b.counts[j][i] / S[j].length * 100); };
  var height = function (j, i) { return pct ? b.counts[j][i] / S[j].length * 100 : b.counts[j][i]; };
  var marks = list(o.mark).filter(function (m) { return m === 'mean' || m === 'median'; });

  var patOf = k > 1 ? styleOf(o.patterns, PATTERNS, 'solid') : null, defs = '', fills = [];
  for (var q = 0; patOf && q < k; q++) {
    if (patOf(q) === 'solid') continue;
    var pid = newId('g');
    defs += pattern(pid, patOf(q), pal[q % pal.length], o.background || th.tile);
    fills[q] = 'url(#' + pid + ')';
  }
  var key = patOf && function (j, x, y) { return '<rect x="' + r2(x) + '" y="' + r2(y + 1) + '" width="10" height="10" rx="2" fill="' + (fills[j] || pal[j % pal.length]) + '"/>'; };

  var peak = 0, n = 0;
  if (b) {
    for (var i = 0; i < b.count; i++) if (total(b, i) > total(b, peak)) peak = i;
    S.forEach(function (s) { n += s.length; });
  }

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!b) return emptyState(th, x0, y0, w, h);
    var s = defs ? '<defs>' + defs + '</defs>' : '', top = y0;
    if (multi) {
      var lg = legend(S.map(function (_, j) { return nameOf(j); }), pal, th, x0, top, w, key, key && 15);
      s += lg.svg;
      top += lg.height;
    }
    var most = 0;
    S.forEach(function (_, j) { for (var i = 0; i < b.count; i++) most = Math.max(most, height(j, i)); });
    var sc = niceScale(0, most || 1, 4);
    var tl = sc.ticks.map(function (t) { return fmt(t, { lang: o.lang }, true) + (pct ? '%' : ''); });
    var axisW = Math.max.apply(null, tl.map(function (t) { return tw(t, 10, true); })) + 10;
    var px = x0 + axisW, pw = w - axisW, ph = h - (top - y0) - 20, cw = pw / b.count;
    var X = function (i) { return px + i * cw; };
    var Y = function (v) { return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph; };
    sc.ticks.forEach(function (t, i) {
      var y = Y(t);
      s += '<line x1="' + r2(px) + '" x2="' + r2(px + pw) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.grid + '"' + (t === 0 ? '' : ' stroke-dasharray="2 4"') + '/>' +
        text(px - 8, y + 3.5, tl[i], small(th, 10, 'text-anchor="end"'));
    });
    // Edge labels, thinned out when they would crowd.
    var el = [];
    for (var e = 0; e <= b.count; e++) el.push(fmt(b.edge(e), eo, true));
    // The first and last labels hang inwards from the edges, so neighbours need one and a half labels of room.
    var every = Math.max(1, Math.ceil((Math.max.apply(null, el.map(function (l) { return tw(l, 10, true); })) * 1.5 + 8) / cw));
    for (e = 0; e <= b.count; e += every) {
      s += text(X(e), top + ph + 15, el[e], small(th, 10, 'text-anchor="' + (e === 0 ? 'start' : e === b.count ? 'end' : 'middle') + '"'));
    }
    // Bars touch, with a hairline gap, because the ranges run on from each other. Several series overlap.
    S.forEach(function (_, j) {
      for (var i = 0; i < b.count; i++) {
        var v = height(j, i);
        if (!v) continue;
        var y = Y(v);
        s += '<rect x="' + r2(X(i) + 0.5) + '" y="' + r2(y) + '" width="' + r2(Math.max(1, cw - 1)) + '" height="' + r2(top + ph - y) + '" fill="' + (fills[j] || pal[j % pal.length]) + '"' +
          (multi ? ' fill-opacity=".55"' : '') + anim(o, 'bzc-g', Math.min(0.6, i * 0.03)) + '/>';
      }
    });
    // Mean and median lines, one per series. Their labels stack at the top beside the outermost line, on the side with
    // more room, so no label crosses a line.
    var lo = b.edge(0), span = b.edge(b.count) - lo, lines = [];
    S.forEach(function (ser, j) {
      marks.forEach(function (m) {
        var v = m === 'mean' ? mean(ser) : median(ser);
        lines.push({ x: px + (v - lo) / span * pw, c: multi ? pal[j % pal.length] : th.fg, t: (multi ? nameOf(j) + ' ' : '') + m + ' ' + fmt(v, o) });
      });
    });
    if (lines.length) {
      var xs = lines.map(function (l) { return l.x; }), left = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2 > px + pw / 2;
      var lx = left ? Math.min.apply(null, xs) - 5 : Math.max.apply(null, xs) + 5;
      lines.forEach(function (l, r) {
        s += '<line x1="' + r2(l.x) + '" x2="' + r2(l.x) + '" y1="' + r2(top) + '" y2="' + r2(top + ph) + '" stroke="' + l.c + '" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          text(lx, top + 9 + r * 12, l.t, small(th, 10, 'text-anchor="' + (left ? 'end' : 'start') + '"', multi ? l.c : th.fg));
      });
    }
    for (i = 0; i < b.count; i++) {
      var tip = range(i);
      S.forEach(function (_, j) { tip += '\n' + (multi ? nameOf(j) + ': ' : '') + b.counts[j][i] + ' (' + share(j, i) + '%)'; });
      s += hit(X(i), top, cw, ph, tip, i, S.map(function (_, j) { return b.counts[j][i]; }));
    }
    return s;
  }, {
    summary: b ? (multi ? k + ' series, ' : '') + n + ' values in ' + b.count + ' ranges from ' + fmt(b.edge(0), eo) + ' to ' + fmt(b.edge(b.count), eo) + ', most in ' + range(peak) : 'no data',
  });
}

histogram.table = function (o) {
  var b = binned(o), names = list(o.series);
  if (!b) return { head: ['Range', 'Count'], rows: [] };
  var multi = b.S.length > 1 || names.length > 0, eo = Object.assign({}, o, { decimals: has(o.decimals) ? o.decimals : b.dp }), rows = [];
  for (var i = 0; i < b.count; i++) {
    var row = [fmt(b.edge(i), eo) + ' to ' + fmt(b.edge(i + 1), eo)];
    if (multi) b.S.forEach(function (_, j) { row.push(String(b.counts[j][i])); });
    else row.push(String(b.counts[0][i]), Math.round(b.counts[0][i] / b.S[0].length * 100) + '%');
    rows.push(row);
  }
  return { head: ['Range'].concat(multi ? b.S.map(function (_, j) { return names[j] || 'Series ' + (j + 1); }) : ['Count', 'Share']), rows: rows };
};

/**
 * The round width (1, 2, 2.5 or 5 times a power of ten) nearest to raw, and the decimals it needs. Nearest on a log
 * scale: the thresholds sit halfway between the steps, at √2, √5, √12.5 and √50.
 */
function niceWidth(raw) {
  var e = Math.floor(Math.log10(raw)), p = Number('1e' + e), f = raw / p;
  var m = f < 1.4142 ? 1 : f < 2.2361 ? 2 : f < 3.5355 ? 2.5 : f < 7.0711 ? 5 : 10;
  return { w: m * p, dp: Math.max(0, m === 10 ? -e - 1 : -e) + (m === 2.5 ? 1 : 0) };
}

/**
 * Sorts every value into ranges. bin-width sets the width; otherwise bins sets roughly how many ranges, and by default
 * there are about log2(n) + 1. Returns null when there is nothing to count.
 */
function binned(o) {
  var S = series(o.values), all = [].concat.apply([], S);
  if (!all.length) return null;
  var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), w = num(o.binWidth, 0), dp, nice;
  if (w > 0 && (hi - lo) / w <= 200) {
    var str = String(o.binWidth), dot = str.indexOf('.');
    dp = dot < 0 ? 0 : Math.min(6, str.length - dot - 1);
  } else {
    var k = num(o.bins, 0) > 0 ? Math.round(num(o.bins, 0)) : Math.ceil(Math.log2(all.length) + 1);
    k = Math.min(Math.max(k, 1), 50);
    nice = niceWidth(hi > lo ? (hi - lo) / k : Math.abs(lo) || 1);
    w = nice.w;
    dp = nice.dp;
  }
  // Edges are whole multiples of the width, rounded to the width's decimals so 3 × 0.1 is 0.3, not 0.30000000000000004.
  // Counting compares values against these same edges, so a value typed as 0.3 lands in the range that starts at 0.3.
  var s0 = Math.floor(lo / w);
  var edge = function (i) { return Number(((s0 + i) * w).toFixed(dp + 3)); };
  while (edge(0) > lo) s0--;
  // Just enough ranges to reach the largest value, which the last range includes even when it sits on an edge.
  var count = Math.max(1, Math.ceil((hi - edge(0)) / w));
  while (count > 1 && edge(count - 1) >= hi) count--;
  while (edge(count) < hi) count++;
  var counts = S.map(function (ser) {
    var c = [];
    for (var i = 0; i < count; i++) c.push(0);
    ser.forEach(function (x) {
      var i = Math.min(count - 1, Math.max(0, Math.floor((x - edge(0)) / w)));
      while (i > 0 && x < edge(i)) i--;
      while (i < count - 1 && x >= edge(i + 1)) i++;
      c[i]++;
    });
    return c;
  });
  return { S: S, edge: edge, count: count, counts: counts, dp: dp };
}

function total(b, i) {
  var t = 0;
  b.counts.forEach(function (c) { t += c[i]; });
  return t;
}

function mean(v) {
  var t = 0;
  v.forEach(function (x) { t += x; });
  return t / v.length;
}

function median(v) {
  var s = v.slice().sort(function (a, b) { return a - b; }), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
