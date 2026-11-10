/** <bezel-combo> on its own: import 'bezel-charts/combo', or load dist/charts/combo.js. */
import combo from '../charts/combo.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('combo', combo);
define('combo');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
