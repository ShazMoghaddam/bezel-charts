/**
 * Bezel Charts
 * Small, polished charts as web components. Zero dependencies, pure SVG.
 * Created by Shaz Moghaddam, London · https://shazmoghaddam.github.io
 */
import { TYPES, render, toSVG } from './render.js';
import { THEMES } from './core/themes.js';
import { BezelChart } from './element.js';

export const version = '1.0.0';
export const types = Object.keys(TYPES);
export { render, toSVG, BezelChart, THEMES as themes };

if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') {
  for (const type of types) {
    const tag = `bz-${type}`;
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends BezelChart {
        get chartType() {
          return type;
        }
      });
    }
  }
  if (!customElements.get('bz-chart')) customElements.define('bz-chart', class extends BezelChart {});
}
