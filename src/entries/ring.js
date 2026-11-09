/** <bezel-ring> on its own: import 'bezel-charts/ring', or load dist/charts/ring.js. */
import ring from '../charts/ring.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('ring', ring);
define('ring');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
