import { r2, num, has, list, series, tw, trunc, bool, fmt, text, small, hit, anim, palette, emptyState, goalLine, statOf, legend, SANS, MONO } from '../core/util.js';
import { tile, dims } from '../core/tile.js';

/**
 * Bars, vertical or horizontal. Separate several series with "|" in values to get grouped bars:
 * values="4,9,6|3,7,8" series="2026,2025".
 */
export default function bars(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var k = S.length, n = Math.max.apply(null, [0].concat(S.map(function (s) { return s.length; })));
  var grouped = k > 1, horiz = bool(o.horizontal);
  var many = !grouped && list(o.color).filter(Boolean).length > 1;
  var v0 = S[0] || [], all = [].concat.apply([], S);
  var top = all.length ? Math.max.apply(null, all) : 0;
  var nameOf = function (j) { return names[j] || 'Series ' + (j + 1); };
  var colourOf = function (j, i) { return grouped ? pal[j % pal.length] : many ? pal[i % pal.length] : pal[0]; };
  var opac = function (val) { return grouped || many || o.highlight === 'none' || val === top ? 1 : 0.5; };
  var labelOf = function (i) { return labels[i] || '#' + (i + 1); };
  var tipOf = function (i) {
    if (!grouped) return labelOf(i) + ': ' + fmt(v0[i], o);
    return labelOf(i) + S.map(function (s, j) { return i < s.length ? '\n' + nameOf(j) + ': ' + fmt(s[i], o) : ''; }).join('');
  };

  // Horizontal rows need their height up front, and so does a legend that may wrap.
  var d0 = dims(o);
  var legendH = grouped || names.length ? legend(S.map(function (_, j) { return nameOf(j); }), pal, th, 0, 0, d0.w).height : 0;
  var subH = grouped ? 10 : 14, subGap = 3;
  var rowH = horiz ? k * subH + (k - 1) * subGap + (grouped ? 14 : 16) : 0;
  var h = horiz ? legendH + Math.max(1, n) * rowH - 6 : num(o.height, 140) + legendH;
  var best = v0.indexOf(Math.max.apply(null, v0.length ? v0 : [0]));

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!n) return emptyState(th, x0, y0, w, h);
    var s = '', top0 = y0;
    if (legendH) {
      s += legend(S.map(function (_, j) { return nameOf(j); }), pal, th, x0, y0, w).svg;
      top0 += legendH;
    }
    var lo = Math.min(0, Math.min.apply(null, all)), hi = Math.max(0, top);
    if (has(o.goal)) { lo = Math.min(lo, +o.goal); hi = Math.max(hi, +o.goal); }
    if (hi === lo) hi = lo + 1;

    if (horiz) {
      var labW = labels.length ? Math.min(w * 0.4, Math.max.apply(null, labels.map(function (l) { return tw(l, 12); })) + 10) : 0;
      var vals = S.map(function (s) { return s.map(function (x) { return fmt(x, o); }); });
      var valW = Math.max.apply(null, [].concat.apply([], vals).map(function (t) { return tw(t, grouped ? 10 : 11, true); })) + 10;
      var bx = x0 + labW, bw = w - labW - valW, span = Math.max(hi, 0) || 1;
      for (var i = 0; i < n; i++) {
        var ry = top0 + i * rowH;
        if (labels[i] != null) s += text(x0, ry + (rowH - 6) / 2 + 4, trunc(labels[i], Math.floor(labW / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
        S.forEach(function (ser, j) {
          if (i >= ser.length) return;
          var val = ser[i], by = ry + (grouped ? 2 : 5) + j * (subH + subGap), len = Math.max(0, val) / span * bw;
          if (!grouped) s += '<rect x="' + r2(bx) + '" y="' + r2(by) + '" width="' + r2(bw) + '" height="' + subH + '" rx="' + subH / 2 + '" fill="' + th.grid + '" fill-opacity=".6"/>';
          if (len > 0) {
            s += '<rect x="' + r2(bx) + '" y="' + r2(by) + '" width="' + r2(Math.max(subH, len)) + '" height="' + subH + '" rx="' + subH / 2 + '" fill="' + colourOf(j, i) +
              '" fill-opacity="' + opac(val) + '"' + anim(o, 'bzc-gx', i * 0.06 + j * 0.03) + '/>';
          }
          s += text(x0 + w, by + subH / 2 + 3.8, vals[j][i], 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="' + (grouped ? 10 : 11) + '" font-weight="600"');
        });
        s += hit(x0, ry, w, rowH - 6, tipOf(i));
      }
      if (has(o.goal) && +o.goal > 0) {
        var gx = bx + (+o.goal) / span * bw;
        s += '<line x1="' + r2(gx) + '" x2="' + r2(gx) + '" y1="' + r2(top0 - 2) + '" y2="' + r2(y0 + h + 2) + '" stroke="' + th.fg + '" stroke-opacity=".55" stroke-dasharray="3 3"/>';
      }
      return s;
    }

    var negLab = bool(o.showValues) && lo < 0 ? 14 : 0;
    var bottom = (labels.length ? 20 : 2) + negLab, topPad = bool(o.showValues) ? 16 : 4;
    var ph = h - (top0 - y0) - bottom - topPad, py = top0 + topPad;
    var Y = function (x) { return py + ph - (x - lo) / (hi - lo) * ph; };
    var slot = w / n, groupW = Math.min(slot * (grouped ? 0.78 : 0.62), grouped ? k * 30 : 56);
    var gap = grouped ? Math.min(3, groupW / k * 0.15) : 0, bwid = (groupW - gap * (k - 1)) / k, Y0 = Y(0);
    var every = labels.length ? Math.max(1, Math.ceil(n * (Math.max.apply(null, labels.map(function (l) { return tw(l, 10, true); })) + 8) / w)) : 1;
    s += '<line x1="' + x0 + '" x2="' + (x0 + w) + '" y1="' + r2(Y0) + '" y2="' + r2(Y0) + '" stroke="' + th.grid + '"/>';
    for (var c = 0; c < n; c++) {
      var gx0 = x0 + c * slot + (slot - groupW) / 2;
      S.forEach(function (ser, j) {
        if (c >= ser.length) return;
        var val = ser[c], x = gx0 + j * (bwid + gap), y = Math.min(Y(val), Y0), bh = Math.abs(Y(val) - Y0);
        if (bh > 0.5) {
          s += '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(bwid) + '" height="' + r2(bh) + '" rx="' + r2(Math.min(6, bwid / 2, bh / 2)) +
            '" fill="' + colourOf(j, c) + '" fill-opacity="' + opac(val) + '"' + anim(o, val < 0 ? 'bzc-gn' : 'bzc-g', c * 0.05 + j * 0.03) + '/>';
        }
        if (bool(o.showValues)) {
          s += text(x + bwid / 2, val < 0 ? Y(val) + 12 : Y(val) - 5, fmt(val, o, true),
            'text-anchor="middle" fill="' + th.fg + '" font-family="' + MONO + '" font-size="' + (grouped ? 9 : 10) + '" font-weight="600"');
        }
      });
      if (labels[c] != null && c % every === 0) s += text(gx0 + groupW / 2, py + ph + negLab + 15, labels[c], small(th, 10, 'text-anchor="middle"'));
      s += hit(x0 + c * slot, top0, slot, h - (top0 - y0), tipOf(c));
    }
    if (has(o.goal)) s += goalLine(o, th, x0, x0 + w, Y(+o.goal));
    return s;
  }, {
    stat: statOf(v0, o, ''),
    summary: !n ? 'no data' : grouped ? k + ' series across ' + n + ' groups' : 'highest ' + (labels[best] || '') + ' ' + fmt(v0[best], o),
  });
}
