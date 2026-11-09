/** <bezel-progress> on its own: import 'bezel-charts/progress', or load dist/charts/progress.js. */
import progress from '../charts/progress.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('progress', progress);
define('progress');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
