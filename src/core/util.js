/** Shared helpers: parsing attribute values, number formatting, scales and small SVG builders. */
export const SANS = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

/*
 * Gradient, pattern and clip path ids. While a chart draws, newId() hands out placeholders; once the SVG is finished,
 * stableIds() swaps them for ids worked out from the SVG itself, so the same chart always gives the same bytes and
 * different charts on one page don't clash. An `id` option names them instead: id="sales" gives sales-g1, sales-c1.
 */
var seq = 0, MARK = '\u0001';
export function newId(p) { return MARK + 'bzc' + p + (++seq) + MARK; }
/** FNV-1a over UTF-16 code units, as 7 base-36 digits. Python works it out the same way. */
export function hash(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return ('0000000' + h.toString(36)).slice(-7);
}
export function resetIds() { seq = 0; }
export function stableIds(svg, id) {
  if (svg.indexOf(MARK + 'bzc') < 0) return svg;
  var pre;
  if (has(id)) {
    pre = String(id).trim().replace(/[^\w-]/g, '-');
    if (!/^[A-Za-z_]/.test(pre)) pre = 'bzc-' + pre;
    pre += '-';
  }
  var h = pre ? '' : hash(svg);
  return svg.replace(/\u0001bzc([a-z])(\d+)\u0001/g, function (_, p, n) { return pre ? pre + p + n : 'bzc' + p + h + n; });
}
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
export function r2(n) { return Math.round(n * 100) / 100; }
export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
export function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
export function has(v) { return v != null && v !== ''; }
/**
 * Numbers from a list or a string. A missing value stays missing as NaN, and is never drawn as 0: in a string that's a
 * blank slot (4,,6), null, NaN, a dash or anything else that isn't a number; in an array it's also null and undefined.
 * Blanks at the very end are ignored, so a trailing comma doesn't add a gap.
 */
export function nums(v) {
  if (Array.isArray(v)) return v.map(numOf);
  if (!has(v)) return [];
  var t = String(v).trim().split(/\s*[,;]\s*|\s+/);
  while (t.length && t[t.length - 1] === '') t.pop();
  return t.map(numOf);
}
function numOf(x) { return x == null || x === '' ? NaN : +x; }
/** Whether a value is a real number, not a gap. */
export function ok(v) { return typeof v === 'number' && isFinite(v); }
/** The real numbers in a list, gaps left out. */
export function real(v) { return v.filter(ok); }
/** A number for a tooltip or label: "No data" for a gap. */
export function fmtv(n, o) { return ok(n) ? fmt(n, o) : 'No data'; }
/**
 * Which lines get the soft fill underneath: "first" (the default), "all", or "none" (also false, "false" and "off").
 * A bare fill attribute means the default.
 */
export function fillOf(o) {
  var f = o.fill;
  if (f === false || f === 'false' || f === 'none' || f === 'off') return 'none';
  return f === 'all' ? 'all' : 'first';
}
/** A short dash on the zero line where a bar is missing, so its empty slot doesn't read as 0. */
export function gapMark(x, w, y, th) {
  return '<line x1="' + r2(x + w * 0.3) + '" x2="' + r2(x + w * 0.7) + '" y1="' + r2(y - 3) + '" y2="' + r2(y - 3) + '" stroke="' + th.muted + '" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 3"/>';
}
/** For summaries: ", 2 missing" when a list has gaps, otherwise nothing. */
export function gapNote(v) { var m = v.length - real(v).length; return m ? ', ' + m + ' missing' : ''; }
/**
 * Splits [x, y] points into runs wherever a point can't be placed, so a line breaks at a gap (or, on a log scale, at
 * zero and below) instead of joining across it.
 */
