import { r2, num, has, list, nums, series, tw, trunc, fmt, text, hit, anim, palette, emptyState, SANS, MONO } from '../core/util.js';
import { legend } from '../core/series.js';
import { tile, dims } from '../core/tile.js';

/**
 * Bullet charts: one row per measure, with the actual value as a bar, the target as an upright line and shaded bands
 * behind for the ranges. values="182,64,7.4" targets="200,60,8" labels="Revenue,Margin,NPS".
 * zones are the band edges, the same as the gauge's: zones="150,180" makes three bands. Separate rows with "|" when
 * each measure has its own, and name the bands with zone-labels="Poor,Fair,Good".
 * Each row has its own scale from zero, so measures in different units sit together.
 */
export default function bullet(o, th) {
  var v = nums(o.values), n = v.length, labels = list(o.labels), names = list(o.series), pal = palette(o, th);
  var T = nums(o.targets), Z = series(o.zones), zoneNames = list(o.zoneLabels), many = list(o.color).length > 1;
  var targetOf = function (i) { return T.length === 1 ? T[0] : T[i]; };
  var zonesOf = function (i) { return (Z.length > 1 ? Z[i] || [] : Z[0] || []).slice().sort(function (a, b) { return a - b; }); };
  var hasT = function (i) { return isFinite(targetOf(i)); };
  var anyT = v.some(function (_, i) { return hasT(i); });
  var nameOf = function (i) { return labels[i] || 'Measure ' + (i + 1); };
  var keyNames = [names[0] || 'Actual', names[1] || 'Target'];
  var key = function (j, x, y) {
    return j ? '<line x1="' + r2(x + 5) + '" x2="' + r2(x + 5) + '" y1="' + r2(y) + '" y2="' + r2(y + 12) + '" stroke="' + th.fg + '" stroke-width="2.5"/>'
      : '<rect x="' + r2(x) + '" y="' + r2(y + 3) + '" width="10" height="6" rx="1.5" fill="' + pal[0] + '"/>';
  };
  var d0 = dims(o), rowH = 32;
  var legendH = anyT && n ? legend(keyNames, pal, th, 0, 0, d0.w, key, 15).height : 0;
  var h = legendH + Math.max(1, n) * rowH - 8;
  var met = v.filter(function (x, i) { return hasT(i) && x >= targetOf(i); }).length;

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!n) return emptyState(th, x0, y0, w, h);
    var s = '', top0 = y0;
    if (legendH) { s += legend(keyNames, pal, th, x0, y0, w, key, 15).svg; top0 += legendH; }
    var labW = labels.length ? Math.min(w * 0.4, Math.max.apply(null, labels.map(function (l) { return tw(l, 12); })) + 12) : 0;
    var valW = Math.max.apply(null, v.map(function (x) { return tw(fmt(x, o), 11, true); })) + 10;
    var bx = x0 + labW, bw = Math.max(1, w - labW - valW);
    for (var i = 0; i < n; i++) {
      var val = v[i], t = targetOf(i), zs = zonesOf(i), ry = top0 + i * rowH, cy = ry + 12;
      var lo = Math.min.apply(null, [0, val].concat(zs, hasT(i) ? [t] : []));
      // A little room past the largest value, so a target there doesn't sit on the edge.
      var hi = has(o.max) ? num(o.max, 1) : Math.max.apply(null, [0, val].concat(zs, hasT(i) ? [t] : [])) * 1.08;
      if (hi <= lo) hi = lo + 1;
      var X = function (x) { return bx + (Math.min(hi, Math.max(lo, x)) - lo) / (hi - lo) * bw; };
      // The bands, darkest at the low end, so they read in greyscale and print well.
      var edges = [lo].concat(zs.filter(function (z) { return z > lo && z < hi; }), [hi]), nb = edges.length - 1;
      for (var b = 0; b < nb; b++) {
        s += '<rect x="' + r2(X(edges[b])) + '" y="' + r2(cy - 10) + '" width="' + r2(X(edges[b + 1]) - X(edges[b])) + '" height="20" fill="' + th.muted +
          '" fill-opacity="' + r2(nb > 1 ? 0.1 + 0.3 * (nb - 1 - b) / (nb - 1) : 0.14) + '"/>';
      }
      var a = X(Math.min(0, val)), len = X(Math.max(0, val)) - a;
      if (len > 0) {
        s += '<rect x="' + r2(a) + '" y="' + r2(cy - 4) + '" width="' + r2(len) + '" height="8" rx="1.5" fill="' + (many ? pal[i % pal.length] : pal[0]) + '"' +
          anim(o, 'bzc-gx', i * 0.06) + '/>';
      }
      if (hasT(i)) {
        s += '<line x1="' + r2(X(t)) + '" x2="' + r2(X(t)) + '" y1="' + r2(cy - 8) + '" y2="' + r2(cy + 8) + '" stroke="' + th.fg + '" stroke-width="2.5"/>';
      }
      if (labels[i] != null) s += text(x0, cy + 4, trunc(labels[i], Math.floor(labW / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
      s += text(x0 + w, cy + 4, fmt(val, o), 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
      s += hit(x0, ry, w, rowH - 8, tipOf(i));
    }
    return s;
  }, { summary: !n ? 'no data' : anyT ? met + ' of ' + n + (n === 1 ? ' measure' : ' measures') + ' at or above target' : n + (n === 1 ? ' measure' : ' measures') });

  function tipOf(i) {
    var row = rowOf(o, i, v[i], targetOf(i), zonesOf(i), zoneNames);
    return nameOf(i) + '\n' + keyNames[0] + ' ' + row[0] + (hasT(i) ? '\n' + keyNames[1] + ' ' + row[1] + '\nDifference ' + row[2] : '') + (row[3] ? '\nBand ' + row[3] : '');
  }
}

/** One row's cells, formatted: actual, target, difference and the band the actual falls in. */
function rowOf(o, i, val, t, zs, zoneNames) {
  var j = 0, nb = zs.length + 1;
  while (j < zs.length && val >= zs[j]) j++;
  var d = val - t;
  return [fmt(val, o), fmt(t, o), isFinite(d) ? (d > 0 ? '+' : '') + fmt(d, o) : '–', zs.length ? zoneNames[j] || j + 1 + ' of ' + nb : ''];
}

bullet.table = function (o) {
  var v = nums(o.values), labels = list(o.labels), T = nums(o.targets), Z = series(o.zones), zoneNames = list(o.zoneLabels), names = list(o.series);
  var anyT = T.length > 0, anyZ = Z.length > 0;
  return {
    head: ['Measure', names[0] || 'Actual'].concat(anyT ? [names[1] || 'Target', 'Difference'] : [], anyZ ? ['Band'] : []),
    rows: v.map(function (val, i) {
      var zs = (Z.length > 1 ? Z[i] || [] : Z[0] || []).slice().sort(function (a, b) { return a - b; });
      var row = rowOf(o, i, val, T.length === 1 ? T[0] : T[i], zs, zoneNames);
      return [labels[i] || 'Measure ' + (i + 1), row[0]].concat(anyT ? [row[1], row[2]] : [], anyZ ? [row[3] || '–'] : []);
    }),
  };
};
