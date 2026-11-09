/** <bezel-area> on its own: import 'bezel-charts/area', or load dist/charts/area.js. */
import area from '../charts/area.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('area', area);
define('area');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
