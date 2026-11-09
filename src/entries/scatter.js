/** <bezel-scatter> on its own: import 'bezel-charts/scatter', or load dist/charts/scatter.js. */
import scatter from '../charts/scatter.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('scatter', scatter);
define('scatter');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
