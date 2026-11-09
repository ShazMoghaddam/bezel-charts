/** <bezel-boxplot> on its own: import 'bezel-charts/boxplot', or load dist/charts/boxplot.js. */
import boxplot from '../charts/boxplot.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('boxplot', boxplot);
define('boxplot');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
