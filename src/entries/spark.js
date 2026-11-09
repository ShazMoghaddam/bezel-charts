/** <bezel-spark> on its own: import 'bezel-charts/spark', or load dist/charts/spark.js. */
import spark from '../charts/spark.js';
import { register } from '../render.js';
import { define } from '../element.js';

register('spark', spark);
define('spark');

export { render, toSVG } from '../render.js';
export { BezelChart } from '../element.js';
