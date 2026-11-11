/**
 * Bezel Charts
 * Small, polished charts as web components. Zero dependencies, pure SVG.
 * Created by Shaz Moghaddam, London · https://shazmoghaddam.github.io
 */
// Each entry registers its chart and defines its tag. Pages that only need a few charts can import those entries instead.
import './entries/spark.js';
import './entries/line.js';
import './entries/area.js';
import './entries/bars.js';
import './entries/combo.js';
import './entries/waterfall.js';
import './entries/histogram.js';
import './entries/boxplot.js';
import './entries/scatter.js';
import './entries/ring.js';
import './entries/donut.js';
import './entries/gauge.js';
import './entries/progress.js';
import './entries/bullet.js';
import './entries/heatmap.js';
import { NAMES, render, toSVG } from './render.js';
import { THEMES } from './core/themes.js';
import { BezelChart } from './element.js';

export const version = '1.10.1';
export const types = NAMES.slice();
export { render, toSVG, BezelChart, THEMES as themes };
