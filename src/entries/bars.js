/** <bezel-bars> on its own: import 'bezel-charts/bars', or load dist/charts/bars.js. */
import bars from '../charts/bars.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('bars', bars);
define('bars');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
