// fill (1.12.0): the soft shading under line charts can go under the first line, every line or none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSVG } from '../src/index.js';

const fills = (svg) => (svg.match(/fill="url\(#[^)]+\)"/g) || []).length;
const gradients = (svg) => (svg.match(/<linearGradient/g) || []).length;
const two = { values: '1,3,2|2,2,4', series: 'A,B' };

test('by default only the first line is shaded, as before', () => {
  assert.equal(fills(toSVG('line', two)), 1);
  assert.equal(toSVG('line', two), toSVG('line', { ...two, fill: 'first' }));
  assert.equal(toSVG('line', two), toSVG('line', { ...two, fill: '' }), 'a bare attribute means the default');
});

test('fill="none", "false", "off" and false turn the shading off', () => {
  for (const fill of ['none', 'false', 'off', false]) {
    const svg = toSVG('line', { ...two, fill });
    assert.equal(fills(svg), 0, String(fill));
    assert.equal(gradients(svg), 0, String(fill));
  }
});

test('fill="all" shades every line, more lightly so they stay readable together', () => {
  const svg = toSVG('line', { ...two, fill: 'all' });
  assert.equal(fills(svg), 2);
  assert.equal((svg.match(/stop-opacity="\.16"/g) || []).length, 2);
  // One line is shaded the same whichever way you ask.
  assert.equal(toSVG('line', { values: '1,3,2', fill: 'all' }), toSVG('line', { values: '1,3,2' }));
});

test('fill follows gaps and stays off on a log scale', () => {
  const svg = toSVG('line', { values: '1,2,,4,5|2,,3,3,3', fill: 'all' });
  assert.equal(fills(svg), 2);
  assert.equal(fills(toSVG('line', { values: '1,10,100', log: '', fill: 'all' })), 0);
});

test('sparklines take fill="none" too', () => {
  const svg = toSVG('spark', { values: '3,5,4', fill: 'none' });
  assert.equal(fills(svg), 0);
  assert.equal(gradients(svg), 0);
  assert.equal(fills(toSVG('spark', { values: '3,5,4' })), 1);
});
