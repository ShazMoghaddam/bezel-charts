import { esc, r2, num, has, nums, list, sum, tw, fmt, ok, text, anim, palette, emptyState, ref, statOf, SANS, MONO } from '../core/util.js';
import { legend } from '../core/series.js';
import { tile, dims } from '../core/tile.js';

/**
 * Treemaps: parts of a whole as tiles sized by value, for when there are too many parts for a donut.
 * values="31,22,18,9,7" labels="Apple,Microsoft,Nvidia,JPMorgan,Visa" groups="Tech,Tech,Tech,Finance,Finance".
 * With groups, each group is a block in its own colour with its items inside, so they stay together. Without, each
 * item has its own colour. Zero, negative and missing values can't be drawn as an area, so they're left out and counted.
 */
export default function treemap(o, th) {
  var v = nums(o.values), labels = list(o.labels), groups = list(o.groups), pal = palette(o, th);
  var lay = layout(v, labels, groups), h = num(o.height, 260), st = statOf(v, o, '');
  var grouped = lay.names.length > 0, d0 = dims(o);
  var legendH = grouped ? legend(lay.names, pal, th, 0, 0, d0.w).height : 0;

  return tile(o, th, h + legendH, function (x0, y0, w, h) {
    if (!lay.items.length) return emptyState(th, x0, y0, w, h);
    var s = '', top = y0;
    if (legendH) { s += legend(lay.names, pal, th, x0, y0, w).svg; top += legendH; }
    var ph = h - (top - y0), k = 0;
    // Groups first, biggest first, then the items inside each. A group's block is inset a little, so groups have a
    // wider gap between them than items do. The order is also the order the arrow keys go in.
    squarify(lay.blocks.map(function (b) { return b.total; }), x0, top, w, ph).forEach(function (gr, g) {
      var b = lay.blocks[g], inner = grouped ? 2 : 0;
      squarify(b.items.map(function (it) { return it.v; }), gr[0] + inner, gr[1] + inner, gr[2] - inner * 2, gr[3] - inner * 2).forEach(function (r, j) {
        var it = b.items[j], base = grouped ? pal[b.g % pal.length] : pal[it.i % pal.length];
        // Within a group, smaller items step down in strength, so neighbours stay easy to tell apart.
        var op = grouped ? 1 - Math.min(j, 4) * 0.08 : 1, ink = inkOn(base, op, th);
        var x = r[0] + 1, y = r[1] + 1, tw0 = Math.max(0, r[2] - 2), th0 = Math.max(0, r[3] - 2);
        var share = shareOf(it.v, lay.total);
        var tip = (it.group ? it.group + ' · ' : '') + it.name + '\n' + fmt(it.v, o) + ' (' + share + '%)';
        s += '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(tw0) + '" height="' + r2(th0) + '" rx="' + r2(Math.min(4, tw0 / 2, th0 / 2)) +
          '" fill="' + base + '"' + (op < 1 ? ' fill-opacity="' + r2(op) + '"' : '') + anim(o, 'bzc-a', Math.min(0.6, k++ * 0.03)) +
          ' data-tip="' + esc(tip) + '"' + ref(it.i, it.v) + '/>';
        s += labelIn(it.name, fmt(it.v, o, true), share, x, y, tw0, th0, ink);
      });
    });
    return s;
  }, {
    stat: st,
    summary: lay.items.length ? 'total ' + fmt(lay.total, o) + ' across ' + lay.items.length + (lay.items.length === 1 ? ' item' : ' items') +
      (grouped ? ' in ' + lay.names.length + (lay.names.length === 1 ? ' group' : ' groups') : '') +
      ', largest ' + lay.top.name + ' (' + shareOf(lay.top.v, lay.total) + '%)' + (lay.hidden ? ', ' + lay.hidden + ' not shown' : '') : 'no data',
  });
}

/** A share as a percentage: whole numbers from 10%, one decimal place below. */
function shareOf(n, total) {
  var p = total ? n / total * 100 : 0;
  return p >= 10 ? Math.round(p) : Math.round(p * 10) / 10;
}

/**
 * The items that can be drawn (real values above zero), in blocks by group. Groups are named in the order they first
 * appear, which is the order of the legend and colours, and laid out biggest first.
 */
