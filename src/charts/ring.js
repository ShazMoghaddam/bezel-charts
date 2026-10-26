import { esc, r2, clamp, num, has, nums, list, trunc, fmt, text, small, hit, palette, emptyState, statOf, SANS, MONO } from '../core/util.js';
import { tile } from '../core/tile.js';

export default function ring(o, th) {
  var v = nums(o.values), labels = list(o.labels), pal = palette(o, th);
  var max = num(o.max, 100) || 100, h = num(o.height, 140);
  var auto = !has(o.prefix) && !has(o.suffix) && max === 100;
  var show = function (n) { return fmt(n, o) + (auto ? '%' : ''); };
  var st = statOf(v, o, '');
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!v.length) return emptyState(th, x0, y0, w, h);
    var s = '', single = v.length === 1;
    var size = Math.min(h, single ? w : w * 0.55);
    var cx = single ? x0 + w / 2 : x0 + size / 2, cy = y0 + h / 2;
    var sw = single ? size * 0.12 : clamp(size * 0.42 / (v.length * 1.35), 5, 16), gap = sw * 0.38;
    v.forEach(function (n, i) {
      var r = size / 2 - sw / 2 - i * (sw + gap);
      if (r <= sw / 2) return;
      var pct = clamp(n / max * 100, 0, 100), c = pal[i % pal.length];
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="' + c + '" stroke-opacity=".16" stroke-width="' + r2(sw) + '"/>';
      if (pct > 0) s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="' + c + '" stroke-width="' + r2(sw) +
        '" stroke-linecap="round" pathLength="100" transform="rotate(-90 ' + r2(cx) + ' ' + r2(cy) + ')" style="stroke-dasharray:' + r2(pct) + ' 100' +
        (o.animate ? ';animation-delay:' + i * 0.12 + 's' : '') + '"' + (o.animate ? ' class="bzc-s"' : '') + '/>';
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r + sw / 2) + '" fill="#000" fill-opacity="0" class="bzc-hit" data-tip="' + esc((labels[i] || '#' + (i + 1)) + ': ' + show(n) + (auto ? '' : ' of ' + fmt(max, o))) + '"/>';
    });
    if (single) {
      s += text(cx, cy + size * 0.08, show(v[0]), 'text-anchor="middle" fill="' + th.fg + '" font-family="' + SANS + '" font-size="' + r2(size * 0.22) + '" font-weight="800"');
      if (labels[0]) s += text(cx, cy + size * 0.08 + 16, labels[0], small(th, 10, 'text-anchor="middle"'));
    } else {
      var lx = x0 + size + 22, rowH = Math.min(26, h / v.length), ly = cy - rowH * v.length / 2;
      v.forEach(function (n, i) {
        var y = ly + i * rowH + rowH / 2;
        s += '<circle cx="' + r2(lx + 4) + '" cy="' + r2(y) + '" r="4" fill="' + pal[i % pal.length] + '"/>' +
          text(lx + 14, y + 4, trunc(labels[i] || '#' + (i + 1), Math.floor((x0 + w - lx - 60) / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"') +
          text(x0 + w, y + 4, show(n), 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
      });
    }
    return s;
  }, { stat: st, summary: v.map(function (n, i) { return (labels[i] ? labels[i] + ' ' : '') + show(n); }).join(', ') });
}
