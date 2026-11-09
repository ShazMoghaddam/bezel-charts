/** <bezel-line> on its own: import 'bezel-charts/line', or load dist/charts/line.js. */
import line from '../charts/line.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('line', line);
define('line');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
