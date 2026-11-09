/** <bezel-gauge> on its own: import 'bezel-charts/gauge', or load dist/charts/gauge.js. */
import gauge from '../charts/gauge.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('gauge', gauge);
define('gauge');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
