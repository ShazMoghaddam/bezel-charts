import { esc, r2, num, has, nums, list, sum, trunc, fmt, text, small, hit, anim, palette, emptyState, statOf, SANS, MONO, ref } from '../core/util.js';
import { tile } from '../core/tile.js';

/**
 * The total and the centre label, kept inside the hole. The total shrinks if it's too wide. The label shrinks to 7px,
 * then wraps onto two lines, then is shortened with "…".
 */
function centre(o, th, cx, cy, size, sw, total) {
  var ri = size / 2 - sw, big = fmt(total, o, true), fs = size * 0.17;
  // How wide the hole is at a distance from its centre, less a little padding.
  var chord = function (dy) { return 2 * Math.sqrt(Math.max(0, ri * ri - dy * dy)) - 8; };
  // Monospace at 0.6 of the size, plus 1px letter spacing; and the largest size, in half pixels, that fits a width.
  var wide = function (t, f) { return t.length * (f * 0.6 + 1); };
  var fit = function (t, room) { return Math.floor((room / t.length - 1) / 0.6 * 2) / 2; };
  var lab = (has(o.centerLabel) ? String(o.centerLabel) : 'Total').toUpperCase(), lines = [lab], ls = 9, ty = cy + 2, ly = [cy + 16];
  if (wide(lab, 9) > chord(16)) {
    ls = Math.max(7, fit(lab, chord(16)));
    var words = lab.split(' ').filter(Boolean);
    if (ls === 7 && words.length > 1 && wide(lab, 7) > chord(16)) {
      // Two lines, split where the larger one needs the least shrinking, and the whole centre moves up to stay balanced.
      var best = -1;
      for (var k = 1; k < words.length; k++) {
        var a = words.slice(0, k).join(' '), b = words.slice(k).join(' '), f = Math.min(9, fit(a, chord(10)), fit(b, chord(19)));
        if (f > best) { best = f; lines = [a, b]; }
      }
      if (best < 7) {
        // Still too long at 7px: fill the first line with whole words, and only the second is shortened.
        for (k = words.length - 1; k > 1 && wide(words.slice(0, k).join(' '), 7) > chord(10); k--);
        lines = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
      }
      ls = Math.max(7, best); ty = cy - 3; ly = [cy + 10, cy + 19];
    }
    lines = lines.map(function (t, i) {
      return wide(t, ls) > chord(ly[i] - cy) ? trunc(t, Math.max(1, Math.floor(chord(ly[i] - cy) / (ls * 0.6 + 1)))) : t;
    });
  }
  var room = chord(fs * 0.7 + cy - ty);
  if (big.length * fs * 0.62 > room) fs = Math.max(8, room / (big.length * 0.62));
  return text(cx, ty, big, 'text-anchor="middle" fill="' + th.fg + '" font-family="' + SANS + '" font-size="' + r2(fs) + '" font-weight="800"') +
    lines.map(function (t, i) { return text(cx, ly[i], t, small(th, ls, 'text-anchor="middle" letter-spacing="1"')); }).join('');
}

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
    s += centre(o, th, cx, cy, size, sw, total);
    var lx = x0 + size + 22, rowH = Math.min(24, h / v.length), ly = cy - rowH * v.length / 2;
    v.forEach(function (n, i) {
      var y = ly + i * rowH + rowH / 2, pct = Math.round(n / total * 100);
      var tip = (labels[i] || '#' + (i + 1)) + ': ' + fmt(n, o) + ' (' + pct + '%)';
      s += '<circle cx="' + r2(lx + 4) + '" cy="' + r2(y) + '" r="4" fill="' + pal[i % pal.length] + '"/>' +
        text(lx + 14, y + 4, trunc(labels[i] || '#' + (i + 1), Math.floor((x0 + w - lx - 50) / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"') +
        text(x0 + w, y + 4, pct + '%', 'text-anchor="end" fill="' + th.muted + '" font-family="' + MONO + '" font-size="11" font-weight="600"') +
        hit(lx, y - rowH / 2, x0 + w - lx, rowH, tip, i, n);
    });
    start = 0;
    v.forEach(function (n, i) {
      var len = n / total * 100;
      if (len <= 0) return;
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="#000" stroke-opacity="0" stroke-width="' + r2(sw) +
        '" pathLength="100" stroke-dasharray="' + r2(len) + ' ' + r2(100 - len) + '" stroke-dashoffset="' + r2(-start) + '" transform="rotate(-90 ' + r2(cx) + ' ' + r2(cy) +
        ')" class="bzc-hit" data-skip="" data-tip="' + esc((labels[i] || '#' + (i + 1)) + ': ' + fmt(n, o) + ' (' + Math.round(len) + '%)') + '"' + ref(i, n) + '/>';
      start += len;
    });
    return s;
  }, { stat: st, summary: 'total ' + fmt(total, o) + ' across ' + v.length + ' parts' });
}

// Every part is listed, including the small ones the chart groups as "Other".
donut.table = function (o) {
  var v = nums(o.values).map(function (n) { return Math.max(0, n); }), labels = list(o.labels), total = sum(v);
  return { head: ['Label', 'Value', 'Share'], rows: v.map(function (n, i) {
    return [labels[i] || '#' + (i + 1), fmt(n, o), (total ? Math.round(n / total * 100) : 0) + '%'];
  }) };
};
