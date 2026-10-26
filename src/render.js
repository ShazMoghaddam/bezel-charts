/** Pure rendering: options in, SVG string out. No DOM needed, so it runs in browsers, Node and build scripts. */
import { THEMES } from './core/themes.js';
import { bool } from './core/util.js';
import spark from './charts/spark.js';
import line from './charts/line.js';
import bars from './charts/bars.js';
import ring from './charts/ring.js';
import donut from './charts/donut.js';
import gauge from './charts/gauge.js';
import progress from './charts/progress.js';
import heatmap from './charts/heatmap.js';

export const TYPES = { spark, line, bars, ring, donut, gauge, progress, heatmap };

const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Renders a chart to an SVG string.
 * @param {string} type one of TYPES
 * @param {object} [options] the same names as the HTML attributes, in kebab-case or camelCase
 */
export function render(type, options = {}) {
  if (!TYPES[type]) {
    throw new Error(`Bezel Charts: unknown chart type "${type}". Choose one of: ${Object.keys(TYPES).join(', ')}.`);
  }
  const o = {};
  for (const [k, v] of Object.entries(options)) o[camel(k)] = v;
  o.animate = bool(o.animate);
  o.frame = o.frame === 'none' ? 'none' : 'bezel';
  const mode = o.theme === 'light' || o.theme === 'dark' ? o.theme : o.autoTheme || 'dark';
  return TYPES[type](o, THEMES[mode]);
}

/** Strips hover targets and tooltip data so the SVG is a clean static image. */
export function toStatic(svg) {
  return svg
    .replace(/<rect class="bzc-hit"[^>]*\/>/g, '')
    .replace(/<circle[^>]* class="bzc-hit"[^>]*\/>/g, '')
    .replace(/ data-tip="[^"]*"/g, '');
}

/** Renders a static SVG ready for a README, Notion page or slide. */
export function toSVG(type, options = {}) {
  return toStatic(render(type, { ...options, animate: false }));
}
