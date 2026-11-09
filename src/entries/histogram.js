/** <bezel-histogram> on its own: import 'bezel-charts/histogram', or load dist/charts/histogram.js. */
import histogram from '../charts/histogram.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('histogram', histogram);
define('histogram');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
