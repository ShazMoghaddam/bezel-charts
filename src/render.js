/** Pure rendering: options in, SVG string out. No DOM needed, so it runs in browsers, Node and build scripts. */
import { THEMES } from './core/themes.js';
import { bool } from './core/util.js';
/** Every chart type, in the order the full bundle loads them. */
export const NAMES = ['spark', 'line', 'bars', 'scatter', 'ring', 'donut', 'gauge', 'progress', 'heatmap'];

/** The renderers loaded so far. Each chart's entry file adds its own, so a page only loads the charts it uses. */
export const TYPES = {};

/** Makes a chart type available to render(), toSVG() and the elements. */
export function register(type, fn) {
  TYPES[type] = fn;
}

const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Renders a chart to an SVG string.
 * @param {string} type one of TYPES
 * @param {object} [options] the same names as the HTML attributes, in kebab-case or camelCase
 */
function prepare(type, options) {
  if (!TYPES[type]) {
    throw new Error(NAMES.includes(type)
      ? `Bezel Charts: the ${type} chart isn't loaded. Add import 'bezel-charts/${type}', or load dist/charts/${type}.js.`
      : `Bezel Charts: unknown chart type "${type}". Choose one of: ${NAMES.join(', ')}.`);
  }
  const o = {};
  for (const [k, v] of Object.entries(options)) o[camel(k)] = v;
  return o;
}

export function render(type, options = {}) {
  const o = prepare(type, options);
  o.animate = bool(o.animate);
  o.frame = o.frame === 'none' ? 'none' : 'bezel';
  const mode = o.theme === 'light' || o.theme === 'dark' ? o.theme : o.autoTheme || 'dark';
  return TYPES[type](o, THEMES[mode]);
}

/**
 * The chart's data as a table, for screen readers and anyone who wants the exact numbers:
 * { head: [column names], rows: [[cells], ...] }, with numbers formatted the same way as the chart.
 */
export function table(type, options = {}) {
  return TYPES[type].table(prepare(type, options));
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
