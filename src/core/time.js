/** Real dates along the bottom of line and area charts: parsing, tick steps and labels. Only those charts load this. */
import { list } from './util.js';

var HOUR = 36e5, DAY = 864e5;

/**
 * The dates option as UTC times, one per point: "2026-01-05", or with a time, "2026-01-05T14:30". Returns null, so
 * points stay evenly spaced, unless there is a valid date for every point.
 */
export function parseDates(o, n) {
  var d = list(o.dates);
  if (!n || d.length < n) return null;
  var out = [];
  for (var i = 0; i < n; i++) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(d[i]).trim());
    if (!m) return null;
    out.push(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  }
  return out;
}

function fmt(lang, opt) {
  try { return new Intl.DateTimeFormat(lang, Object.assign({ timeZone: 'UTC' }, opt)); } catch (e) { return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'UTC' }, opt)); }
}

var pad = function (n) { return (n < 10 ? '0' : '') + n; };
var clock = function (t) { var d = new Date(t); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); };

/** A date for tooltips and the data table: "5 Jan 2026", with the time too when the dates have times. */
export function dateText(t, lang, withTime) {
  return fmt(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(t)) + (withTime ? ' ' + clock(t) : '');
}

/** Whether any of the dates has a time of day. */
export function hasTimes(T) {
  return T.some(function (t) { return t % DAY !== 0; });
}

// Tick steps from an hour to a century, smallest first. Each is a unit and how many of it.
var STEPS = [['h', 1], ['h', 3], ['h', 6], ['h', 12], ['d', 1], ['d', 2], ['w', 1], ['w', 2], ['m', 1], ['m', 2], ['m', 3], ['m', 6],
  ['y', 1], ['y', 2], ['y', 5], ['y', 10], ['y', 20], ['y', 50], ['y', 100]];
var ROUGH = { h: HOUR, d: DAY, w: 7 * DAY, m: 30.44 * DAY, y: 365.25 * DAY };

/** Every tick of one step between t0 and t1: whole hours, midnights, Mondays, firsts of the month or new years. */
function ticksFor(t0, t1, unit, k) {
  var out = [], t;
  if (unit === 'h' || unit === 'd' || unit === 'w') {
    var size = unit === 'h' ? HOUR * k : DAY * (unit === 'w' ? 7 * k : k);
    // Weeks start on Mondays: 5 January 1970 was the first Monday after the epoch.
    var from = unit === 'w' ? 4 * DAY : 0;
    for (t = Math.ceil((t0 - from) / size) * size + from; t <= t1; t += size) out.push(t);
    return out;
  }
  var d = new Date(t0), y = d.getUTCFullYear(), mo = unit === 'm' ? d.getUTCMonth() : 0;
  for (;;) {
    t = Date.UTC(y, mo, 1);
    if (t > t1) return out;
    if (t >= t0 && (unit === 'm' ? mo % k === 0 : y % k === 0)) out.push(t);
    if (unit === 'm') { mo++; if (mo === 12) { mo = 0; y++; } } else y++;
  }
}

/**
 * Ticks and labels for the dates t0 to t1 across room pixels: the smallest step that leaves about 64 px per label.
 * Hours read 14:00 (midnight shows the day), days and weeks 5 Jan, months Jan with the year on January and the first
 * tick, and years 2026.
 */
export function dateTicks(t0, t1, room, lang) {
  var most = Math.max(2, Math.floor(room / 64)), span = t1 - t0;
  for (var i = 0; i < STEPS.length; i++) {
    var unit = STEPS[i][0], k = STEPS[i][1];
    if (span / (ROUGH[unit] * k) > most + 2) continue;
    var ticks = ticksFor(t0, t1, unit, k);
    if (ticks.length > most) continue;
    var dm = fmt(lang, { day: 'numeric', month: 'short' }), my = fmt(lang, { month: 'short', year: 'numeric' }), mm = fmt(lang, { month: 'short' });
    return ticks.map(function (t, j) {
      var d = new Date(t), text;
      if (unit === 'h') text = t % DAY === 0 ? dm.format(d) : clock(t);
      else if (unit === 'd' || unit === 'w') text = dm.format(d);
      else if (unit === 'm') text = d.getUTCMonth() === 0 || j === 0 ? my.format(d) : mm.format(d);
      else text = String(d.getUTCFullYear());
      return { t: t, text: text };
    });
  }
  return [];
}

/** A point's name: its label, else its date, else its number. */
export function pointName(labels, T, i, lang, timed) {
  return labels[i] || (T ? dateText(T[i], lang, timed) : '#' + (i + 1));
}

/** Puts dates in a data table's first column, for the rows without a label. */
export function datedTable(t, o, n) {
  var T = parseDates(o, n), labels = list(o.labels);
  if (!T) return t;
  var timed = hasTimes(T);
  t.head[0] = 'Date';
  t.rows.forEach(function (r, i) { if (!labels[i]) r[0] = dateText(T[i], o.lang || 'en-GB', timed); });
  return t;
}
