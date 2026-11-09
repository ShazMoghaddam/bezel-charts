/** The custom element shared by every chart tag. */
import { render, table, toStatic } from './render.js';
import { MONO, SANS, esc, clamp } from './core/util.js';
import { THEMES } from './core/themes.js';

export const ATTRIBUTES = [
  'type', 'values', 'labels', 'series', 'heading', 'prefix', 'suffix', 'decimals', 'compact', 'color', 'theme', 'frame',
  'width', 'height', 'goal', 'goal-label', 'notes', 'show-values', 'stat', 'delta', 'delta-label', 'max', 'min', 'value',
  'zones', 'horizontal', 'straight', 'zero', 'start', 'lang', 'corners', 'background', 'center-label', 'highlight',
  'x', 'y', 'x-label', 'y-label', 'trend', 'static', 'no-tooltips', 'stacked', 'angle-labels', 'dash', 'markers', 'patterns',
];

const HOST_CSS =
  ':host{display:block;position:relative;max-width:100%}:host([hidden]){display:none}' +
  'svg{display:block;max-width:100%;height:auto;overflow:visible}' +
  `.tip{position:absolute;left:0;top:0;pointer-events:none;background:#0b0b10;color:#f2f1f7;font:600 12px/1.5 ${MONO};` +
  'padding:7px 10px;border-radius:10px;white-space:pre;opacity:0;transform:translate(-50%,calc(-100% - 12px));transition:opacity .12s;z-index:3;' +
  'border:1px solid #2a2935;box-shadow:0 8px 24px rgba(0,0,0,.35)}.tip.on{opacity:1}' +
  // The focus ring is white with a black edge, so it shows on light and dark pages alike. Then the outline on the
  // value the arrow keys are on, and text only screen readers get.
  '.c{outline:none}.c:focus-visible{outline:2px solid #fff;outline-offset:3px;box-shadow:0 0 0 7px #000}.k{stroke:currentColor;stroke-width:2;stroke-opacity:1}' +
  '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}' +
  '@media (forced-colors:active){.c:focus-visible{outline-color:Highlight}}';

// Arrow keys move one value along; on a heatmap, left and right move a week (one column) and up and down a day.
const STEPS = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

const darkQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null);

