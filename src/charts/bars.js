import { newId, r2, num, has, list, series, tw, trunc, bool, fmt, fmtv, ok, real, gapNote, gapMark, text, small, hit, anim, palette, emptyState, goalLine, goalText, statOf, SANS, MONO, at, parseNotes } from '../core/util.js';
import { legend, seriesTable, styleOf, pattern, PATTERNS } from '../core/series.js';
import { tile, dims } from '../core/tile.js';
import { noteLayout, noteMarks } from '../core/notes.js';

/** How far angled labels lean, and the longest label they show before shortening it. */
var ANGLE = 40, ANGLE_MAX_CHARS = 24;

/**
 * Bars, vertical or horizontal. Separate several series with "|" in values to get grouped bars:
 * values="4,9,6|3,7,8" series="2026,2025". Add `stacked` to pile the series into one bar instead.
 */
export default function bars(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var k = S.length, n = Math.max.apply(null, [0].concat(S.map(function (s) { return s.length; })));
  var grouped = k > 1, horiz = bool(o.horizontal), stacked = grouped && bool(o.stacked);
  var many = !grouped && list(o.color).filter(Boolean).length > 1;
  var v0 = S[0] || [], flat = [].concat.apply([], S), all = real(flat);
  // A stack's height is its parts added up, positive parts upwards and negative parts downwards.
  var sumOf = function (i, sign) {
    return S.reduce(function (t, s) { return i < s.length && s[i] * sign > 0 ? t + s[i] : t; }, 0);
  };
  var totals = [], ups = [], downs = [];
  // A stack with a missing part has no known total.
  var whole = function (i) { return S.every(function (s) { return i >= s.length || ok(s[i]); }); };
  for (var t = 0; stacked && t < n; t++) { ups.push(sumOf(t, 1)); downs.push(sumOf(t, -1)); totals.push(whole(t) ? ups[t] + downs[t] : NaN); }
  var scale = stacked ? ups.concat(downs) : all;
  var top = scale.length ? Math.max.apply(null, scale) : 0;
  var nameOf = function (j) { return names[j] || 'Series ' + (j + 1); };
  // Patterns tell grouped and stacked series apart without relying on colour alone.
  var patOf = grouped ? styleOf(o.patterns, PATTERNS, 'solid') : null, defs = '', fills = [];
  for (var p = 0; patOf && p < k; p++) {
    if (patOf(p) === 'solid') continue;
    var pid = newId('g');
    defs += pattern(pid, patOf(p), pal[p % pal.length], o.background || th.tile);
    fills[p] = 'url(#' + pid + ')';
  }
  var colourOf = function (j, i) { return grouped ? fills[j] || pal[j % pal.length] : many ? pal[i % pal.length] : pal[0]; };
  var key = patOf && function (j, x, y) { return '<rect x="' + r2(x) + '" y="' + r2(y + 1) + '" width="10" height="10" rx="2" fill="' + colourOf(j) + '"/>'; };
  var opac = function (val) { return grouped || many || o.highlight === 'none' || val === top ? 1 : 0.5; };
  var labelOf = function (i) { return labels[i] || '#' + (i + 1); };
  var tipOf = function (i) {
    if (!grouped) return labelOf(i) + ': ' + fmtv(v0[i], o);
    return labelOf(i) + S.map(function (s, j) { return i < s.length ? '\n' + nameOf(j) + ': ' + fmtv(s[i], o) : ''; }).join('') +
      (stacked ? '\nTotal: ' + fmtv(totals[i], o) : '');
  };

  // Horizontal rows need their height up front, and so does a legend that may wrap.
  var d0 = dims(o);
  var legendH = grouped || names.length ? legend(S.map(function (_, j) { return nameOf(j); }), pal, th, 0, 0, d0.w, key, key && 15).height : 0;
  var rows = stacked ? 1 : k, thin = grouped && !stacked;
  var subH = thin ? 10 : 14, subGap = 3;
  var rowH = horiz ? rows * subH + (rows - 1) * subGap + (thin ? 14 : 16) : 0;
  // Horizontal bars put the goal's label in a strip above the first row.
  var goalH = horiz && n && has(o.goal) && +o.goal > 0 ? 16 : 0;
  var h = horiz ? legendH + goalH + Math.max(1, n) * rowH - 6 : num(o.height, 140) + legendH;
  var best = v0.indexOf(Math.max.apply(null, real(v0).length ? real(v0) : [0]));

  return tile(o, th, h, function (x0, y0, w, h) {
    if (!all.length) return emptyState(th, x0, y0, w, h);
    var s = defs ? '<defs>' + defs + '</defs>' : '', top0 = y0;
    if (legendH) {
      s += legend(S.map(function (_, j) { return nameOf(j); }), pal, th, x0, y0, w, key, key && 15).svg;
      top0 += legendH;
    }
    top0 += goalH;
    var lo = Math.min(0, Math.min.apply(null, scale)), hi = Math.max(0, top);
    if (has(o.goal)) { lo = Math.min(lo, +o.goal); hi = Math.max(hi, +o.goal); }
    if (hi === lo) hi = lo + 1;

    if (horiz) {
      var labW = labels.length ? Math.min(w * 0.4, Math.max.apply(null, labels.map(function (l) { return tw(l, 12); })) + 10) : 0;
      var vals = stacked ? [totals.map(function (x) { return fmt(x, o); })] : S.map(function (s) { return s.map(function (x) { return fmt(x, o); }); });
      var valW = Math.max.apply(null, [].concat.apply([], vals).map(function (t) { return tw(t, thin ? 10 : 11, true); })) + 10;
      var bx = x0 + labW, bw = w - labW - valW, span = Math.max(hi, 0) || 1;
      for (var i = 0; i < n; i++) {
        var ry = top0 + i * rowH;
        if (labels[i] != null) s += text(x0, ry + (rowH - 6) / 2 + 4, trunc(labels[i], Math.floor(labW / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
        if (stacked) {
          s += stackRow(i, bx, ry + 5, bw, span);
          s += text(x0 + w, ry + 5 + subH / 2 + 3.8, vals[0][i], 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
        } else {
          S.forEach(function (ser, j) {
            if (i >= ser.length) return;
            var val = ser[i], by = ry + (grouped ? 2 : 5) + j * (subH + subGap), len = Math.max(0, val) / span * bw;
            if (!grouped) s += '<rect x="' + r2(bx) + '" y="' + r2(by) + '" width="' + r2(bw) + '" height="' + subH + '" rx="' + subH / 2 + '" fill="' + th.grid + '" fill-opacity=".6"/>';
            if (len > 0) {
              s += '<rect x="' + r2(bx) + '" y="' + r2(by) + '" width="' + r2(Math.max(subH, len)) + '" height="' + subH + '" rx="' + subH / 2 + '" fill="' + colourOf(j, i) +
                '" fill-opacity="' + opac(val) + '"' + anim(o, 'bzc-gx', i * 0.06 + j * 0.03) + '/>';
            }
            s += text(x0 + w, by + subH / 2 + 3.8, vals[j][i], 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="' + (grouped ? 10 : 11) + '" font-weight="600"');
          });
        }
        s += hit(x0, ry, w, rowH - 6, tipOf(i), i, at(S, i));
      }
      if (goalH) {
        // The label sits above the first row, centred on the line but kept inside the bar area.
        var gx = bx + (+o.goal) / span * bw, glab = goalText(o), gw = tw(glab, 10, true);
        var glx = Math.max(bx + gw / 2, Math.min(bx + bw - gw / 2, gx));
        s += text(glx, top0 - goalH + 10, glab, small(th, 10, 'text-anchor="middle"'));
        s += '<line x1="' + r2(gx) + '" x2="' + r2(gx) + '" y1="' + r2(top0 - 2) + '" y2="' + r2(y0 + h + 2) + '" stroke="' + th.fg + '" stroke-opacity=".55" stroke-dasharray="3 3"/>';
      }
      return s;
    }

    // A horizontal stack: a track, then each positive part laid end to end with a hairline gap.
    function stackRow(i, bx, by, bw, span) {
      var out = '<rect x="' + r2(bx) + '" y="' + r2(by) + '" width="' + r2(bw) + '" height="' + subH + '" rx="' + subH / 2 + '" fill="' + th.grid + '" fill-opacity=".6"/>';
      var at = 0;
      S.forEach(function (ser, j) {
        var val = i < ser.length ? ser[i] : 0, len = Math.max(0, val) / span * bw;
        if (!(len > 0)) return;
        var gapL = at > 0 ? 1.5 : 0;
        out += '<rect x="' + r2(bx + at + gapL) + '" y="' + r2(by) + '" width="' + r2(Math.max(2, len - gapL)) + '" height="' + subH + '" rx="' + r2(Math.min(3, len / 2)) +
          '" fill="' + colourOf(j, i) + '"' + anim(o, 'bzc-gx', i * 0.06 + j * 0.03) + '/>';
        at += len;
      });
      return out;
    }

    // Labels that won't fit side by side either take turns (the default) or lean over so every one shows.
    var labMax = labels.length ? Math.max.apply(null, labels.map(function (l) { return tw(l, 10, true); })) : 0;
    var every = labels.length ? Math.max(1, Math.ceil(n * (labMax + 8) / w)) : 1;
    var angled = bool(o.angleLabels) && every > 1, rad = ANGLE * Math.PI / 180;
    var labText = function (l) { return angled ? trunc(l, ANGLE_MAX_CHARS) : l; };
    if (angled) {
      // Room on the left for the first labels, which lean past the start of the chart.
      var slot0 = w / n, lead = 0;
      labels.forEach(function (l, c) { lead = Math.max(lead, Math.cos(rad) * tw(labText(l), 10, true) + 4 - (c + 0.5) * slot0); });
      lead = Math.min(lead, w * 0.25);
      x0 += lead; w -= lead; every = 1;
    }
    var negLab = bool(o.showValues) && lo < 0 ? 14 : 0;
    var labDrop = angled ? Math.ceil(Math.sin(rad) * Math.min(labMax, tw('x'.repeat(ANGLE_MAX_CHARS), 10, true))) + 18 : 20;
    // Notes take a strip above the bars, one row per line of labels, so no label sits on a bar.
    var slotW = w / n, nl = noteLayout(parseNotes(o, labels), n, function (i) { return { c: x0 + slotW * (i + 0.5), l: x0 + slotW * i, r: x0 + slotW * (i + 1) }; }, x0, w);
    var bottom = (labels.length ? labDrop : 2) + negLab, topPad = (bool(o.showValues) ? 16 : 4) + (nl.rows ? nl.height + 4 : 0);
    var ph = h - (top0 - y0) - bottom - topPad, py = top0 + topPad;
    var Y = function (x) { return py + ph - (x - lo) / (hi - lo) * ph; };
    var slot = w / n, groupW = Math.min(slot * (thin ? 0.78 : 0.62), thin ? k * 30 : 56);
    var gap = thin ? Math.min(3, groupW / k * 0.15) : 0, bwid = stacked ? groupW : (groupW - gap * (k - 1)) / k, Y0 = Y(0);
    // Everything the goal label must keep clear of: the legend, the bars, their values and the labels underneath.
    var boxes = legendH ? [[x0, y0, w, legendH]] : [];
    if (labels.length) boxes.push([x0, py + ph + negLab + 4, w, h - (py + ph + negLab + 4 - y0)]);
    var valueBox = function (cx, ty, str, size) { var vw = tw(str, size, true); boxes.push([cx - vw / 2, ty - 9, vw, 12]); };
    if (nl.rows) s += noteMarks(th, nl, top0, py + ph);
    s += '<line x1="' + x0 + '" x2="' + (x0 + w) + '" y1="' + r2(Y0) + '" y2="' + r2(Y0) + '" stroke="' + th.grid + '"/>';
    for (var c = 0; c < n; c++) {
      var gx0 = x0 + c * slot + (slot - groupW) / 2;
      if (stacked) {
        s += stackColumn(c, gx0);
      } else {
        S.forEach(function (ser, j) {
          if (c >= ser.length) return;
          var val = ser[c], x = gx0 + j * (bwid + gap), y = Math.min(Y(val), Y0), bh = Math.abs(Y(val) - Y0);
          // A missing value gets a short dash on the zero line, so its empty slot doesn't read as 0.
          if (!ok(val)) { s += gapMark(x, bwid, Y0, th); return; }
          if (bh > 0.5) {
            s += '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(bwid) + '" height="' + r2(bh) + '" rx="' + r2(Math.min(6, bwid / 2, bh / 2)) +
              '" fill="' + colourOf(j, c) + '" fill-opacity="' + opac(val) + '"' + anim(o, val < 0 ? 'bzc-gn' : 'bzc-g', c * 0.05 + j * 0.03) + '/>';
            boxes.push([x, y, bwid, bh]);
          }
          if (bool(o.showValues)) {
            var vy = val < 0 ? Y(val) + 12 : Y(val) - 5, vs = fmt(val, o, true);
            s += text(x + bwid / 2, vy, vs,
              'text-anchor="middle" fill="' + th.fg + '" font-family="' + MONO + '" font-size="' + (grouped ? 9 : 10) + '" font-weight="600"');
            valueBox(x + bwid / 2, vy, vs, grouped ? 9 : 10);
          }
        });
      }
      if (labels[c] != null && c % every === 0) {
        var lx = gx0 + groupW / 2, ly = py + ph + negLab + (angled ? 12 : 15);
        s += angled
          ? text(lx, ly, labText(labels[c]), small(th, 10, 'text-anchor="end" transform="rotate(-' + ANGLE + ' ' + r2(lx) + ' ' + r2(ly) + ')"'))
          : text(lx, ly, labels[c], small(th, 10, 'text-anchor="middle"'));
      }
      s += hit(x0 + c * slot, top0, slot, h - (top0 - y0), tipOf(c), c, at(S, c));
    }
    if (has(o.goal)) s += goalLine(o, th, x0, x0 + w, Y(+o.goal), goalSpot(o, th, x0, x0 + w, Y(+o.goal), boxes));
    return s;

    // A vertical stack: positive parts upwards from zero and negative parts downwards, with a hairline gap.
    function stackColumn(c, x) {
      var out = '', up = 0, down = 0;
      S.forEach(function (ser, j) {
        var val = c < ser.length ? ser[c] : 0;
        if (!val) return;
        var from = val > 0 ? up : down, to = from + val;
        if (val > 0) up = to; else down = to;
        var yA = Y(Math.max(from, to)), yB = Y(Math.min(from, to)), bh = yB - yA;
        // The gap goes on the side nearest zero, so the outermost part keeps its full height.
        var gapZ = from !== 0 ? Math.min(1.5, bh / 2) : 0;
        if (val > 0) yB -= gapZ; else yA += gapZ;
        bh = yB - yA;
        if (bh > 0.5) {
          out += '<rect x="' + r2(x) + '" y="' + r2(yA) + '" width="' + r2(bwid) + '" height="' + r2(bh) + '" rx="' + r2(Math.min(3, bwid / 2, bh / 2)) +
            '" fill="' + colourOf(j, c) + '"' + anim(o, val < 0 ? 'bzc-gn' : 'bzc-g', c * 0.05 + j * 0.03) + '/>';
          boxes.push([x, yA, bwid, bh]);
        }
      });
      if (bool(o.showValues)) {
        var tot = totals[c], ty = tot < 0 ? Y(downs[c]) + 12 : Y(ups[c]) - 5, ts = ok(tot) ? fmt(tot, o, true) : '–';
        out += text(x + bwid / 2, ty, ts,
          'text-anchor="middle" fill="' + th.fg + '" font-family="' + MONO + '" font-size="10" font-weight="600"');
        valueBox(x + bwid / 2, ty, ts, 10);
      }
      return out;
    }
  }, {
    stat: statOf(v0, o, ''),
    summary: !n ? 'no data' : stacked ? k + ' series stacked across ' + n + ' groups' : grouped ? k + ' series across ' + n + ' groups' : 'highest ' + (labels[best] || '') + ' ' + fmt(v0[best], o) + gapNote(flat),
  });
}

bars.table = function (o) { return seriesTable(o, series(o.values).length > 1 && bool(o.stacked)); };

/**
 * Where the goal label goes on vertical bars: the first of above right, below right, above left and below left that
 * keeps clear of the [x, y, w, h] boxes already drawn. If none is, above right with an outline in the tile colour,
 * so it still reads over whatever is behind it.
 */
function goalSpot(o, th, x1, x2, y, boxes) {
  var lw = tw(goalText(o), 10, true), spots = [[x2, y - 5, 'end'], [x2, y + 13, 'end'], [x1, y - 5, 'start'], [x1, y + 13, 'start']];
  for (var i = 0; i < 4; i++) {
    var sp = spots[i], a = [sp[2] === 'end' ? sp[0] - lw : sp[0], sp[1] - 9, lw, 12];
    // Clear means at least 4px from every box.
    if (!boxes.some(function (b) { return a[0] < b[0] + b[2] + 4 && b[0] < a[0] + a[2] + 4 && a[1] < b[1] + b[3] + 4 && b[1] < a[1] + a[3] + 4; })) return sp.concat('');
  }
  return [x2, y - 5, 'end', ' stroke="' + (o.background || th.tile) + '" stroke-width="3" stroke-linejoin="round" paint-order="stroke"'];
}
