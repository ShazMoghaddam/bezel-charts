/** Series lines, their markers and legend samples, shared by line, area and combo charts. */
import { r2, anim } from './util.js';
import { marker, DASHES } from './series.js';

/** A legend swatch for a line: a short sample with its dash and marker. */
export function lineKey(pal, dashOf, markOf, bg) {
  return function (k, x, y) {
    var c = pal[k % pal.length], dk = dashOf ? DASHES[dashOf(k)] : '', mk = markOf ? markOf(k) : 'none';
    return '<line x1="' + r2(x) + '" x2="' + r2(x + 18) + '" y1="' + r2(y + 6) + '" y2="' + r2(y + 6) + '" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round"' +
      (dk ? ' stroke-dasharray="' + dk + '"' : '') + '/>' + (mk !== 'none' ? marker(mk, x + 9, y + 6, 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"') : '');
  };
}

/** A series line along path d. The draw-in animation is itself a dash, so dashed lines fade in instead. */
export function seriesLine(o, d, c, k, dk) {
  return dk
    ? '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + dk + '"' + anim(o, 'bzc-a', k * 0.15) + '/>'
    : '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1' + (o.animate ? ';animation-delay:' + k * 0.15 + 's' : '') + '"' + (o.animate ? ' class="bzc-d"' : '') + '/>';
}

/** Markers on a series' points. Long series get one on every few points, and always on the last. */
export function pointMarks(o, mk, ys, X, Y, c, bg, k) {
  var s = '', every = Math.ceil(ys.length / 40);
  ys.forEach(function (y, i) {
    // On a log scale, zero and negative values have no position, so they get no marker.
    if (!isFinite(Y(y))) return;
    if (i % every === 0 || i === ys.length - 1) s += marker(mk, X(i), Y(y), 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"' + anim(o, 'bzc-a', 0.6 + k * 0.15));
  });
  return s;
}
