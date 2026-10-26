import { r2, num, has, nums, list, tw, trunc, bool, fmt, text, small, hit, anim, palette, emptyState, goalLine, statOf, SANS, MONO } from '../core/util.js';
import { tile, dims } from '../core/tile.js';

export default function bars(o, th) {
  var v = nums(o.values), labels = list(o.labels), pal = palette(o, th);
  var horiz = bool(o.horizontal), many = list(o.color).filter(Boolean).length > 1;
  var d0 = dims(o), h = horiz ? Math.max(1, v.length) * 30 - 6 : num(o.height, 140);
  var st = statOf(v, o, '');
  var top = v.length ? Math.max.apply(null, v) : 0;
  var colourOf = function (i) { return many ? pal[i % pal.length] : pal[0]; };
  var opac = function (n) { return many || o.highlight === 'none' || n === top ? 1 : 0.5; };
  var best = v.indexOf(top);
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!v.length) return emptyState(th, x0, y0, w, h);
    var s = '', lo = Math.min(0, Math.min.apply(null, v)), hi = Math.max(0, top);
    if (has(o.goal)) { lo = Math.min(lo, +o.goal); hi = Math.max(hi, +o.goal); }
    if (hi === lo) hi = lo + 1;
    if (horiz) {
      var labW = labels.length ? Math.min(w * 0.4, Math.max.apply(null, labels.map(function (l) { return tw(l, 12); })) + 10) : 0;
      var vals = v.map(function (n) { return fmt(n, o); });
      var valW = Math.max.apply(null, vals.map(function (t) { return tw(t, 11, true); })) + 10;
      var bx = x0 + labW, bw = w - labW - valW, hiH = Math.max(hi, 0) || 1;
      v.forEach(function (n, i) {
        var y = y0 + i * 30, len = Math.max(0, n) / hiH * bw;
        if (labels[i] != null) s += text(x0, y + 16, trunc(labels[i], Math.floor(labW / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
        s += '<rect x="' + r2(bx) + '" y="' + (y + 5) + '" width="' + r2(bw) + '" height="14" rx="7" fill="' + th.grid + '" fill-opacity=".6"/>';
        if (len > 0) s += '<rect x="' + r2(bx) + '" y="' + (y + 5) + '" width="' + r2(Math.max(14, len)) + '" height="14" rx="7" fill="' + colourOf(i) + '" fill-opacity="' + opac(n) + '"' + anim(o, 'bzc-gx', i * 0.06) + '/>';
        s += text(x0 + w, y + 16, vals[i], 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
        s += hit(x0, y, w, 24, (labels[i] || '#' + (i + 1)) + ': ' + vals[i]);
      });
      if (has(o.goal) && +o.goal > 0) {
        var gx = bx + (+o.goal) / hiH * bw;
        s += '<line x1="' + r2(gx) + '" x2="' + r2(gx) + '" y1="' + (y0 - 2) + '" y2="' + (y0 + h + 2) + '" stroke="' + th.fg + '" stroke-opacity=".55" stroke-dasharray="3 3"/>';
      }
      return s;
    }
    var negLab = bool(o.showValues) && lo < 0 ? 14 : 0;
    var bottom = (labels.length ? 20 : 2) + negLab, topPad = bool(o.showValues) ? 16 : 4;
    var ph = h - bottom - topPad, py = y0 + topPad;
    var Y = function (n) { return py + ph - (n - lo) / (hi - lo) * ph; };
    var slot = w / v.length, bwid = Math.min(slot * 0.62, 56), Y0 = Y(0);
    var every = labels.length ? Math.max(1, Math.ceil(v.length * (Math.max.apply(null, labels.map(function (l) { return tw(l, 10, true); })) + 8) / w)) : 1;
    s += '<line x1="' + x0 + '" x2="' + (x0 + w) + '" y1="' + r2(Y0) + '" y2="' + r2(Y0) + '" stroke="' + th.grid + '"/>';
    v.forEach(function (n, i) {
      var x = x0 + i * slot + (slot - bwid) / 2, y = Math.min(Y(n), Y0), bh = Math.abs(Y(n) - Y0);
      if (bh > 0.5) {
        s += '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(bwid) + '" height="' + r2(bh) + '" rx="' + r2(Math.min(6, bwid / 2, bh / 2)) +
          '" fill="' + colourOf(i) + '" fill-opacity="' + opac(n) + '"' + anim(o, n < 0 ? 'bzc-gn' : 'bzc-g', i * 0.05) + '/>';
      }
      if (labels[i] != null && i % every === 0) s += text(x + bwid / 2, py + ph + negLab + 15, labels[i], small(th, 10, 'text-anchor="middle"'));
      if (bool(o.showValues)) s += text(x + bwid / 2, n < 0 ? Y(n) + 12 : Y(n) - 5, fmt(n, o, true), 'text-anchor="middle" fill="' + th.fg + '" font-family="' + MONO + '" font-size="10" font-weight="600"');
      s += hit(x0 + i * slot, y0, slot, h, (labels[i] || '#' + (i + 1)) + ': ' + fmt(n, o));
    });
    if (has(o.goal)) s += goalLine(o, th, x0, x0 + w, Y(+o.goal));
    return s;
  }, { stat: st, summary: v.length ? 'highest ' + (labels[best] || '') + ' ' + fmt(top, o) : 'no data' });
}
