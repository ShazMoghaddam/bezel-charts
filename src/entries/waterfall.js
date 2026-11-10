/** <bezel-waterfall> on its own: import 'bezel-charts/waterfall', or load dist/charts/waterfall.js. */
import waterfall from '../charts/waterfall.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('waterfall', waterfall);
define('waterfall');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
