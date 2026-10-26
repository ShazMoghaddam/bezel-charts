import { newId, r2, clamp, num, has, nums, list, sum, tw, fmt, text, small, hit, anim, palette, emptyState, statOf, SANS, MONO } from '../core/util.js';
import { tile, dims } from '../core/tile.js';

export default function progress(o, th) {
  var v = nums(o.values).map(function (n) { return Math.max(0, n); }), labels = list(o.labels), pal = palette(o, th);
  var single = v.length === 1, total = sum(v);
  var max = has(o.max) ? num(o.max, 100) : single ? 100 : total;
  if (!(max > 0)) max = 1;
  var auto = !has(o.prefix) && !has(o.suffix) && max === 100 && single;
  var show = function (n) { return fmt(n, o) + (auto ? '%' : ''); };
  var d0 = dims(o), w0 = d0.w, rows = 0, layout = [];
  if (!single && v.length) {
    var x = 0; rows = 1;
    v.forEach(function (n, i) {
      var l = labels[i] || '#' + (i + 1), wd = 14 + tw(l, 11.4) + 7 + tw(fmt(n, o), 11, true) + 18;
      if (x > 0 && x + wd > w0) { x = 0; rows++; }
      layout.push({ x: x, row: rows - 1, l: l }); x += wd;
    });
  }
  var h = 22 + 14 + (rows ? 12 + rows * 20 : 0);
  var st = statOf(v, o, '');
  return tile(o, th, h, function (x0, y0, w, h) {
    if (!v.length) return emptyState(th, x0, y0, w, h);
    var s = '', by = y0 + 22, cid = newId('c');
    var head = single ? show(v[0]) + (auto ? '' : ' of ' + fmt(max, o)) : fmt(total, o) + ' of ' + fmt(max, o);
    if (single && labels[0]) s += text(x0, y0 + 11, labels[0], 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
    s += text(x0 + w, y0 + 11, head, 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
    s += '<rect x="' + x0 + '" y="' + by + '" width="' + w + '" height="14" rx="7" fill="' + th.grid + '" fill-opacity=".7"/>';
    s += '<clipPath id="' + cid + '"><rect x="' + x0 + '" y="' + by + '" width="' + w + '" height="14" rx="7"/></clipPath><g clip-path="url(#' + cid + ')"><g' + anim(o, 'bzc-gx') + '>';
    var acc = 0;
    v.forEach(function (n, i) {
      var len = Math.min(n, Math.max(0, max - acc)) / max * w;
      if (len > 0) s += '<rect x="' + r2(x0 + acc / max * w) + '" y="' + by + '" width="' + r2(len) + '" height="14" fill="' + pal[i % pal.length] + '"/>';
      if (i > 0 && len > 0) s += '<rect x="' + r2(x0 + acc / max * w - 1) + '" y="' + by + '" width="2" height="14" fill="' + (o.background || th.tile) + '"/>';
      acc += n;
    });
    s += '</g></g>';
    if (has(o.goal)) {
      var gx = x0 + clamp(+o.goal / max, 0, 1) * w;
      s += '<line x1="' + r2(gx) + '" x2="' + r2(gx) + '" y1="' + (by - 4) + '" y2="' + (by + 18) + '" stroke="' + th.fg + '" stroke-width="2" stroke-linecap="round"/>';
    }
    acc = 0;
    v.forEach(function (n, i) {
      var len = Math.min(n, Math.max(0, max - acc)) / max * w;
      if (len > 0) s += hit(x0 + acc / max * w, by - 4, len, 22, (labels[i] || (single ? 'Progress' : '#' + (i + 1))) + ': ' + show(n) + (single ? '' : ' (' + Math.round(n / max * 100) + '%)'));
      acc += n;
    });
    layout.forEach(function (it, i) {
      var lx = x0 + it.x, ly = by + 14 + 12 + it.row * 20 + 8;
      s += '<circle cx="' + r2(lx + 4) + '" cy="' + r2(ly) + '" r="4" fill="' + pal[i % pal.length] + '"/>' +
        text(lx + 14, ly + 4, it.l, 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"') +
        text(lx + 14 + tw(it.l, 11.4) + 7, ly + 4, fmt(v[i], o), small(th, 11));
    });
    return s;
  }, { stat: st, summary: single ? show(v[0]) + (auto ? '' : ' of ' + fmt(max, o)) : fmt(total, o) + ' of ' + fmt(max, o) });
}
