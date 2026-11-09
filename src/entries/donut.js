/** <bezel-donut> on its own: import 'bezel-charts/donut', or load dist/charts/donut.js. */
import donut from '../charts/donut.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('donut', donut);
define('donut');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