// A page can force light or dark with data-theme on <html>; charts on auto follow it.
const pageTheme = () => {
  const t = typeof document !== 'undefined' && document.documentElement?.getAttribute?.('data-theme');
  return t === 'light' || t === 'dark' ? t : null;
};
const live = new Set();
if (typeof MutationObserver === 'function' && typeof document !== 'undefined' && document.documentElement) {
  new MutationObserver(() => live.forEach((el) => el.refresh())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

// Falls back to a plain class so the module can be imported in Node, where HTMLElement does not exist.
const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

export class BezelChart extends Base {
  static get observedAttributes() {
    return ATTRIBUTES;
  }

  /** The default colour sets, so tools like the Studio can show them. */
  static get themes() {
    return THEMES;
  }

  /** Which theme the chart is drawing in right now: "dark" or "light". */
  get resolvedTheme() {
    const t = this.getAttribute('theme');
    return t === 'light' || t === 'dark' ? t : this.options.autoTheme;
  }

  /** The chart type this tag draws. Subclasses fix it; <bezel-chart> reads its type attribute. */
  get chartType() {
    return this.getAttribute('type') || 'spark';
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      // The chart, the tooltip, the screen reader announcements and the data table stay in place between redraws,
      // so a focused chart keeps its focus when it resizes or changes theme.
      this.attachShadow({ mode: 'open' }).innerHTML = `<style>${HOST_CSS}</style><div class="c" role="group" aria-roledescription="chart"></div>` +
        '<p class="sr" id="h">Use the arrow keys to step through the values.</p><div class="tip" aria-hidden="true"></div><div class="sr" aria-live="polite"></div><div class="sr"></div>';
      [, this.#box, , this.#tipEl, this.#live, this.#table] = this.shadowRoot.children;
      this.shadowRoot.addEventListener('pointermove', (e) => this.#tip(e));
      this.shadowRoot.addEventListener('pointerdown', (e) => this.#tip(e));
      this.addEventListener('pointerleave', () => this.#tipEl.classList.remove('on'));
      this.#box.addEventListener('keydown', (e) => this.#key(e));
      this.#box.addEventListener('blur', () => this.#clear());
    }
    live.add(this);
    this.#dark = darkQuery();
    this.#dark?.addEventListener?.('change', this.#onScheme);
    if (typeof ResizeObserver === 'function') {
      this.#ro = new ResizeObserver(([entry]) => {
        const w = Math.round(entry.contentRect.width);
        if (!this.#rendered || (!this.hasAttribute('width') && w > 0 && Math.abs(w - this.#width) > 1)) this.#render();
      });
      this.#ro.observe(this);
    } else {
      this.#render();
    }
  }

  disconnectedCallback() {
    live.delete(this);
    this.#ro?.disconnect();
    this.#dark?.removeEventListener?.('change', this.#onScheme);
  }

  attributeChangedCallback() {
    if (!this.#rendered || this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      this.#render();
    });
  }

  /** Current settings as a plain object, the same shape BezelCharts.render() takes. */
  get options() {
    const o = {};
    for (const name of ATTRIBUTES) if (this.hasAttribute(name)) o[name] = this.getAttribute(name);
    if (!o.width) o.width = this.#width || 360;
    o.autoTheme = pageTheme() || (this.#dark ? (this.#dark.matches ? 'dark' : 'light') : 'dark');
    return o;
  }

  /** Redraws the chart without replaying its entrance animation. */
  refresh() {
    if (this.#rendered) this.#render();
  }

  /** The chart as a standalone static SVG string. */
  toSVG(extra = {}) {
    return toStatic(render(this.chartType, { ...this.options, ...extra, animate: false }));
  }

  /** Saves the chart as an .svg file. */
  download(name) {
    const url = URL.createObjectURL(new Blob([this.toSVG()], { type: 'image/svg+xml' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${(name || this.getAttribute('heading') || this.chartType).replace(/[^\w-]+/g, '-').toLowerCase()}.svg`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  #ro = null;
  #box = null;
  #tipEl = null;
  #live = null;
  #table = null;
  #at = -1;
  #dark = null;
  #width = 0;
  #rendered = false;
  #queued = false;
  #onScheme = () => {
    const t = this.getAttribute('theme');
    if (!t || t === 'auto') this.refresh();
  };

  #render() {
    if (!this.shadowRoot) return;
    const w = Math.round(this.getBoundingClientRect?.().width || 0);
    this.#width = w > 0 ? w : 360;
    const o = this.options;
    o.animate = !this.#rendered && !this.hasAttribute('static');
    let svg, data = null;
    try {
      svg = render(this.chartType, o);
      data = table(this.chartType, o);
    } catch (err) {
      svg = `<p style="font:13px ${SANS};color:#d63f7c">${esc(err.message)}</p>`;
    }
    // The live chart has its own tooltips, so drop the <title> browsers would show as a second one.
    // toSVG() keeps the <title> for static images.
    const box = this.#box;
    box.innerHTML = svg.replace(/<title>[\s\S]*?<\/title>/, '');
    // The focusable wrapper carries the chart's name, so screen readers hear it once, not twice.
    const img = box.querySelector('svg');
    if (img) {
      box.setAttribute('aria-label', img.getAttribute('aria-label'));
      img.removeAttribute('role');
      img.removeAttribute('aria-label');
      img.setAttribute('aria-hidden', 'true');
    } else {
      box.removeAttribute('aria-label');
    }
    // Charts with tooltips take keyboard focus too, so keyboard users get the same exact values as mouse users.
    const keys = !!img && !this.hasAttribute('no-tooltips');
    if (keys) {
      box.setAttribute('tabindex', '0');
      box.setAttribute('aria-describedby', 'h');
    } else {
      box.removeAttribute('tabindex');
      box.removeAttribute('aria-describedby');
    }
    box.style.color = THEMES[o.theme === 'light' || o.theme === 'dark' ? o.theme : o.autoTheme].fg;
    box.style.borderRadius = `${o.frame === 'none' ? 4 : clamp(+o.corners || 22, 0, 60)}px`;
    this.#table.innerHTML = data && data.rows.length ? tableHTML(o.heading, data) : '';
    if (this.#at >= 0 && keys && this.shadowRoot.activeElement === box) this.#show(this.#at);
    else this.#at = -1;
    this.#rendered = true;
    this.dispatchEvent(new CustomEvent('bezel-render', { bubbles: true }));
  }

  #tip(e) {
    if (this.hasAttribute('no-tooltips')) return;
    const target = e.target?.closest?.('[data-tip]');
    if (!target) {
      this.#tipEl.classList.remove('on');
      return;
    }
    this.#place(target, e.clientX, e.clientY);
  }

  /** Shows the tooltip for a mark at a point on screen. */
  #place(mark, x, y) {
    const tip = this.#tipEl;
    tip.textContent = mark.getAttribute('data-tip');
    const box = this.getBoundingClientRect?.() || { left: 0, top: 0, width: 0 };
    const half = tip.offsetWidth / 2;
    tip.style.left = `${clamp(x - box.left, half, Math.max(half, box.width - half))}px`;
    tip.style.top = `${y - box.top}px`;
    tip.classList.add('on');
  }

  /** Every value the arrow keys visit, in order. Donuts mark their slices data-skip, as the legend rows repeat them. */
  #marks() {
    return [...this.#box.querySelectorAll('[data-tip]:not([data-skip])')];
  }

  #key(e) {
    const marks = this.#marks(), n = marks.length;
    if (!n) return;
    let i = this.#at, step = STEPS[e.key];
    if (step) {
      if (this.chartType === 'heatmap' && /Left|Right/.test(e.key)) step *= 7;
      i = i < 0 ? (step > 0 ? 0 : n - 1) : clamp(i + step, 0, n - 1);
    } else if (e.key === 'Home' || e.key === 'End') {
      i = e.key === 'Home' ? 0 : n - 1;
    } else {
      if (e.key === 'Escape') this.#clear();
      return;
    }
    e.preventDefault();
    this.#show(i, true);
  }

  /** Outlines value i, shows its tooltip and, when say is set, reads it out. */
  #show(i, say) {
    const marks = this.#marks();
    if (!marks.length) return;
    i = clamp(i, 0, marks.length - 1);
    this.#box.querySelector('.k')?.classList.remove('k');
    const mark = marks[i], r = mark.getBoundingClientRect?.() || { left: 0, top: 0, width: 0 };
    mark.classList.add('k');
    this.#at = i;
    this.#place(mark, r.left + r.width / 2, r.top);
    if (say) this.#live.textContent = `${mark.getAttribute('data-tip').replace(/\n/g, ', ')}. ${i + 1} of ${marks.length}`;
  }

  #clear() {
    this.#box.querySelector('.k')?.classList.remove('k');
    this.#tipEl.classList.remove('on');
    this.#live.textContent = '';
    this.#at = -1;
  }
}

/** The visually hidden table screen readers can browse: the chart's numbers in rows and columns. */
function tableHTML(caption, { head, rows }) {
  const cells = (row) => row.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('');
  return `<table><caption>${esc(caption || 'Chart data')}</caption><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${cells(r)}</tr>`).join('')}</tbody></table>`;
}

/** Defines <bezel-type>, plus <bezel-chart> if no chart has yet. Safe to call twice, and does nothing outside a browser. */
export function define(type) {
  if (typeof customElements === 'undefined' || typeof HTMLElement === 'undefined') return;
  if (!customElements.get(`bezel-${type}`)) {
    customElements.define(`bezel-${type}`, class extends BezelChart {
      get chartType() {
        return type;
      }
    });
  }
  if (!customElements.get('bezel-chart')) customElements.define('bezel-chart', class extends BezelChart {});
}
