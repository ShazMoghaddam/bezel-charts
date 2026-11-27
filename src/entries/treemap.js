/** <bezel-treemap> on its own: import 'bezel-charts/treemap', or load dist/charts/treemap.js. */
import treemap from '../charts/treemap.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('treemap', treemap);
define('treemap');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
