import { esc, r2, has, nums, sum, fmt, text, small, palette, emptyState, statOf } from '../core/util.js';
import { tile, dims } from '../core/tile.js';

export default function heatmap(o, th) {
  var v = nums(o.values), c = palette(o, th)[0], lang = o.lang || 'en-GB';
  var start;
  if (has(o.start) && /^\d{4}-\d{2}-\d{2}$/.test(String(o.start))) start = new Date(String(o.start) + 'T00:00:00Z');
  else { var t = new Date(); start = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Math.max(0, v.length - 1) * 864e5); }
  var offset = (start.getUTCDay() + 6) % 7, cols = Math.max(1, Math.ceil((offset + v.length) / 7));
  var d0 = dims(o), leftW = 28, pitch = Math.min(18, (d0.w - leftW) / cols), gap = pitch < 8 ? 1 : 3, cell = pitch - gap;
  var h = 16 + 7 * pitch + 26;
  var max = v.length ? Math.max.apply(null, v) : 0;
  var dfm = function (opt) { try { return new Intl.DateTimeFormat(lang, Object.assign({ timeZone: 'UTC' }, opt)); } catch (e) { return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'UTC' }, opt)); } };
  var monthF = dfm({ month: 'short' }), dayF = dfm({ weekday: 'short' }), fullF = dfm({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  var st = statOf(v, o, '');
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!v.length) return emptyState(th, x0, y0, w, h);
    var s = '', gx = x0 + leftW, gy = y0 + 16, lastMonthX = -99, op = [0.28, 0.5, 0.75, 1];
    if (pitch >= 9) [0, 2, 4].forEach(function (r) {
      var d = new Date(Date.UTC(2024, 0, 1 + r));
      s += text(x0, gy + r * pitch + cell / 2 + 3.5, dayF.format(d), small(th, 9));
    });
    for (var i = 0; i < v.length; i++) {
      var k = offset + i, col = Math.floor(k / 7), row = k % 7;
      var day = new Date(start.getTime() + i * 864e5), x = gx + col * pitch, y = gy + row * pitch;
      if ((day.getUTCDate() === 1 || i === 0) && x - lastMonthX > 30) {
        s += text(x, y0 + 9, monthF.format(day), small(th, 9));
        lastMonthX = x;
      }
      var lvl = v[i] <= 0 || !max ? 0 : Math.ceil(v[i] / max * 4);
      var fill = lvl ? c : th.grid, fo = lvl ? op[lvl - 1] : 0.7;
      s += '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(cell) + '" height="' + r2(cell) + '" rx="' + r2(cell * 0.24) + '" fill="' + fill + '" fill-opacity="' + fo + '"' +
        (o.animate ? ' class="bzc-a" style="animation-delay:' + r2(col * 0.012) + 's"' : '') + ' data-tip="' + esc(fullF.format(day) + ': ' + fmt(v[i], o)) + '"/>';
    }
    var ly = gy + 7 * pitch + 14, lc = 10, lx = x0 + w - 5 * (lc + 3) - 30;
    s += text(x0, ly + 8, fmt(sum(v), o, true) + ' in ' + v.length + ' days', small(th, 10));
    s += text(lx - 6, ly + 8, 'Less', small(th, 9, 'text-anchor="end"'));
    for (var j = 0; j < 5; j++) {
      s += '<rect x="' + r2(lx + j * (lc + 3)) + '" y="' + ly + '" width="' + lc + '" height="' + lc + '" rx="2.5" fill="' + (j ? c : th.grid) + '" fill-opacity="' + (j ? op[j - 1] : 0.7) + '"/>';
    }
    s += text(lx + 5 * (lc + 3) + 3, ly + 8, 'More', small(th, 9));
    return s;
  }, { stat: st, summary: fmt(sum(v), o) + ' across ' + v.length + ' days' });
}
