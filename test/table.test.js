// The Studio's file reader: CSV, JSON, dates and working out which columns are which.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDelimited, parseJSON, describe, daily, parseDate, excelDate } from '../site/table.js';

test('CSV with quotes, commas inside cells, currency and a byte order mark', () => {
  const rows = parseDelimited('﻿Month,Sales,Notes\r\nJan,"£1,200","Busy, very"\r\nFeb,1500,"Said ""ok"""\r\n\r\n');
  assert.deepEqual(rows, [['Month', 'Sales', 'Notes'], ['Jan', '£1,200', 'Busy, very'], ['Feb', '1500', 'Said "ok"']]);
});

test('semicolon CSV with European decimals', () => {
  const rows = parseDelimited('Land;Wert\nDE;1.234,5\nFR;12,25');
  assert.deepEqual(rows.slice(1), [['DE', '1234.5'], ['FR', '12.25']]);
});

test('tab separated cells pasted from a spreadsheet', () => {
  assert.deepEqual(parseDelimited('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
});

test('JSON in its common shapes', () => {
  assert.deepEqual(parseJSON('[{"month":"Jan","sales":1},{"month":"Feb","sales":2,"costs":3}]'),
    [['month', 'sales', 'costs'], ['Jan', '1', ''], ['Feb', '2', '3']]);
  assert.deepEqual(parseJSON('[4,5]'), [['Value'], ['4'], ['5']]);
  assert.deepEqual(parseJSON('{"month":["Jan","Feb"],"sales":[1,2]}'), [['month', 'sales'], ['Jan', '1'], ['Feb', '2']]);
  assert.deepEqual(parseJSON('{"data":[{"x":1}]}'), [['x'], ['1']]);
  assert.throws(() => parseJSON('{oops'), /valid JSON/);
});

test('describe finds the header, labels and number columns', () => {
  const t = describe([['Month', 'Sales', 'Costs'], ['Jan', '£1,200', '800'], ['Feb', '1500', '900']]);
  assert.equal(t.label.name, 'Month');
  assert.deepEqual(t.numbers.map((c) => c.name), ['Sales', 'Costs']);
  assert.equal(t.body.length, 2);
});

test('describe without a header names series itself', () => {
  const t = describe([['1', '2'], ['3', '4']]);
  assert.equal(t.label, null);
  assert.deepEqual(t.numbers.map((c) => c.name), ['Series 1', 'Series 2']);
  assert.equal(t.body.length, 2);
});

test('describe spots dates and a group column', () => {
  const rows = [['Date', 'Team', 'Hours', 'Score']];
  for (let i = 0; i < 8; i++) rows.push([`2026-03-0${i + 1}`, i % 2 ? 'B' : 'A', String(i), String(i * 2)]);
  const t = describe(rows);
  assert.equal(t.date.name, 'Date');
  assert.equal(t.group.name, 'Team');
  assert.deepEqual(t.numbers.map((c) => c.name), ['Hours', 'Score']);
});

test('describe returns null when there are no numbers', () => {
  assert.equal(describe([['a', 'b'], ['c', 'd']]), null);
});

test('daily adds up repeated days and fills gaps', () => {
  const t = describe([['Day', 'Commits'], ['2026-03-01', '2'], ['2026-03-01', '3'], ['03/03/2026', '1']]);
  const d = daily(t, t.numbers[0]);
  assert.equal(d.start, '2026-03-01');
  assert.deepEqual(d.values, [5, 0, 1]);
});

test('dates in ISO, UK order and Excel serial numbers', () => {
  assert.equal(parseDate('2026-3-1'), '2026-03-01');
  assert.equal(parseDate('01/03/2026'), '2026-03-01');
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseDate('12'), null);
  assert.equal(excelDate(46082), '2026-03-01');
});