export function runsOf(P) {
  return P.reduce(function (r, p) {
    if (isFinite(p[1])) r[r.length - 1].push(p); else if (r[r.length - 1].length) r.push([]);
    return r;
  }, [[]]).filter(function (r) { return r.length; });
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
  var s, nf;
  try { nf = new Intl.NumberFormat(o.lang || 'en-GB', opts); s = nf.format(a); }
  catch (e) { s = String(r2(a)); }
  // British English shortens to 2.2m, 3.4bn and 5tn, and "m" reads like metres. Millions and up get capitals: 2.2M, 3.4B, 5T.
  if (opts.notation && nf && /^en-GB\b/.test(nf.resolvedOptions().locale)) {
    s = s.replace(/(\d)(m|bn|tn)$/, function (_, d, u) { return d + { m: 'M', bn: 'B', tn: 'T' }[u]; });
  }
  return (n < 0 ? '−' : '') + (o.prefix || '') + s + (o.suffix || '');
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
/**
 * Which item a hover area stands for, so a click can say: its position (data-i), its series when it has just one
 * (data-s) and its numbers (data-v, one per series, blank where a series is shorter or a value is missing).
 */
export function ref(i, v, s) {
  return ' data-i="' + i + '"' + (s == null ? '' : ' data-s="' + s + '"') + ' data-v="' + [].concat(v).map(function (x) { return typeof x === 'number' && !isFinite(x) ? '' : x; }).join(',') + '"';
}
/** Each series' value at position i, kept in series order. */
export function at(S, i) {
  return S.map(function (s) { return i < s.length ? s[i] : ''; });
}
export function hit(x, y, w, h, tip, i, v, s) {
  return '<rect class="bzc-hit" x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(Math.max(1, w)) + '" height="' + r2(Math.max(1, h)) +
    '" fill="#000" fill-opacity="0" data-tip="' + esc(tip) + '"' + (i == null ? '' : ref(i, v, s)) + '/>';
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
/**
 * Notes as { i, text } for a point, or { i, j, text } for a span from point i to point j: "Jun:Launch;2022..2023:Rate
 * rises". A point is a label or, if no label matches, a position counting from 0.
 */
export function parseNotes(o, labels) {
  if (!has(o.notes)) return [];
  var names = labels.map(String);
  // A label wins, so a note on "1976" finds the year. Otherwise a whole number is a position.
  var find = function (key) {
    var i = names.indexOf(key);
    return i < 0 && String(parseInt(key, 10)) === key ? parseInt(key, 10) : i;
  };
  return String(o.notes).split(';').map(function (part) {
    var k = part.indexOf(':');
    if (k < 0) return null;
    var key = part.slice(0, k).trim(), t = part.slice(k + 1).trim(), i = find(key), dots = key.indexOf('..');
    if (!t) return null;
    // A span, unless the whole key is a label that happens to contain "..".
    if (i < 0 && dots > 0) {
      var a = find(key.slice(0, dots).trim()), b = find(key.slice(dots + 2).trim());
      return a >= 0 && b >= 0 ? { i: Math.min(a, b), j: Math.max(a, b), text: t } : null;
    }
    return i >= 0 ? { i: i, text: t } : null;
  }).filter(Boolean);
}
/**
 * The dashed goal line and its label, above the line at its right end. A chart that knows where its label would
 * clash can say where it goes instead: `at` is [x, y, text-anchor, extra attributes].
 */
export function goalLine(o, th, x1, x2, y, at) {
  at = at || [x2, y - 5, 'end', ''];
  return '<line x1="' + r2(x1) + '" x2="' + r2(x2) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.fg +
    '" stroke-opacity=".55" stroke-width="1.25" stroke-dasharray="4 4"/>' +
    text(at[0], at[1], goalText(o), small(th, 10, 'text-anchor="' + at[2] + '"' + at[3]));
}
export function goalText(o) { return (has(o.goalLabel) ? o.goalLabel : 'Goal') + ' ' + fmt(num(o.goal, 0), o); }
/** The headline number. Gaps are left out, so "last" is the last real value and its change runs from the first. */
export function statOf(v, o, fallback) {
  var k = String(has(o.stat) ? o.stat : fallback || '').toLowerCase();
  v = real(v);
  if (!k || k === 'none' || !v.length) return null;
  var s = sum(v);
  var map = { last: v[v.length - 1], total: s, sum: s, average: s / v.length, avg: s / v.length, max: Math.max.apply(null, v), min: Math.min.apply(null, v) };
  if (!(k in map)) return null;
  var delta = null;
  if (k === 'last' && v.length > 1 && o.delta !== 'none') delta = v[v.length - 1] - v[0];
  return { val: map[k], delta: delta };
}
