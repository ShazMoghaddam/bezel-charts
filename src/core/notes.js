/**
 * Notes on charts with an x-axis: a dashed marker at one point ("Jun:Launch") or a shaded span across several
 * ("2022..2023:Rate rises"), each with a short label along the top. Labels that would overlap move down a row, up to
 * three rows. Loaded by line, area, spark, bars, combo and waterfall charts.
 */
import { r2, clamp, tw, text, small } from './util.js';

var ROW = 12, ROWS = 3;

/**
 * Where each note goes. at(i) gives point i's centre (c) and the left and right edges it covers (l, r): the same for a
 * point on a line, or a column's edges for bars. Returns the notes with their x positions and rows, and how many rows
 * they use. Notes past the end are left out, and a span past the end stops at the last point.
 */
export function noteLayout(notes, n, at, px, pw) {
  var items = [], rows = 0;
  notes.forEach(function (nt) {
    if (nt.i >= n) return;
    var a = at(nt.i), span = nt.j != null && nt.j !== nt.i, l = a.l, r = a.r;
    if (span) { var b = at(Math.min(nt.j, n - 1)); l = Math.min(a.l, b.l); r = Math.max(a.r, b.r); }
    var half = tw(nt.text, 10, true) / 2, room = Math.max(30, half);
    var x = clamp(span ? (l + r) / 2 : a.c, px + room, px + pw - room), row = 0;
    var clash = function (p) { return p.row === row && x - half < p.x + p.half + 6 && p.x - p.half < x + half + 6; };
    while (row < ROWS - 1 && items.some(clash)) row++;
    rows = Math.max(rows, row + 1);
    items.push({ x: x, half: half, row: row, text: nt.text, span: span, c: a.c, l: l, r: r });
  });
  return { items: items, rows: rows, height: rows ? rows * ROW : 0 };
}

/**
 * Draws the notes laid out by noteLayout, with labels from top and markers and spans down to bottom. Spans go first,
 * so no shading covers a label. Each span has a faint edge, so it still shows in greyscale and print.
 */
export function noteMarks(th, lay, top, bottom) {
  var s = '';
  lay.items.forEach(function (p) {
    if (p.span) {
      s += '<rect x="' + r2(p.l) + '" y="' + r2(top) + '" width="' + r2(Math.max(1, p.r - p.l)) + '" height="' + r2(bottom - top) + '" fill="' + th.fg + '" fill-opacity=".07"/>' +
        '<path d="M' + r2(p.l) + ',' + r2(top + 12 + p.row * ROW) + 'V' + r2(bottom) + 'M' + r2(p.r) + ',' + r2(top + 12 + p.row * ROW) + 'V' + r2(bottom) + '" stroke="' + th.fg + '" stroke-opacity=".18"/>';
    }
  });
  lay.items.forEach(function (p) {
    var y = top + 8 + p.row * ROW;
    if (!p.span) s += '<line x1="' + r2(p.c) + '" x2="' + r2(p.c) + '" y1="' + r2(y + 4) + '" y2="' + r2(bottom) + '" stroke="' + th.fg + '" stroke-opacity=".4" stroke-dasharray="3 3"/>';
    s += text(p.x, y, p.text, small(th, 10, 'text-anchor="middle"', th.fg));
  });
  return s;
}
