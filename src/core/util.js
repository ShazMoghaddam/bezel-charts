/** Shared helpers: parsing attribute values, number formatting, scales and small SVG builders. */
export const SANS = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

let uid = 0;
export function newId(p) { return 'bzc' + p + (++uid).toString(36) + Math.random().toString(36).slice(2, 6); }
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
export function r2(n) { return Math.round(n * 100) / 100; }
export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
export function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
export function has(v) { return v != null && v !== ''; }
export function nums(v) {
  if (Array.isArray(v)) return v.map(function (x) { var n = +x; return isFinite(n) ? n : 0; });
  if (!has(v)) return [];
  return String(v).split(/[\s,;]+/).filter(Boolean).map(function (x) { var n = +x; return isFinite(n) ? n : 0; });
}
export function list(v) {
  if (Array.isArray(v)) return v.map(String);
  if (!has(v)) return [];
  return String(v).split(',').map(function (s) { return s.trim(); });
}
export function series(v) {
  if (Array.isArray(v)) return Array.isArray(v[0]) ? v.map(nums) : [nums(v)];
  if (!has(v)) return [];
  return String(v).split('|').map(nums).filter(function (s) { return s.length; });
}
export function sum(v) { return v.reduce(function (a, b) { return a + b; }, 0); }
export function tw(s, size, mono) { return String(s).length * size * (mono ? 0.6 : 0.56); }
export function trunc(s, max) { s = String(s); return s.length > max ? s.slice(0, Math.max(1, max - 1)) + '…' : s; }
export function bool(v) { return v === true || v === '' || v === 'true' || v === '1'; }

export function fmt(n, o, short) {
  if (!isFinite(n)) return '–';
  var a = Math.abs(n), d;
  if (has(o.decimals)) d = clamp(parseInt(o.decimals, 10) || 0, 0, 6);
  else d = n % 1 === 0 ? 0 : a < 10 ? 2 : a < 100 ? 1 : 0;
  var opts = { maximumFractionDigits: d, minimumFractionDigits: has(o.decimals) ? d : 0 };
  if ((bool(o.compact) || short) && a >= 10000) { opts = { notation: 'compact', maximumFractionDigits: 1 }; }
  var s;
  try { s = new Intl.NumberFormat(o.lang || 'en-GB', opts).format(a); }
  catch (e) { s = String(r2(a)); }
  return (n < 0 ? '−' : '') + (o.prefix || '') + s + (o.suffix || '');
}

export function niceScale(min, max, count) {
  if (min === max) {
    if (min === 0) max = 1;
    else { var p = Math.abs(min) * 0.1; min -= p; max += p; }
  }
  var step0 = (max - min) / (count || 4);
  var mag = Math.pow(10, Math.floor(Math.log10(step0)));
  var err = step0 / mag;
  var step = (err <= 1 ? 1 : err <= 2 ? 2 : err <= 5 ? 5 : 10) * mag;
  var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (var t = lo; t <= hi + step / 2; t += step) ticks.push(+t.toFixed(10));
  return { lo: lo, hi: hi, ticks: ticks };
}

export function pathOf(pts, straight) {
  if (!pts.length) return '';
  var d = 'M' + r2(pts[0][0]) + ',' + r2(pts[0][1]);
  for (var i = 1; i < pts.length; i++) {
    var a = pts[i - 1], b = pts[i];
    if (straight) d += 'L' + r2(b[0]) + ',' + r2(b[1]);
    else {
      var cx = (a[0] + b[0]) / 2;
      d += 'C' + r2(cx) + ',' + r2(a[1]) + ' ' + r2(cx) + ',' + r2(b[1]) + ' ' + r2(b[0]) + ',' + r2(b[1]);
    }
  }
  return d;
}

export function text(x, y, s, attrs) {
  return '<text x="' + r2(x) + '" y="' + r2(y) + '" ' + (attrs || '') + '>' + esc(s) + '</text>';
}
export function small(th, size, extra, fill) {
  return 'fill="' + (fill || th.muted) + '" font-family="' + MONO + '" font-size="' + (size || 10) + '"' + (extra ? ' ' + extra : '');
}
export function hit(x, y, w, h, tip) {
  return '<rect class="bzc-hit" x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(Math.max(1, w)) + '" height="' + r2(Math.max(1, h)) +
    '" fill="#000" fill-opacity="0" data-tip="' + esc(tip) + '"/>';
}
export function anim(o, cls, delay) {
  if (!o.animate) return '';
  return ' class="' + cls + '"' + (delay ? ' style="animation-delay:' + r2(delay) + 's"' : '');
}
export function palette(o, th) {
  var c = list(o.color).filter(Boolean);
  return c.length ? c : th.palette;
}
export function emptyState(th, x, y, w, h) {
  return text(x + w / 2, y + h / 2 + 4, 'No data yet', 'text-anchor="middle" fill="' + th.muted + '" font-family="' + SANS + '" font-size="13"');
}
export function parseNotes(o, labels) {
  if (!has(o.notes)) return [];
  return String(o.notes).split(';').map(function (part) {
    var k = part.indexOf(':');
    if (k < 0) return null;
    var key = part.slice(0, k).trim(), t = part.slice(k + 1).trim(), i = parseInt(key, 10);
    if (String(i) !== key) i = labels.indexOf(key);
    return i >= 0 && t ? { i: i, text: t } : null;
  }).filter(Boolean);
}
export function goalLine(o, th, x1, x2, y) {
  var label = (has(o.goalLabel) ? o.goalLabel : 'Goal') + ' ' + fmt(num(o.goal, 0), o);
  return '<line x1="' + r2(x1) + '" x2="' + r2(x2) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.fg +
    '" stroke-opacity=".55" stroke-width="1.25" stroke-dasharray="4 4"/>' +
    text(x2, y - 5, label, small(th, 10, 'text-anchor="end"'));
}
export function statOf(v, o, fallback) {
  var k = String(has(o.stat) ? o.stat : fallback || '').toLowerCase();
  if (!k || k === 'none' || !v.length) return null;
  var s = sum(v);
  var map = { last: v[v.length - 1], total: s, sum: s, average: s / v.length, avg: s / v.length, max: Math.max.apply(null, v), min: Math.min.apply(null, v) };
  if (!(k in map)) return null;
  var delta = null;
  if (k === 'last' && v.length > 1 && o.delta !== 'none') delta = v[v.length - 1] - v[0];
  return { val: map[k], delta: delta };
}
