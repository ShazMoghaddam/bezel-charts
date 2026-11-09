/** <bezel-heatmap> on its own: import 'bezel-charts/heatmap', or load dist/charts/heatmap.js. */
import heatmap from '../charts/heatmap.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('heatmap', heatmap);
define('heatmap');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
