/** The custom element shared by every chart tag. */
import { render, toStatic } from './render.js';
import { MONO, SANS, esc, clamp } from './core/util.js';
import { THEMES } from './core/themes.js';

export const ATTRIBUTES = [
  'type', 'values', 'labels', 'series', 'heading', 'prefix', 'suffix', 'decimals', 'compact', 'color', 'theme', 'frame',
  'width', 'height', 'goal', 'goal-label', 'notes', 'show-values', 'stat', 'delta', 'delta-label', 'max', 'min', 'value',
  'zones', 'horizontal', 'straight', 'zero', 'start', 'lang', 'corners', 'background', 'center-label', 'highlight',
  'x', 'y', 'x-label', 'y-label', 'trend', 'static', 'no-tooltips',
];

const HOST_CSS =
  ':host{display:block;position:relative;max-width:100%}:host([hidden]){display:none}' +
  'svg{display:block;max-width:100%;height:auto;overflow:visible}' +
  `.tip{position:absolute;left:0;top:0;pointer-events:none;background:#0b0b10;color:#f2f1f7;font:600 12px/1.5 ${MONO};` +
  'padding:7px 10px;border-radius:10px;white-space:pre;opacity:0;transform:translate(-50%,calc(-100% - 12px));transition:opacity .12s;z-index:3;' +
  'border:1px solid #2a2935;box-shadow:0 8px 24px rgba(0,0,0,.35)}.tip.on{opacity:1}';

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
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('pointermove', (e) => this.#tip(e));
      this.shadowRoot.addEventListener('pointerdown', (e) => this.#tip(e));
      this.addEventListener('pointerleave', () => this.shadowRoot.querySelector('.tip')?.classList.remove('on'));
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
    let svg;
    try {
      svg = render(this.chartType, o);
    } catch (err) {
      svg = `<p style="font:13px ${SANS};color:#d63f7c">${esc(err.message)}</p>`;
    }
    // The live chart has its own tooltips, so drop the <title> browsers would show as a second one.
    // aria-label still names it for screen readers, and toSVG() keeps the <title> for static images.
    svg = svg.replace(/<title>[\s\S]*?<\/title>/, '');
    this.shadowRoot.innerHTML = `<style>${HOST_CSS}</style>${svg}<div class="tip" role="status"></div>`;
    this.#rendered = true;
    this.dispatchEvent(new CustomEvent('bezel-render', { bubbles: true }));
  }

  #tip(e) {
    const tip = this.shadowRoot.querySelector('.tip');
    if (!tip || this.hasAttribute('no-tooltips')) return;
    const target = e.target?.closest?.('[data-tip]');
    if (!target) {
      tip.classList.remove('on');
      return;
    }
    tip.textContent = target.getAttribute('data-tip');
    const box = this.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    tip.style.left = `${clamp(e.clientX - box.left, half, Math.max(half, box.width - half))}px`;
    tip.style.top = `${e.clientY - box.top}px`;
    tip.classList.add('on');
  }
}