function layout(v, labels, groups) {
  var names = [], blocks = [], items = [], hidden = 0;
  v.forEach(function (n, i) {
    if (!ok(n) || n <= 0) { hidden++; return; }
    var group = groups.length ? String(groups[i] || '') || 'Other' : '', g = names.indexOf(group);
    if (groups.length && g < 0) { g = names.length; names.push(group); }
    var it = { i: i, v: n, name: labels[i] || '#' + (i + 1), group: group };
    items.push(it);
    var b = blocks.filter(function (x) { return x.g === Math.max(0, g); })[0];
    if (!b) blocks.push(b = { g: Math.max(0, g), items: [], total: 0 });
    b.items.push(it);
    b.total += n;
  });
  var bySize = function (a, b) { return b.v - a.v; };
  blocks.forEach(function (b) { b.items.sort(bySize); });
  blocks.sort(function (a, b) { return b.total - a.total; });
  var top = items.slice().sort(bySize)[0];
  return { names: names, blocks: blocks, items: items, total: sum(items.map(function (it) { return it.v; })), hidden: hidden, top: top };
}

/**
 * Squarified treemap (Bruls, Huizing and van Wijk): lays values, biggest first, into rows along the shorter side,
 * adding to a row while that keeps its tiles closer to square. Returns [x, y, w, h] for each value, in order.
 */
export function squarify(vals, x, y, w, h) {
  var total = sum(vals), out = [];
  if (!(total > 0) || !(w > 0) || !(h > 0)) return vals.map(function () { return [x, y, 0, 0]; });
  var scale = w * h / total, areas = vals.map(function (a) { return a * scale; }), i = 0;
  var worst = function (first, last, s, side) { return Math.max(side * side * first / (s * s), s * s / (side * side * last)); };
  while (i < areas.length) {
    var side = Math.min(w, h), s = areas[i], j = i + 1, now = worst(areas[i], areas[i], s, side);
    while (j < areas.length) {
      var next = worst(areas[i], areas[j], s + areas[j], side);
      if (next > now) break;
      s += areas[j]; now = next; j++;
    }
    if (w >= h) {
      var cw = s / h, yy = y;
      for (var a = i; a < j; a++) { out.push([x, yy, cw, areas[a] / cw]); yy += areas[a] / cw; }
      x += cw; w -= cw;
    } else {
      var rh = s / w, xx = x;
      for (var b = i; b < j; b++) { out.push([xx, y, areas[b] / rh, rh]); xx += areas[b] / rh; }
      y += rh; h -= rh;
    }
    i = j;
  }
  return out;
}

/**
 * White or near-black text, whichever stands out more against a tile's colour as it shows on the tile behind it.
 * A colour that isn't a hex code gets the theme's own text colour.
 */
function inkOn(c, op, th) {
  var a = rgb(c), b = rgb(th.tile);
  if (!a || !b) return th.fg;
  var mix = a.map(function (x, k) { return x * op + b[k] * (1 - op); });
  var L = 0.2126 * lin(mix[0]) + 0.7152 * lin(mix[1]) + 0.0722 * lin(mix[2]);
  // Contrast with white is 1.05 / (L + 0.05), with near-black (L 0.008) it's (L + 0.05) / 0.058.
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.058 ? '#ffffff' : '#14131a';
}
function rgb(c) {
  var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).trim());
  if (!m) return null;
  var hx = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  return [0, 2, 4].map(function (k) { return parseInt(hx.slice(k, k + 2), 16) / 255; });
}
function lin(x) { return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }

/**
 * A tile's name and its value and share, top left, when they fit. The name is shortened to fit; the second line is
 * the value and share, or just the share, or left out.
 */
function labelIn(name, value, share, x, y, w, h, ink) {
  if (w < 36 || h < 20) return '';
  // Names are semi-bold, about a tenth wider than the plain text tw() measures, so they're measured at 13.2px.
  var room = w - 12, nm = String(name);
  while (nm.length > 1 && tw(nm, 13.2) > room) nm = nm.slice(0, -2) + '…';
  if (tw(nm, 13.2) > room) return '';
  var s = text(x + 6, y + 15, nm, 'fill="' + ink + '" font-family="' + SANS + '" font-size="12" font-weight="600"');
  if (h >= 36) {
    var both = value + ' · ' + share + '%', one = share + '%';
    var line = tw(both, 11, true) <= room ? both : tw(one, 11, true) <= room ? one : '';
    if (line) s += text(x + 6, y + 30, line, 'fill="' + ink + '" fill-opacity=".85" font-family="' + MONO + '" font-size="11"');
  }
  return s;
}

treemap.table = function (o) {
  var v = nums(o.values), labels = list(o.labels), groups = list(o.groups), shown = v.filter(function (n) { return ok(n) && n > 0; });
  var total = sum(shown), g = groups.length > 0;
  return {
    head: ['Item'].concat(g ? ['Group'] : [], ['Value', 'Share']),
    rows: v.map(function (n, i) {
      return [labels[i] || '#' + (i + 1)].concat(g ? [String(groups[i] || '') || 'Other'] : [],
        [fmt(n, o), ok(n) && n > 0 ? shareOf(n, total) + '%' : 'not shown']);
    }),
  };
};
