import { esc, r2, num, has, nums, list, sum, trunc, fmt, text, small, hit, anim, palette, emptyState, statOf, SANS, MONO } from '../core/util.js';
import { tile } from '../core/tile.js';

export default function donut(o, th) {
  var raw = nums(o.values).map(function (n) { return Math.max(0, n); }), lab = list(o.labels), pal = palette(o, th);
  var v = raw.slice(), labels = lab.slice();
  if (v.length > 6) {
    var idx = v.map(function (n, i) { return i; }).sort(function (a, b) { return raw[b] - raw[a]; });
    var keep = idx.slice(0, 5).sort(function (a, b) { return a - b; });
    v = keep.map(function (i) { return raw[i]; }); labels = keep.map(function (i) { return lab[i] || '#' + (i + 1); });
    v.push(sum(idx.slice(5).map(function (i) { return raw[i]; }))); labels.push('Other');
  }
  var total = sum(v), h = num(o.height, 150);
  var st = statOf(v, o, '');
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!total) return emptyState(th, x0, y0, w, h);
    var s = '', size = Math.min(h, w * 0.5), cx = x0 + size / 2, cy = y0 + h / 2;
    var sw = size * 0.16, r = (size - sw) / 2, start = 0, gap = v.filter(Boolean).length > 1 ? 0.9 : 0;
    v.forEach(function (n, i) {
      var len = n / total * 100;
      if (len <= 0) return;
      var seg = Math.max(0.01, len - gap);
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="' + pal[i % pal.length] + '" stroke-width="' + r2(sw) +
        '" pathLength="100" stroke-dasharray="' + r2(seg) + ' ' + r2(100 - seg) + '" stroke-dashoffset="' + r2(-start) +
        '" transform="rotate(-90 ' + r2(cx) + ' ' + r2(cy) + ')"' + anim(o, 'bzc-a', i * 0.08) + '/>';
      start += len;
    });
    s += text(cx, cy + 2, fmt(total, o, true), 'text-anchor="middle" fill="' + th.fg + '" font-family="' + SANS + '" font-size="' + r2(size * 0.17) + '" font-weight="800"');
    s += text(cx, cy + 2 + 14, (has(o.centerLabel) ? o.centerLabel : 'Total').toUpperCase(), small(th, 9, 'text-anchor="middle" letter-spacing="1"'));
    var lx = x0 + size + 22, rowH = Math.min(24, h / v.length), ly = cy - rowH * v.length / 2;
    v.forEach(function (n, i) {
      var y = ly + i * rowH + rowH / 2, pct = Math.round(n / total * 100);
      var tip = (labels[i] || '#' + (i + 1)) + ': ' + fmt(n, o) + ' (' + pct + '%)';
      s += '<circle cx="' + r2(lx + 4) + '" cy="' + r2(y) + '" r="4" fill="' + pal[i % pal.length] + '"/>' +
        text(lx + 14, y + 4, trunc(labels[i] || '#' + (i + 1), Math.floor((x0 + w - lx - 50) / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"') +
        text(x0 + w, y + 4, pct + '%', 'text-anchor="end" fill="' + th.muted + '" font-family="' + MONO + '" font-size="11" font-weight="600"') +
        hit(lx, y - rowH / 2, x0 + w - lx, rowH, tip);
    });
    start = 0;
    v.forEach(function (n, i) {
      var len = n / total * 100;
      if (len <= 0) return;
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="#000" stroke-opacity="0" stroke-width="' + r2(sw) +
        '" pathLength="100" stroke-dasharray="' + r2(len) + ' ' + r2(100 - len) + '" stroke-dashoffset="' + r2(-start) + '" transform="rotate(-90 ' + r2(cx) + ' ' + r2(cy) +
        ')" class="bzc-hit" data-tip="' + esc((labels[i] || '#' + (i + 1)) + ': ' + fmt(n, o) + ' (' + Math.round(len) + '%)') + '"/>';
      start += len;
    });
    return s;
  }, { stat: st, summary: 'total ' + fmt(total, o) + ' across ' + v.length + ' parts' });
}
