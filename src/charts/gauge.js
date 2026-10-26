import { r2, clamp, num, has, nums, list, fmt, text, small, hit, anim, palette, emptyState, SANS } from '../core/util.js';
import { tile } from '../core/tile.js';

export default function gauge(o, th) {
  var v = nums(o.values), val = v.length ? v[0] : num(o.value, NaN), labels = list(o.labels);
  var mn = num(o.min, 0), mx = num(o.max, 100), h = num(o.height, 130);
  if (mx === mn) mx = mn + 1;
  var zones = nums(o.zones), pal = palette(o, th);
  var zc = list(o.color).filter(Boolean).length > 1 ? pal : [th.up, th.palette[3], th.down];
  var colour = pal[0];
  if (zones.length && isFinite(val)) {
    var z = 0; while (z < zones.length && val >= zones[z]) z++;
    colour = zc[Math.min(z, zc.length - 1)];
  }
  var auto = !has(o.prefix) && !has(o.suffix) && mn === 0 && mx === 100;
  var show = function (n) { return fmt(n, o) + (auto ? '%' : ''); };
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!isFinite(val)) return emptyState(th, x0, y0, w, h);
    var R = Math.min(w / 2, h - 22), sw = R * 0.16, r = R - sw / 2, cx = x0 + w / 2, cy = y0 + R;
    var t = clamp((val - mn) / (mx - mn), 0, 1);
    var pt = function (f, rr) { var a = Math.PI * (1 - f); return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]; };
    var arc = 'M' + r2(cx - r) + ',' + r2(cy) + 'A' + r2(r) + ',' + r2(r) + ' 0 0 1 ' + r2(cx + r) + ',' + r2(cy);
    var s = '<path d="' + arc + '" fill="none" stroke="' + colour + '" stroke-opacity=".16" stroke-width="' + r2(sw) + '" stroke-linecap="round"/>';
    if (zones.length) zones.forEach(function (zv) {
      var f = clamp((zv - mn) / (mx - mn), 0, 1), a = pt(f, r - sw / 2 - 3), b = pt(f, r - sw / 2 - 8);
      s += '<line x1="' + r2(a[0]) + '" y1="' + r2(a[1]) + '" x2="' + r2(b[0]) + '" y2="' + r2(b[1]) + '" stroke="' + th.muted + '" stroke-width="1.5"/>';
    });
    if (t > 0) s += '<path d="' + arc + '" fill="none" stroke="' + colour + '" stroke-width="' + r2(sw) + '" stroke-linecap="round" pathLength="100" style="stroke-dasharray:' + r2(t * 100) + ' 100"' + anim(o, 'bzc-s') + '/>';
    var e = pt(t, r);
    s += '<circle cx="' + r2(e[0]) + '" cy="' + r2(e[1]) + '" r="' + r2(sw * 0.26) + '" fill="' + (o.background || th.tile) + '"' + anim(o, 'bzc-a', 0.9) + '/>';
    if (has(o.goal)) {
      var gf = clamp((+o.goal - mn) / (mx - mn), 0, 1), g1 = pt(gf, r + sw / 2 + 4), g2 = pt(gf, r - sw / 2 - 4);
      s += '<line x1="' + r2(g1[0]) + '" y1="' + r2(g1[1]) + '" x2="' + r2(g2[0]) + '" y2="' + r2(g2[1]) + '" stroke="' + th.fg + '" stroke-width="2" stroke-linecap="round"/>';
    }
    s += text(cx, cy - R * 0.12, show(val), 'text-anchor="middle" fill="' + th.fg + '" font-family="' + SANS + '" font-size="' + r2(R * 0.34) + '" font-weight="800"');
    if (labels[0]) s += text(cx, cy - R * 0.12 + 16, labels[0], small(th, 10, 'text-anchor="middle"'));
    s += text(cx - r, cy + 18, fmt(mn, o, true), small(th, 10, 'text-anchor="middle"')) + text(cx + r, cy + 18, fmt(mx, o, true), small(th, 10, 'text-anchor="middle"'));
    s += hit(cx - R, cy - R, R * 2, R, (labels[0] ? labels[0] + ': ' : '') + show(val) + ' (range ' + fmt(mn, o) + ' to ' + fmt(mx, o) + ')' + (has(o.goal) ? '\nGoal: ' + fmt(+o.goal, o) : ''));
    return s;
  }, { summary: isFinite(val) ? show(val) + ' on a scale of ' + fmt(mn, o) + ' to ' + fmt(mx, o) : 'no data' });
}
