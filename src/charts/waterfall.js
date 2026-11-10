import { r2, has, list, nums, tw, fmt, text, small, hit, anim, emptyState, goalLine, num } from '../core/util.js';
import { niceScale, legend } from '../core/series.js';
import { tile, dims } from '../core/tile.js';

/**
 * A waterfall: how a starting value rises and falls, step by step, to where it ends up.
 * values are the changes; totals names the bars that show the running total instead, by label or position.
 * A total adds its own value first, so give the opening amount for a start and 0 for a subtotal:
 * values="120,30,-12,-25,0" labels="Start,Sales,Costs,Tax,Profit" totals="Start,Profit".
 * Rises, falls and totals take the theme's up, down and first colours; color="rise,fall,total" changes them.
 */
export default function waterfall(o, th) {
  var v = nums(o.values), n = v.length, labels = list(o.labels), names = list(o.series), c = list(o.color);
  var steps = walk(v, labels, o.totals);
  var cols = { up: c[0] || th.up, down: c[1] || th.down, total: c[2] || th.palette[0] };
  var kinds = ['up', 'down', 'total'].filter(function (k) { return steps.some(function (st) { return st.kind === k; }); });
  var keyNames = kinds.map(function (k) { return names[['up', 'down', 'total'].indexOf(k)] || { up: 'Rise', down: 'Fall', total: 'Total' }[k]; });
  var keyPal = kinds.map(function (k) { return cols[k]; });
  var key = function (j, x, y) { return '<rect x="' + r2(x) + '" y="' + r2(y + 1) + '" width="10" height="10" rx="2" fill="' + keyPal[j] + '"/>'; };
  var legendH = n ? legend(keyNames, keyPal, th, 0, 0, dims(o).w, key, 15).height : 0;
  var h = num(o.height, 200) + legendH;
  var end = n ? steps[n - 1].to : 0;

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!n) return emptyState(th, x0, y0, w, h);
    var s = legend(keyNames, keyPal, th, x0, y0, w, key, 15).svg, top0 = y0 + legendH;
    var levels = [0];
    steps.forEach(function (st) { levels.push(st.from, st.to); });
    var lo = Math.min.apply(null, levels), hi = Math.max.apply(null, levels);
    if (has(o.goal)) { lo = Math.min(lo, +o.goal); hi = Math.max(hi, +o.goal); }
    var sc = niceScale(lo, hi, 4), tl = sc.ticks.map(function (t) { return fmt(t, o, true); });
    var axisW = Math.max.apply(null, tl.map(function (t) { return tw(t, 10, true); })) + 10;
    var px = x0 + axisW, pw = w - axisW, slot = pw / n, bwid = Math.min(slot * 0.62, 56);
    // Signed labels on every bar, so rises and falls read without colour. They only show when they all fit.
    var tags = steps.map(function (st) { return st.kind === 'total' ? fmt(st.to, o, true) : (st.change > 0 ? '+' : '') + fmt(st.change, o, true); });
    var showTags = Math.max.apply(null, tags.map(function (t) { return tw(t, 10, true); })) <= slot - 2;
    var labMax = labels.length ? Math.max.apply(null, labels.map(function (l) { return tw(l, 10, true); })) : 0;
    var every = labels.length ? Math.max(1, Math.ceil(n * (labMax + 8) / pw)) : 1;
    var negTag = showTags && sc.lo < 0 ? 14 : 0, topPad = showTags ? 16 : 4;
    var py = top0 + topPad, ph = h - (top0 - y0) - topPad - (labels.length ? 20 : 2) - negTag;
    var Y = function (x) { return py + ph - (x - sc.lo) / (sc.hi - sc.lo) * ph; };

    sc.ticks.forEach(function (t, i) {
      s += '<line x1="' + r2(px) + '" x2="' + r2(px + pw) + '" y1="' + r2(Y(t)) + '" y2="' + r2(Y(t)) + '" stroke="' + th.grid + '"' + (t === 0 ? '' : ' stroke-dasharray="2 4"') + '/>' +
        text(px - 8, Y(t) + 3.5, tl[i], small(th, 10, 'text-anchor="end"'));
    });
    steps.forEach(function (st, i) {
      var x = px + i * slot + (slot - bwid) / 2, yA = Y(Math.max(st.from, st.to)), yB = Y(Math.min(st.from, st.to));
      var bh = Math.max(1, yB - yA);
      s += '<rect x="' + r2(x) + '" y="' + r2(yA) + '" width="' + r2(bwid) + '" height="' + r2(bh) + '" rx="' + r2(Math.min(3, bwid / 2, bh / 2)) +
        '" fill="' + cols[st.kind] + '"' + anim(o, 'bzc-a', Math.min(0.6, i * 0.05)) + '/>';
      // A thin step from this bar's level across to the next bar.
      if (i < n - 1) {
        s += '<line x1="' + r2(x + bwid) + '" x2="' + r2(x + slot) + '" y1="' + r2(Y(st.to)) + '" y2="' + r2(Y(st.to)) + '" stroke="' + th.muted + '" stroke-dasharray="2 2"/>';
      }
      if (showTags) {
        var below = Math.max(st.from, st.to) <= 0 && Math.min(st.from, st.to) < 0;
        s += text(x + bwid / 2, below ? yB + 12 : yA - 5, tags[i], small(th, 10, 'text-anchor="middle" font-weight="600"', th.fg));
      }
      if (labels[i] != null && i % every === 0) s += text(x + bwid / 2, py + ph + negTag + 15, labels[i], small(th, 10, 'text-anchor="middle"'));
    });
    if (has(o.goal)) s += goalLine(o, th, px, px + pw, Y(+o.goal));
    steps.forEach(function (st, i) { s += hit(px + i * slot, top0, slot, h - (top0 - y0), tipOf(st), i, st.change); });
    return s;
  }, { summary: n ? 'ends at ' + fmt(end, o) + ' after ' + n + (n === 1 ? ' step' : ' steps') : 'no data' });

  function tipOf(st) {
    return st.name + (st.kind === 'total' ? '\nTotal ' + fmt(st.to, o) : '\nChange ' + (st.change > 0 ? '+' : '') + fmt(st.change, o) + '\nRunning total ' + fmt(st.to, o));
  }
}

/** Each bar's name, kind, change and the levels it runs between. */
function walk(v, labels, totals) {
  // A label wins, so a total on "2026" finds the year. Otherwise a whole number is a position, counting from 0.
  var at = list(totals).map(function (m) {
    var i = labels.indexOf(m);
    return i < 0 && String(parseInt(m, 10)) === m ? parseInt(m, 10) : i;
  }), run = 0;
  return v.map(function (x, i) {
    var name = labels[i] || 'Step ' + (i + 1), from = run, total = at.indexOf(i) >= 0;
    run += x;
    return total ? { name: name, kind: 'total', change: x, from: 0, to: run } : { name: name, kind: x < 0 ? 'down' : 'up', change: x, from: from, to: run };
  });
}

waterfall.table = function (o) {
  var v = nums(o.values), labels = list(o.labels);
  return {
    head: ['Step', 'Change', 'Running total'],
    rows: walk(v, labels, o.totals).map(function (st) {
      return [st.name, st.kind === 'total' ? 'Total' : (st.change > 0 ? '+' : '') + fmt(st.change, o), fmt(st.to, o)];
    }),
  };
};
