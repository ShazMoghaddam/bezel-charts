import { newId, r2, num, has, list, series, bool, fmt, tw, text, small, hit, anim, palette, emptyState, pathOf } from '../core/util.js';
import { niceScale, legend, styleOf, pattern, marker, DASHES, SHAPES, PATTERNS } from '../core/series.js';
import { seriesLine, pointMarks } from '../core/lines.js';
import { tile } from '../core/tile.js';

/**
 * Bars and lines with different units on one chart: bars read against the left axis, lines against the right.
 * The right axis gets the same number of steps as the left, so every gridline reads on both sides, and each axis
 * carries a coloured rule matching its data. Several bar series sit side by side, or pile up with `stacked`.
 */
export default function combo(o, th) {
  var B = series(o.values), L = series(o.line), pal = palette(o, th), k = B.length, m = L.length;
  var labels = list(o.labels), bnames = list(o.series), lnames = list(o.lineSeries), stacked = k > 1 && bool(o.stacked);
  var n = Math.max.apply(null, [0].concat(B.concat(L).map(function (s) { return s.length; })));
  var lo = lineOpts(o), h = num(o.height, 200);
  var barName = function (j) { return bnames[j] || (k === 1 ? 'Bars' : 'Bars ' + (j + 1)); };
  var lineName = function (j) { return lnames[j] || (m === 1 ? 'Line' : 'Line ' + (j + 1)); };
  var barCol = function (j) { return pal[j % pal.length]; }, lineCol = function (j) { return pal[(k + j) % pal.length]; };
  var val = function (s, i) { return i < s.length ? s[i] : 0; };

  var dashOf = styleOf(o.dash, Object.keys(DASHES), 'solid'), markOf = styleOf(o.markers, SHAPES, 'none');
  var patOf = k > 1 ? styleOf(o.patterns, PATTERNS, 'solid') : null, bg = o.background || th.tile, defs = '', fills = [];
  for (var q = 0; patOf && q < k; q++) {
    if (patOf(q) === 'solid') continue;
    var pid = newId('g');
    defs += pattern(pid, patOf(q), barCol(q), bg);
    fills[q] = 'url(#' + pid + ')';
  }
  // The legend shows a bar swatch for each bar series and a short line for each line.
  var key = function (e, x, y) {
    if (e < k) return '<rect x="' + r2(x) + '" y="' + r2(y + 1) + '" width="10" height="10" rx="2" fill="' + (fills[e] || barCol(e)) + '"/>';
    var j = e - k, c = lineCol(j), dk = dashOf ? DASHES[dashOf(j)] : '', mk = markOf ? markOf(j) : 'none';
    return '<line x1="' + r2(x) + '" x2="' + r2(x + 18) + '" y1="' + r2(y + 6) + '" y2="' + r2(y + 6) + '" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round"' +
      (dk ? ' stroke-dasharray="' + dk + '"' : '') + '/>' + (mk !== 'none' ? marker(mk, x + 9, y + 6, 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"') : '');
  };

  // Each column's bar extent: side by side, or piled up with positive parts above zero and negative parts below.
  var tops = [], bottoms = [];
  for (var i = 0; i < n; i++) {
    var up = 0, down = 0;
    B.forEach(function (s) {
      var v = val(s, i);
      if (stacked) { if (v >= 0) up += v; else down += v; }
      else { up = Math.max(up, v); down = Math.min(down, v); }
    });
    tops.push(up); bottoms.push(down);
  }

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!n || !k) return emptyState(th, x0, y0, w, h);
    var s = defs ? '<defs>' + defs + '</defs>' : '', top = y0;
    var lg = legend(B.map(function (_, j) { return barName(j); }).concat(L.map(function (_, j) { return lineName(j); })), pal, th, x0, top, w, key, 24);
    s += lg.svg;
    top += lg.height;
    var titled = has(o.yLabel) || has(o.lineLabel);
    if (titled) top += 16;
    // Left axis: bars, always including zero. Right axis: lines, with the same number of steps.
    var sc = niceScale(Math.min.apply(null, bottoms), Math.max.apply(null, tops), 4), steps = sc.ticks.length - 1;
    var all = [].concat.apply([], L);
    var lmin = Math.min.apply(null, all), lmax = Math.max.apply(null, all);
    if (bool(o.lineZero)) { lmin = Math.min(0, lmin); lmax = Math.max(0, lmax); }
    var sc2 = m ? matched(lmin, lmax, steps) : null;
    var tl = sc.ticks.map(function (t) { return fmt(t, o, true); }), tr = sc2 ? sc2.ticks.map(function (t) { return fmt(t, lo, true); }) : [];
    var lw = Math.max.apply(null, tl.map(function (t) { return tw(t, 10, true); })) + 10;
    var rw = sc2 ? Math.max.apply(null, tr.map(function (t) { return tw(t, 10, true); })) + 10 : 0;
    var px = x0 + lw, pw = w - lw - rw, ph = h - (top - y0) - (labels.length ? 20 : 4), band = pw / n;
    var X = function (i) { return px + band * (i + 0.5); };
    var Y = function (v) { return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph; };
    var Y2 = function (v) { return top + ph - (v - sc2.lo) / (sc2.hi - sc2.lo) * ph; };
    sc.ticks.forEach(function (t, i) {
      var y = Y(t);
      s += '<line x1="' + r2(px) + '" x2="' + r2(px + pw) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.grid + '"' + (t === 0 ? '' : ' stroke-dasharray="2 4"') + '/>' +
        text(px - 8, y + 3.5, tl[i], small(th, 10, 'text-anchor="end"')) + (sc2 ? text(px + pw + 8, y + 3.5, tr[i], small(th, 10, 'text-anchor="start"')) : '');
    });
    // A rule down each side in its data's colour, and titles above, so it's clear which axis belongs to what.
    // With several series on one side, the rule takes the theme's text colour instead.
    var leftC = k === 1 ? barCol(0) : th.muted, rightC = m === 1 ? lineCol(0) : th.muted;
    s += '<line x1="' + r2(px) + '" x2="' + r2(px) + '" y1="' + r2(top) + '" y2="' + r2(top + ph) + '" stroke="' + leftC + '" stroke-width="2"/>';
    if (sc2) s += '<line x1="' + r2(px + pw) + '" x2="' + r2(px + pw) + '" y1="' + r2(top) + '" y2="' + r2(top + ph) + '" stroke="' + rightC + '" stroke-width="2"/>';
    if (has(o.yLabel)) s += text(x0, top - 8, o.yLabel, small(th, 10, '', k === 1 ? leftC : th.fg));
    if (has(o.lineLabel) && sc2) s += text(x0 + w, top - 8, o.lineLabel, small(th, 10, 'text-anchor="end"', m === 1 ? rightC : th.fg));
    if (labels.length) {
      var every = Math.max(1, Math.ceil((Math.max.apply(null, labels.map(function (l) { return tw(l, 10, true); })) + 10) / band));
      for (i = 0; i < n; i += every) if (labels[i] != null) s += text(X(i), top + ph + 15, labels[i], small(th, 10, 'text-anchor="middle"'));
    }
    // Bars: side by side within each column, or one pile per column.
    var gw = band * 0.72, bw = stacked ? gw : gw / k;
    for (i = 0; i < n; i++) {
      var up = 0, down = 0;
      B.forEach(function (ser, j) {
        if (i >= ser.length) return;
        var v = ser[i], a, b, x = stacked ? X(i) - gw / 2 : X(i) - gw / 2 + j * bw;
        if (stacked) { if (v >= 0) { a = up; up += v; b = up; } else { a = down; down += v; b = down; } }
        else { a = 0; b = v; }
        var ya = Y(a), yb = Y(b);
        s += '<rect x="' + r2(x + 0.5) + '" y="' + r2(Math.min(ya, yb)) + '" width="' + r2(Math.max(1, bw - 1)) + '" height="' + r2(Math.abs(yb - ya)) + '" rx="2" fill="' + (fills[j] || barCol(j)) + '"' +
          anim(o, v < 0 ? 'bzc-gn' : 'bzc-g', Math.min(0.6, i * 0.04)) + '/>';
      });
    }
    // Lines over the bars, on the right axis.
    L.forEach(function (ser, j) {
      var c = lineCol(j), P = ser.map(function (v, i) { return [X(i), Y2(v)]; }), mk = markOf ? markOf(j) : 'none';
      s += seriesLine(o, pathOf(P, bool(o.straight)), c, j, dashOf ? DASHES[dashOf(j)] : '');
      if (mk !== 'none') s += pointMarks(o, mk, ser, X, Y2, c, bg, j);
      else s += '<circle cx="' + r2(P[P.length - 1][0]) + '" cy="' + r2(P[P.length - 1][1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>';
    });
    for (i = 0; i < n; i++) {
      var tip = labels[i] || '#' + (i + 1), t = 0;
      B.forEach(function (ser, j) { if (i < ser.length) { tip += '\n' + barName(j) + ': ' + fmt(ser[i], o); t += ser[i]; } });
      if (stacked) tip += '\nTotal: ' + fmt(t, o);
      L.forEach(function (ser, j) { if (i < ser.length) tip += '\n' + lineName(j) + ': ' + fmt(ser[i], lo); });
      s += hit(X(i) - band / 2, top, band, ph, tip);
    }
    return s;
  }, { summary: k + ' bar series' + (stacked ? ' stacked' : '') + ' and ' + m + (m === 1 ? ' line' : ' lines') + ' over ' + n + ' points' });
}

combo.table = function (o) {
  var B = series(o.values), L = series(o.line), labels = list(o.labels), bn = list(o.series), ln = list(o.lineSeries);
  var k = B.length, m = L.length, stacked = k > 1 && bool(o.stacked), lo = lineOpts(o), rows = [];
  var n = Math.max.apply(null, [0].concat(B.concat(L).map(function (s) { return s.length; })));
  for (var i = 0; i < n; i++) {
    var row = [labels[i] || '#' + (i + 1)], t = 0;
    B.forEach(function (s) { row.push(i < s.length ? fmt(s[i], o) : ''); t += i < s.length ? s[i] : 0; });
    if (stacked) row.push(fmt(t, o));
    L.forEach(function (s) { row.push(i < s.length ? fmt(s[i], lo) : ''); });
    rows.push(row);
  }
  return {
    head: ['Label'].concat(B.map(function (_, j) { return bn[j] || (k === 1 ? 'Bars' : 'Bars ' + (j + 1)); }), stacked ? ['Total'] : [],
      L.map(function (_, j) { return ln[j] || (m === 1 ? 'Line' : 'Line ' + (j + 1)); })),
    rows: rows,
  };
};

/** Number formatting for the line's axis and values, from line-prefix, line-suffix and line-decimals. */
function lineOpts(o) {
  return { prefix: o.linePrefix, suffix: o.lineSuffix, decimals: o.lineDecimals, compact: o.compact, lang: o.lang };
}

/**
 * A round scale over min to max with exactly n steps, so its gridlines match another axis. Steps grow through
 * 1, 2 and 5 times powers of ten until n of them reach from a round start past max.
 */
function matched(min, max, n) {
  if (min === max) {
    if (min === 0) max = 1;
    else { var p = Math.abs(min) * 0.1; min -= p; max += p; }
  }
  var mag = Math.pow(10, Math.floor(Math.log10((max - min) / n))), steps = [1, 2, 5, 10], i = 0, step, lo;
  for (;;) {
    step = steps[i] * mag;
    lo = Math.floor(min / step) * step;
    if (lo + n * step >= max - step * 1e-9) break;
    if (++i === 4) { i = 1; mag *= 10; }
  }
  var ticks = [];
  for (var t = 0; t <= n; t++) ticks.push(+(lo + t * step).toFixed(10));
  return { lo: ticks[0], hi: ticks[n], ticks: ticks };
}
