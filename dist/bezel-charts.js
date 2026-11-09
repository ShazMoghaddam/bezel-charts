/*! Bezel Charts v1.4.0 | MIT | github.com/ShazMoghaddam/bezel-charts */

// src/core/util.js
var SANS = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
var MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
var uid = 0;
function newId(p) {
  return "bzc" + p + (++uid).toString(36) + Math.random().toString(36).slice(2, 6);
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function r2(n) {
  return Math.round(n * 100) / 100;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function num(v, d) {
  var n = parseFloat(v);
  return isFinite(n) ? n : d;
}
function has(v) {
  return v != null && v !== "";
}
function nums(v) {
  if (Array.isArray(v)) return v.map(function(x) {
    var n = +x;
    return isFinite(n) ? n : 0;
  });
  if (!has(v)) return [];
  return String(v).split(/[\s,;]+/).filter(Boolean).map(function(x) {
    var n = +x;
    return isFinite(n) ? n : 0;
  });
}
function list(v) {
  if (Array.isArray(v)) return v.map(String);
  if (!has(v)) return [];
  return String(v).split(",").map(function(s) {
    return s.trim();
  });
}
function series(v) {
  if (Array.isArray(v)) return Array.isArray(v[0]) ? v.map(nums) : [nums(v)];
  if (!has(v)) return [];
  return String(v).split("|").map(nums).filter(function(s) {
    return s.length;
  });
}
function sum(v) {
  return v.reduce(function(a, b) {
    return a + b;
  }, 0);
}
function tw(s, size, mono) {
  return String(s).length * size * (mono ? 0.6 : 0.56);
}
function trunc(s, max) {
  s = String(s);
  return s.length > max ? s.slice(0, Math.max(1, max - 1)) + "\u2026" : s;
}
function bool(v) {
  return v === true || v === "" || v === "true" || v === "1";
}
function fmt(n, o, short) {
  if (!isFinite(n)) return "\u2013";
  var a = Math.abs(n), d;
  if (has(o.decimals)) d = clamp(parseInt(o.decimals, 10) || 0, 0, 6);
  else d = n % 1 === 0 ? 0 : a < 10 ? 2 : a < 100 ? 1 : 0;
  var opts = { maximumFractionDigits: d, minimumFractionDigits: has(o.decimals) ? d : 0 };
  if ((bool(o.compact) || short) && a >= 1e4) {
    opts = { notation: "compact", maximumFractionDigits: 1 };
  }
  var s;
  try {
    s = new Intl.NumberFormat(o.lang || "en-GB", opts).format(a);
  } catch (e) {
    s = String(r2(a));
  }
  return (n < 0 ? "\u2212" : "") + (o.prefix || "") + s + (o.suffix || "");
}
function pathOf(pts, straight) {
  if (!pts.length) return "";
  var d = "M" + r2(pts[0][0]) + "," + r2(pts[0][1]);
  for (var i = 1; i < pts.length; i++) {
    var a = pts[i - 1], b = pts[i];
    if (straight) d += "L" + r2(b[0]) + "," + r2(b[1]);
    else {
      var cx = (a[0] + b[0]) / 2;
      d += "C" + r2(cx) + "," + r2(a[1]) + " " + r2(cx) + "," + r2(b[1]) + " " + r2(b[0]) + "," + r2(b[1]);
    }
  }
  return d;
}
function text(x, y, s, attrs) {
  return '<text x="' + r2(x) + '" y="' + r2(y) + '" ' + (attrs || "") + ">" + esc(s) + "</text>";
}
function small(th, size, extra, fill) {
  return 'fill="' + (fill || th.muted) + '" font-family="' + MONO + '" font-size="' + (size || 10) + '"' + (extra ? " " + extra : "");
}
function hit(x, y, w, h, tip) {
  return '<rect class="bzc-hit" x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(Math.max(1, w)) + '" height="' + r2(Math.max(1, h)) + '" fill="#000" fill-opacity="0" data-tip="' + esc(tip) + '"/>';
}
function anim(o, cls, delay) {
  if (!o.animate) return "";
  return ' class="' + cls + '"' + (delay ? ' style="animation-delay:' + r2(delay) + 's"' : "");
}
function palette(o, th) {
  var c = list(o.color).filter(Boolean);
  return c.length ? c : th.palette;
}
function emptyState(th, x, y, w, h) {
  return text(x + w / 2, y + h / 2 + 4, "No data yet", 'text-anchor="middle" fill="' + th.muted + '" font-family="' + SANS + '" font-size="13"');
}
function parseNotes(o, labels) {
  if (!has(o.notes)) return [];
  return String(o.notes).split(";").map(function(part) {
    var k = part.indexOf(":");
    if (k < 0) return null;
    var key = part.slice(0, k).trim(), t = part.slice(k + 1).trim(), i = labels.map(String).indexOf(key);
    if (i < 0 && String(parseInt(key, 10)) === key) i = parseInt(key, 10);
    return i >= 0 && t ? { i, text: t } : null;
  }).filter(Boolean);
}
function goalLine(o, th, x1, x2, y) {
  var label = (has(o.goalLabel) ? o.goalLabel : "Goal") + " " + fmt(num(o.goal, 0), o);
  return '<line x1="' + r2(x1) + '" x2="' + r2(x2) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.fg + '" stroke-opacity=".55" stroke-width="1.25" stroke-dasharray="4 4"/>' + text(x2, y - 5, label, small(th, 10, 'text-anchor="end"'));
}
function statOf(v, o, fallback) {
  var k = String(has(o.stat) ? o.stat : fallback || "").toLowerCase();
  if (!k || k === "none" || !v.length) return null;
  var s = sum(v);
  var map = { last: v[v.length - 1], total: s, sum: s, average: s / v.length, avg: s / v.length, max: Math.max.apply(null, v), min: Math.min.apply(null, v) };
  if (!(k in map)) return null;
  var delta = null;
  if (k === "last" && v.length > 1 && o.delta !== "none") delta = v[v.length - 1] - v[0];
  return { val: map[k], delta };
}

// src/core/tile.js
function dims(o) {
  var W = Math.round(clamp(num(o.width, 360), 160, 2400));
  var b = o.frame === "none" ? 0 : 4;
  var P = o.frame === "none" ? 8 : 20;
  return { W, b, P, w: W - 2 * (b + P) };
}
var CSS = ".bzc-a{animation:bzc-in .6s ease both}.bzc-d{animation:bzc-draw 1.1s cubic-bezier(.3,.7,.2,1) both}.bzc-g{transform-box:fill-box;transform-origin:50% 100%;animation:bzc-grow .7s cubic-bezier(.2,.8,.2,1) both}.bzc-gn{transform-box:fill-box;transform-origin:50% 0;animation:bzc-grow .7s cubic-bezier(.2,.8,.2,1) both}.bzc-gx{transform-box:fill-box;transform-origin:0 50%;animation:bzc-growx .8s cubic-bezier(.2,.8,.2,1) both}.bzc-s{animation:bzc-sweep 1.1s cubic-bezier(.2,.8,.2,1) both}@keyframes bzc-in{from{opacity:0}}@keyframes bzc-draw{from{stroke-dashoffset:1}}@keyframes bzc-grow{from{transform:scaleY(0)}}@keyframes bzc-growx{from{transform:scaleX(0)}}@keyframes bzc-sweep{from{stroke-dasharray:0 100}}@media (prefers-reduced-motion:reduce){[class^=bzc-]{animation:none!important}}";
function tile(o, th, h, draw, meta) {
  var d = dims(o), W = d.W, b = d.b, P = d.P, w = d.w;
  var R = clamp(num(o.corners, 22), 0, 60);
  var y = b + P, head = "";
  if (has(o.heading)) {
    head += text(
      b + P,
      y + 10,
      String(o.heading).toUpperCase(),
      small(th, 11, 'font-weight="600" letter-spacing="1.3"')
    );
    y += 24;
  }
  var st = meta && meta.stat;
  if (st) {
    head += text(b + P, y + 30, fmt(st.val, o), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="32" font-weight="800" letter-spacing="-0.5"');
    if (st.delta != null) {
      var up = st.delta > 0, flat = st.delta === 0;
      var good = o.delta === "inverse" ? !up : up;
      var col = flat ? th.muted : good ? th.up : th.down;
      var lbl = (flat ? "\u25CF " : up ? "\u25B2 " : "\u25BC ") + fmt(Math.abs(st.delta), o) + " " + (has(o.deltaLabel) ? o.deltaLabel : "since start");
      head += text(b + P + w, y + 28, lbl, 'text-anchor="end" fill="' + col + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
    }
    y += 44;
  }
  var body = draw(b + P, y, w, h);
  var H = Math.round(y + h + P + b);
  var bg = "";
  if (o.frame !== "none") {
    bg = '<rect width="' + W + '" height="' + H + '" rx="' + R + '" fill="' + th.bezel + '"/><rect x="' + b + '" y="' + b + '" width="' + (W - 2 * b) + '" height="' + (H - 2 * b) + '" rx="' + Math.max(0, R - b) + '" fill="' + (o.background || th.tile) + '"/>';
  } else if (has(o.background)) {
    bg = '<rect width="' + W + '" height="' + H + '" rx="' + R + '" fill="' + o.background + '"/>';
  }
  var label = (has(o.heading) ? o.heading + ": " : "") + (meta && meta.summary || "chart");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(label) + '"><title>' + esc(label) + "</title>" + (o.animate ? "<style>" + CSS + "</style>" : "") + bg + head + body + "</svg>";
}

// src/charts/spark.js
function spark(o, th) {
  var v = nums(o.values), c = palette(o, th)[0], h = num(o.height, 64);
  var labels = list(o.labels), notes = parseNotes(o, labels);
  var st = statOf(v, o, "last");
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!v.length) return emptyState(th, x0, y0, w, h2);
    var pts = v.length === 1 ? [v[0], v[0]] : v;
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts);
    if (has(o.goal)) {
      mn = Math.min(mn, +o.goal);
      mx = Math.max(mx, +o.goal);
    }
    var pad = (mx - mn || Math.abs(mx) || 1) * 0.12;
    mn -= pad;
    mx += pad;
    var X = function(i) {
      return x0 + i * w / (pts.length - 1);
    };
    var Y = function(n) {
      return y0 + h2 - (n - mn) / (mx - mn) * h2;
    };
    var P = pts.map(function(n, i) {
      return [X(i), Y(n)];
    });
    var d = pathOf(P, bool(o.straight)), g = newId("g"), last = P[P.length - 1];
    var s = '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".32"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>';
    [1 / 3, 2 / 3].forEach(function(f) {
      s += '<line x1="' + x0 + '" x2="' + (x0 + w) + '" y1="' + r2(y0 + h2 * f) + '" y2="' + r2(y0 + h2 * f) + '" stroke="' + th.grid + '" stroke-dasharray="2 4"/>';
    });
    s += '<path d="' + d + "L" + r2(last[0]) + "," + (y0 + h2) + "L" + x0 + "," + (y0 + h2) + 'Z" fill="url(#' + g + ')"' + anim(o, "bzc-a") + "/>";
    s += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1"' + anim(o, "bzc-d") + "/>";
    if (has(o.goal)) s += goalLine(o, th, x0, x0 + w, Y(+o.goal));
    notes.forEach(function(n) {
      if (n.i >= v.length) return;
      var p = P[n.i];
      s += '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="3.5" fill="' + th.fg + '"/>' + text(clamp(p[0], x0 + 30, x0 + w - 30), p[1] - 9, n.text, small(th, 10, 'text-anchor="middle"', th.fg));
    });
    s += '<circle cx="' + r2(last[0]) + '" cy="' + r2(last[1]) + '" r="9" fill="' + c + '" fill-opacity=".25"/><circle cx="' + r2(last[0]) + '" cy="' + r2(last[1]) + '" r="4.5" fill="' + c + '"/>';
    if (bool(o.showValues)) {
      P.forEach(function(p, i) {
        if (i < v.length) s += text(p[0], p[1] - 8, fmt(v[i], o, true), small(th, 9, 'text-anchor="middle"'));
      });
    }
    var step = v.length > 1 ? w / (v.length - 1) : w;
    v.forEach(function(n, i) {
      s += hit(X(i) - step / 2, y0 - 6, step, h2 + 12, (labels[i] || "#" + (i + 1)) + ": " + fmt(n, o));
    });
    return s;
  }, { stat: st, summary: v.length ? "latest " + fmt(v[v.length - 1], o) : "no data" });
}
spark.table = function(o) {
  var labels = list(o.labels);
  return { head: ["Label", "Value"], rows: nums(o.values).map(function(n, i) {
    return [labels[i] || "#" + (i + 1), fmt(n, o)];
  }) };
};

// src/core/themes.js
var THEMES = {
  dark: {
    tile: "#15151d",
    bezel: "#000000",
    fg: "#f2f1f7",
    muted: "#8c8aa0",
    grid: "#2a2935",
    up: "#5EE6C8",
    down: "#F675A8",
    palette: ["#9FA1FF", "#F675A8", "#5EE6C8", "#FFC857", "#7CC4FF", "#FF8A5B"]
  },
  light: {
    tile: "#ffffff",
    bezel: "#000000",
    fg: "#17161f",
    muted: "#6b6980",
    grid: "#e8e6ef",
    up: "#12a383",
    down: "#d63f7c",
    palette: ["#6E70F0", "#E2508C", "#16A884", "#D99A0E", "#2F8FE0", "#EE6431"]
  }
};

// src/render.js
var NAMES = ["spark", "line", "area", "bars", "scatter", "ring", "donut", "gauge", "progress", "heatmap"];
var TYPES = {};
function register(type, fn) {
  TYPES[type] = fn;
}
var camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function prepare(type, options) {
  if (!TYPES[type]) {
    throw new Error(NAMES.includes(type) ? `Bezel Charts: the ${type} chart isn't loaded. Add import 'bezel-charts/${type}', or load dist/charts/${type}.js.` : `Bezel Charts: unknown chart type "${type}". Choose one of: ${NAMES.join(", ")}.`);
  }
  const o = {};
  for (const [k, v] of Object.entries(options)) o[camel(k)] = v;
  return o;
}
function render(type, options = {}) {
  const o = prepare(type, options);
  o.animate = bool(o.animate);
  o.frame = o.frame === "none" ? "none" : "bezel";
  const mode = o.theme === "light" || o.theme === "dark" ? o.theme : o.autoTheme || "dark";
  return TYPES[type](o, THEMES[mode]);
}
function table(type, options = {}) {
  return TYPES[type].table(prepare(type, options));
}
function toStatic(svg) {
  return svg.replace(/<rect class="bzc-hit"[^>]*\/>/g, "").replace(/<circle[^>]* class="bzc-hit"[^>]*\/>/g, "").replace(/ data-tip="[^"]*"/g, "");
}
function toSVG(type, options = {}) {
  return toStatic(render(type, { ...options, animate: false }));
}

// src/element.js
var ATTRIBUTES = [
  "type",
  "values",
  "labels",
  "series",
  "heading",
  "prefix",
  "suffix",
  "decimals",
  "compact",
  "color",
  "theme",
  "frame",
  "width",
  "height",
  "goal",
  "goal-label",
  "notes",
  "show-values",
  "stat",
  "delta",
  "delta-label",
  "max",
  "min",
  "value",
  "zones",
  "horizontal",
  "straight",
  "zero",
  "start",
  "lang",
  "corners",
  "background",
  "center-label",
  "highlight",
  "x",
  "y",
  "x-label",
  "y-label",
  "trend",
  "static",
  "no-tooltips",
  "stacked",
  "angle-labels",
  "dash",
  "markers",
  "patterns"
];
var HOST_CSS = `:host{display:block;position:relative;max-width:100%}:host([hidden]){display:none}svg{display:block;max-width:100%;height:auto;overflow:visible}.tip{position:absolute;left:0;top:0;pointer-events:none;background:#0b0b10;color:#f2f1f7;font:600 12px/1.5 ${MONO};padding:7px 10px;border-radius:10px;white-space:pre;opacity:0;transform:translate(-50%,calc(-100% - 12px));transition:opacity .12s;z-index:3;border:1px solid #2a2935;box-shadow:0 8px 24px rgba(0,0,0,.35)}.tip.on{opacity:1}.c{outline:none}.c:focus-visible{outline:2px solid #fff;outline-offset:3px;box-shadow:0 0 0 7px #000}.k{stroke:currentColor;stroke-width:2;stroke-opacity:1}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@media (forced-colors:active){.c:focus-visible{outline-color:Highlight}}`;
var STEPS = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
var darkQuery = () => typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
var pageTheme = () => {
  const t = typeof document !== "undefined" && document.documentElement?.getAttribute?.("data-theme");
  return t === "light" || t === "dark" ? t : null;
};
var live = /* @__PURE__ */ new Set();
if (typeof MutationObserver === "function" && typeof document !== "undefined" && document.documentElement) {
  new MutationObserver(() => live.forEach((el) => el.refresh())).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
var Base = typeof HTMLElement === "undefined" ? class {
} : HTMLElement;
var BezelChart = class extends Base {
  static get observedAttributes() {
    return ATTRIBUTES;
  }
  /** The default colour sets, so tools like the Studio can show them. */
  static get themes() {
    return THEMES;
  }
  /** Which theme the chart is drawing in right now: "dark" or "light". */
  get resolvedTheme() {
    const t = this.getAttribute("theme");
    return t === "light" || t === "dark" ? t : this.options.autoTheme;
  }
  /** The chart type this tag draws. Subclasses fix it; <bezel-chart> reads its type attribute. */
  get chartType() {
    return this.getAttribute("type") || "spark";
  }
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" }).innerHTML = `<style>${HOST_CSS}</style><div class="c" role="group" aria-roledescription="chart"></div><p class="sr" id="h">Use the arrow keys to step through the values.</p><div class="tip" aria-hidden="true"></div><div class="sr" aria-live="polite"></div><div class="sr"></div>`;
      [, this.#box, , this.#tipEl, this.#live, this.#table] = this.shadowRoot.children;
      this.shadowRoot.addEventListener("pointermove", (e) => this.#tip(e));
      this.shadowRoot.addEventListener("pointerdown", (e) => this.#tip(e));
      this.addEventListener("pointerleave", () => this.#tipEl.classList.remove("on"));
      this.#box.addEventListener("keydown", (e) => this.#key(e));
      this.#box.addEventListener("blur", () => this.#clear());
    }
    live.add(this);
    this.#dark = darkQuery();
    this.#dark?.addEventListener?.("change", this.#onScheme);
    if (typeof ResizeObserver === "function") {
      this.#ro = new ResizeObserver(([entry]) => {
        const w = Math.round(entry.contentRect.width);
        if (!this.#rendered || !this.hasAttribute("width") && w > 0 && Math.abs(w - this.#width) > 1) this.#render();
      });
      this.#ro.observe(this);
    } else {
      this.#render();
    }
  }
  disconnectedCallback() {
    live.delete(this);
    this.#ro?.disconnect();
    this.#dark?.removeEventListener?.("change", this.#onScheme);
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
    o.autoTheme = pageTheme() || (this.#dark ? this.#dark.matches ? "dark" : "light" : "dark");
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
    const url = URL.createObjectURL(new Blob([this.toSVG()], { type: "image/svg+xml" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `${(name || this.getAttribute("heading") || this.chartType).replace(/[^\w-]+/g, "-").toLowerCase()}.svg`
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
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
    const t = this.getAttribute("theme");
    if (!t || t === "auto") this.refresh();
  };
  #render() {
    if (!this.shadowRoot) return;
    const w = Math.round(this.getBoundingClientRect?.().width || 0);
    this.#width = w > 0 ? w : 360;
    const o = this.options;
    o.animate = !this.#rendered && !this.hasAttribute("static");
    let svg, data = null;
    try {
      svg = render(this.chartType, o);
      data = table(this.chartType, o);
    } catch (err) {
      svg = `<p style="font:13px ${SANS};color:#d63f7c">${esc(err.message)}</p>`;
    }
    const box = this.#box;
    box.innerHTML = svg.replace(/<title>[\s\S]*?<\/title>/, "");
    const img = box.querySelector("svg");
    if (img) {
      box.setAttribute("aria-label", img.getAttribute("aria-label"));
      img.removeAttribute("role");
      img.removeAttribute("aria-label");
      img.setAttribute("aria-hidden", "true");
    } else {
      box.removeAttribute("aria-label");
    }
    const keys = !!img && !this.hasAttribute("no-tooltips");
    if (keys) {
      box.setAttribute("tabindex", "0");
      box.setAttribute("aria-describedby", "h");
    } else {
      box.removeAttribute("tabindex");
      box.removeAttribute("aria-describedby");
    }
    box.style.color = THEMES[o.theme === "light" || o.theme === "dark" ? o.theme : o.autoTheme].fg;
    box.style.borderRadius = `${o.frame === "none" ? 4 : clamp(+o.corners || 22, 0, 60)}px`;
    this.#table.innerHTML = data && data.rows.length ? tableHTML(o.heading, data) : "";
    if (this.#at >= 0 && keys && this.shadowRoot.activeElement === box) this.#show(this.#at);
    else this.#at = -1;
    this.#rendered = true;
    this.dispatchEvent(new CustomEvent("bezel-render", { bubbles: true }));
  }
  #tip(e) {
    if (this.hasAttribute("no-tooltips")) return;
    const target = e.target?.closest?.("[data-tip]");
    if (!target) {
      this.#tipEl.classList.remove("on");
      return;
    }
    this.#place(target, e.clientX, e.clientY);
  }
  /** Shows the tooltip for a mark at a point on screen. */
  #place(mark, x, y) {
    const tip = this.#tipEl;
    tip.textContent = mark.getAttribute("data-tip");
    const box = this.getBoundingClientRect?.() || { left: 0, top: 0, width: 0 };
    const half = tip.offsetWidth / 2;
    tip.style.left = `${clamp(x - box.left, half, Math.max(half, box.width - half))}px`;
    tip.style.top = `${y - box.top}px`;
    tip.classList.add("on");
  }
  /** Every value the arrow keys visit, in order. Donuts mark their slices data-skip, as the legend rows repeat them. */
  #marks() {
    return [...this.#box.querySelectorAll("[data-tip]:not([data-skip])")];
  }
  #key(e) {
    const marks = this.#marks(), n = marks.length;
    if (!n) return;
    let i = this.#at, step = STEPS[e.key];
    if (step) {
      if (this.chartType === "heatmap" && /Left|Right/.test(e.key)) step *= 7;
      i = i < 0 ? step > 0 ? 0 : n - 1 : clamp(i + step, 0, n - 1);
    } else if (e.key === "Home" || e.key === "End") {
      i = e.key === "Home" ? 0 : n - 1;
    } else {
      if (e.key === "Escape") this.#clear();
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
    this.#box.querySelector(".k")?.classList.remove("k");
    const mark = marks[i], r = mark.getBoundingClientRect?.() || { left: 0, top: 0, width: 0 };
    mark.classList.add("k");
    this.#at = i;
    this.#place(mark, r.left + r.width / 2, r.top);
    if (say) this.#live.textContent = `${mark.getAttribute("data-tip").replace(/\n/g, ", ")}. ${i + 1} of ${marks.length}`;
  }
  #clear() {
    this.#box.querySelector(".k")?.classList.remove("k");
    this.#tipEl.classList.remove("on");
    this.#live.textContent = "";
    this.#at = -1;
  }
};
function tableHTML(caption, { head, rows }) {
  const cells = (row) => row.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join("");
  return `<table><caption>${esc(caption || "Chart data")}</caption><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cells(r)}</tr>`).join("")}</tbody></table>`;
}
function define(type) {
  if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") return;
  if (!customElements.get(`bezel-${type}`)) {
    customElements.define(`bezel-${type}`, class extends BezelChart {
      get chartType() {
        return type;
      }
    });
  }
  if (!customElements.get("bezel-chart")) customElements.define("bezel-chart", class extends BezelChart {
  });
}

// src/entries/spark.js
register("spark", spark);
define("spark");

// src/core/series.js
function niceScale(min, max, count) {
  if (min === max) {
    if (min === 0) max = 1;
    else {
      var p = Math.abs(min) * 0.1;
      min -= p;
      max += p;
    }
  }
  var step0 = (max - min) / (count || 4);
  var mag = Math.pow(10, Math.floor(Math.log10(step0)));
  var err = step0 / mag;
  var step = (err <= 1 ? 1 : err <= 2 ? 2 : err <= 5 ? 5 : 10) * mag;
  var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (var t = lo; t <= hi + step / 2; t += step) ticks.push(+t.toFixed(10));
  return { lo, hi, ticks };
}
function legend(names, pal, th, x0, y0, w, key, kw) {
  var x = x0, y = y0, s = "", off = kw || 13;
  names.forEach(function(nm, k) {
    var wd = off + tw(nm, 12) + 16;
    if (x > x0 && x + wd - 16 > x0 + w) {
      x = x0;
      y += 20;
    }
    s += (key ? key(k, x, y) : '<circle cx="' + r2(x + 4) + '" cy="' + r2(y + 6) + '" r="4" fill="' + pal[k % pal.length] + '"/>') + text(x + off, y + 10, nm, 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
    x += wd;
  });
  return { svg: s, height: y - y0 + 24 };
}
var DASHES = { solid: "", dashed: "7 5", dotted: "1 5", dashdot: "9 4 1 4" };
var SHAPES = ["circle", "square", "triangle", "diamond"];
var PATTERNS = ["solid", "stripes", "dots", "grid"];
function styleOf(v, names, off) {
  if (v == null || v === false || v === "none" || v === "false") return null;
  var l = v === true || v === "" || v === "auto" ? names : list(v).map(function(s) {
    return names.indexOf(s) < 0 ? off : s;
  });
  if (!l.length) return null;
  return function(k) {
    return l[k % l.length];
  };
}
function marker(kind, x, y, r, attrs) {
  var a = r * 1.15, b = r * 0.85;
  if (kind === "square") return '<rect x="' + r2(x - b) + '" y="' + r2(y - b) + '" width="' + r2(2 * b) + '" height="' + r2(2 * b) + '" rx="1"' + attrs + "/>";
  if (kind === "triangle") return '<path d="M' + r2(x) + "," + r2(y - a) + "L" + r2(x + a) + "," + r2(y + b) + "L" + r2(x - a) + "," + r2(y + b) + 'Z"' + attrs + "/>";
  if (kind === "diamond") return '<path d="M' + r2(x) + "," + r2(y - a * 1.1) + "L" + r2(x + a) + "," + r2(y) + "L" + r2(x) + "," + r2(y + a * 1.1) + "L" + r2(x - a) + "," + r2(y) + 'Z"' + attrs + "/>";
  return '<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="' + r2(r) + '"' + attrs + "/>";
}
function pattern(id, kind, c, bg) {
  var ink = ' stroke="' + bg + '" stroke-opacity=".55" stroke-width="1.5"';
  return '<pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse"' + (kind === "dots" ? "" : ' patternTransform="rotate(45)"') + '><rect width="6" height="6" fill="' + c + '"/>' + (kind === "dots" ? '<circle cx="3" cy="3" r="1.3" fill="' + bg + '" fill-opacity=".55"/>' : '<path d="M3,0V6' + (kind === "grid" ? "M0,3H6" : "") + '"' + ink + "/>") + "</pattern>";
}
function axisWidth(ticks) {
  return Math.max.apply(null, ticks.map(function(t) {
    return tw(t, 10, true);
  })) + 10;
}
function seriesTable(o, total) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), rows = [];
  var n = Math.max.apply(null, [0].concat(S.map(function(s) {
    return s.length;
  })));
  for (var i = 0; i < n; i++) {
    var row = [labels[i] || "#" + (i + 1)], t = 0;
    S.forEach(function(s) {
      row.push(i < s.length ? fmt(s[i], o) : "");
      t += i < s.length ? s[i] : 0;
    });
    if (total) row.push(fmt(t, o));
    rows.push(row);
  }
  var head = S.length > 1 || names.length ? S.map(function(_, k) {
    return names[k] || "Series " + (k + 1);
  }) : ["Value"];
  return { head: ["Label"].concat(head, total ? ["Total"] : []), rows };
}

// src/core/xy.js
function xyFrame(o, th, c, x0, y0, w, h) {
  var s = "", top = y0, n = c.n, labels = c.labels;
  if (c.names) {
    var lg = legend(c.names, c.pal, th, x0, top, w, c.key, c.kw);
    s += lg.svg;
    top += lg.height;
  }
  var mn = c.lo, mx = c.hi;
  if (has(o.goal)) {
    mn = Math.min(mn, +o.goal);
    mx = Math.max(mx, +o.goal);
  }
  if (c.zero) {
    mn = Math.min(0, mn);
    mx = Math.max(0, mx);
  }
  var sc = niceScale(mn, mx, 4);
  var tl = sc.ticks.map(c.tick);
  var axisW = Math.max.apply(null, tl.map(function(t) {
    return tw(t, 10, true);
  })) + 10;
  var bottom = labels.length ? 20 : 4;
  var px = x0 + axisW, pw = w - axisW, ph = h - (top - y0) - bottom;
  var X = function(i2) {
    return n === 1 ? px + pw / 2 : px + i2 * pw / (n - 1);
  };
  var Y = function(v) {
    return top + ph - (v - sc.lo) / (sc.hi - sc.lo) * ph;
  };
  sc.ticks.forEach(function(t, i2) {
    var y = Y(t);
    s += '<line x1="' + r2(px) + '" x2="' + r2(px + pw) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.grid + '"' + (t === 0 ? "" : ' stroke-dasharray="2 4"') + "/>" + text(px - 8, y + 3.5, tl[i2], small(th, 10, 'text-anchor="end"'));
  });
  if (labels.length) {
    var every = Math.max(1, Math.ceil(n * (Math.max.apply(null, labels.map(function(l) {
      return tw(l, 10, true);
    })) + 10) / pw));
    for (var i = 0; i < n; i += every) {
      if (labels[i] == null) continue;
      var anchor = n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle";
      s += text(X(i), top + ph + 15, labels[i], small(th, 10, 'text-anchor="' + anchor + '"'));
    }
  }
  c.notes.forEach(function(nt) {
    if (nt.i >= n) return;
    var x = X(nt.i);
    s += '<line x1="' + r2(x) + '" x2="' + r2(x) + '" y1="' + r2(top + 12) + '" y2="' + r2(top + ph) + '" stroke="' + th.fg + '" stroke-opacity=".4" stroke-dasharray="3 3"/>' + text(clamp(x, px + 30, px + pw - 30), top + 8, nt.text, small(th, 10, 'text-anchor="middle"', th.fg));
  });
  return { svg: s, X, Y, px, pw, top, ph };
}
function xyFinish(o, th, f, n, tip) {
  var s = has(o.goal) ? goalLine(o, th, f.px, f.px + f.pw, f.Y(+o.goal)) : "";
  var step = n > 1 ? f.pw / (n - 1) : f.pw;
  for (var j = 0; j < n; j++) s += hit(f.X(j) - step / 2, f.top, step, f.ph, tip(j));
  return s;
}
function lineKey(pal, dashOf, markOf, bg) {
  return function(k, x, y) {
    var c = pal[k % pal.length], dk = dashOf ? DASHES[dashOf(k)] : "", mk = markOf ? markOf(k) : "none";
    return '<line x1="' + r2(x) + '" x2="' + r2(x + 18) + '" y1="' + r2(y + 6) + '" y2="' + r2(y + 6) + '" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round"' + (dk ? ' stroke-dasharray="' + dk + '"' : "") + "/>" + (mk !== "none" ? marker(mk, x + 9, y + 6, 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"') : "");
  };
}
function seriesLine(o, d, c, k, dk) {
  return dk ? '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + dk + '"' + anim(o, "bzc-a", k * 0.15) + "/>" : '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1' + (o.animate ? ";animation-delay:" + k * 0.15 + "s" : "") + '"' + (o.animate ? ' class="bzc-d"' : "") + "/>";
}
function pointMarks(o, mk, ys, X, Y, c, bg, k) {
  var s = "", every = Math.ceil(ys.length / 40);
  ys.forEach(function(y, i) {
    if (i % every === 0 || i === ys.length - 1) s += marker(mk, X(i), Y(y), 3.5, ' fill="' + c + '" stroke="' + bg + '" stroke-width="1.5"' + anim(o, "bzc-a", 0.6 + k * 0.15));
  });
  return s;
}

// src/charts/line.js
function line(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var h = num(o.height, 170), n = Math.max.apply(null, [0].concat(S.map(function(s) {
    return s.length;
  })));
  var notes = parseNotes(o, labels), multi = S.length > 1 || names.length > 0;
  var st = statOf(S[0] || [], o, "");
  var dashOf = styleOf(o.dash, Object.keys(DASHES), "solid"), markOf = styleOf(o.markers, SHAPES, "none");
  var bg = o.background || th.tile;
  var key = (dashOf || markOf) && lineKey(pal, dashOf, markOf, bg);
  var nameOf = function(k) {
    return names[k] || "Series " + (k + 1);
  };
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!n) return emptyState(th, x0, y0, w, h2);
    var all = [].concat.apply([], S);
    var f = xyFrame(o, th, {
      n,
      names: multi ? S.map(function(_, k) {
        return nameOf(k);
      }) : null,
      pal,
      key,
      kw: key && 24,
      lo: Math.min.apply(null, all),
      hi: Math.max.apply(null, all),
      zero: bool(o.zero),
      labels,
      notes,
      tick: function(t) {
        return fmt(t, o, true);
      }
    }, x0, y0, w, h2);
    var s = f.svg, X = f.X, Y = f.Y, px = f.px, pw = f.pw, top = f.top, ph = f.ph;
    S.forEach(function(v, k) {
      var c = pal[k % pal.length];
      var P = v.map(function(y, i) {
        return [X(i), Y(y)];
      });
      if (P.length === 1) P = [[px, P[0][1]], [px + pw, P[0][1]]];
      var d = pathOf(P, bool(o.straight));
      if (k === 0) {
        var g = newId("g"), last = P[P.length - 1];
        s += '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".26"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs><path d="' + d + "L" + r2(last[0]) + "," + r2(top + ph) + "L" + r2(P[0][0]) + "," + r2(top + ph) + 'Z" fill="url(#' + g + ')"' + anim(o, "bzc-a") + "/>";
      }
      var mk = markOf ? markOf(k) : "none";
      s += seriesLine(o, d, c, k, dashOf ? DASHES[dashOf(k)] : "");
      if (mk !== "none") {
        s += pointMarks(o, mk, v, X, Y, c, bg, k);
      } else {
        var e = P[P.length - 1];
        s += '<circle cx="' + r2(e[0]) + '" cy="' + r2(e[1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>';
      }
      if (bool(o.showValues)) v.forEach(function(y, i) {
        s += text(X(i), Y(y) - 8, fmt(y, o, true), small(th, 9, 'text-anchor="middle"'));
      });
    });
    return s + xyFinish(o, th, f, n, function(j) {
      var tip = labels[j] || "#" + (j + 1);
      S.forEach(function(v, k) {
        if (j < v.length) tip += "\n" + (multi ? nameOf(k) + ": " : "") + fmt(v[j], o);
      });
      return tip;
    });
  }, { stat: st, summary: S.length + " series over " + n + " points" });
}
line.table = function(o) {
  return seriesTable(o);
};

// src/entries/line.js
register("line", line);
define("line");

// src/charts/area.js
function area(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var h = num(o.height, 170), k = S.length, n = Math.max.apply(null, [0].concat(S.map(function(s) {
    return s.length;
  })));
  var mode = k > 1 ? o.stacked === "percent" ? "percent" : bool(o.stacked) ? "stack" : "" : "";
  var notes = parseNotes(o, labels), multi = k > 1 || names.length > 0;
  var nameOf = function(j2) {
    return names[j2] || "Series " + (j2 + 1);
  };
  var val = function(j2, i2) {
    return i2 < S[j2].length ? S[j2][i2] : 0;
  };
  var lows = S.map(function() {
    return [];
  }), highs = S.map(function() {
    return [];
  }), totals = [], pos = [];
  for (var i = 0; i < n; i++) {
    var up = 0, down = 0, t = 0, p = 0;
    for (var j = 0; j < k; j++) {
      t += val(j, i);
      p += Math.max(0, val(j, i));
    }
    totals.push(t);
    pos.push(p);
    for (j = 0; j < k; j++) {
      var v = mode === "percent" ? p ? Math.max(0, val(j, i)) / p * 100 : 0 : val(j, i);
      if (!mode) {
        lows[j].push(0);
        highs[j].push(v);
      } else if (v >= 0) {
        lows[j].push(up);
        up += v;
        highs[j].push(up);
      } else {
        lows[j].push(down);
        down += v;
        highs[j].push(down);
      }
    }
  }
  var edges = [].concat.apply([], lows.concat(highs));
  var dashOf = styleOf(o.dash, Object.keys(DASHES), "solid"), markOf = styleOf(o.markers, SHAPES, "none");
  var patOf = k > 1 ? styleOf(o.patterns, PATTERNS, "solid") : null, bg = o.background || th.tile, defs = "", fills = [];
  for (var q = 0; patOf && q < k; q++) {
    if (patOf(q) === "solid") continue;
    var pid = newId("g");
    defs += pattern(pid, patOf(q), pal[q % pal.length], bg);
    fills[q] = "url(#" + pid + ")";
  }
  var key = patOf ? function(j2, x, y) {
    return '<rect x="' + r2(x) + '" y="' + r2(y + 1) + '" width="10" height="10" rx="2" fill="' + (fills[j2] || pal[j2 % pal.length]) + '"/>';
  } : (dashOf || markOf) && lineKey(pal, dashOf, markOf, bg);
  var share = function(j2, i2) {
    return pos[i2] ? Math.round(Math.max(0, val(j2, i2)) / pos[i2] * 100) : 0;
  };
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!n) return emptyState(th, x0, y0, w, h2);
    var f = xyFrame(o, th, {
      n,
      names: multi ? S.map(function(_, j2) {
        return nameOf(j2);
      }) : null,
      pal,
      key,
      kw: key && (patOf ? 15 : 24),
      lo: Math.min.apply(null, edges),
      hi: Math.max.apply(null, edges),
      zero: true,
      labels,
      notes,
      tick: mode === "percent" ? function(t2) {
        return fmt(t2, { lang: o.lang }, true) + "%";
      } : function(t2) {
        return fmt(t2, o, true);
      }
    }, x0, y0, w, h2);
    var s = (defs ? "<defs>" + defs + "</defs>" : "") + f.svg, X = f.X, Y = f.Y;
    var pts = function(ys) {
      var P = ys.map(function(y, i2) {
        return [X(i2), Y(y)];
      });
      return P.length === 1 ? [[f.px, P[0][1]], [f.px + f.pw, P[0][1]]] : P;
    };
    var straight = bool(o.straight), alpha = mode ? ".8" : ".22";
    var shown = function(j2) {
      return mode ? highs[j2] : S[j2];
    };
    S.forEach(function(_, j2) {
      var top = pts(shown(j2)), base = pts(mode ? lows[j2] : shown(j2).map(function() {
        return 0;
      })).reverse();
      s += '<path d="' + pathOf(top, straight) + pathOf(base, straight).replace(/^M/, "L") + 'Z" fill="' + (fills[j2] || pal[j2 % pal.length]) + '" fill-opacity="' + alpha + '"' + (o.animate ? ' class="bzc-a" style="animation-delay:' + r2(j2 * 0.1) + 's"' : "") + "/>";
    });
    S.forEach(function(_, j2) {
      var c = pal[j2 % pal.length], ys = shown(j2), P = pts(ys), mk = markOf ? markOf(j2) : "none";
      s += seriesLine(o, pathOf(P, straight), c, j2, dashOf ? DASHES[dashOf(j2)] : "");
      if (mk !== "none") s += pointMarks(o, mk, ys, X, Y, c, bg, j2);
      else if (!mode) s += '<circle cx="' + r2(P[P.length - 1][0]) + '" cy="' + r2(P[P.length - 1][1]) + '" r="4" fill="' + c + '" stroke="' + bg + '" stroke-width="2"/>';
      if (bool(o.showValues) && !mode) ys.forEach(function(y, i2) {
        s += text(X(i2), Y(y) - 8, fmt(y, o, true), small(th, 9, 'text-anchor="middle"'));
      });
    });
    if (bool(o.showValues) && mode === "stack") {
      totals.forEach(function(t2, i2) {
        var top = Math.max.apply(null, highs.map(function(hs) {
          return hs[i2];
        }).concat([0]));
        s += text(X(i2), Y(top) - 8, fmt(t2, o, true), small(th, 9, 'text-anchor="middle"'));
      });
    }
    return s + xyFinish(o, th, f, n, function(i2) {
      var tip = labels[i2] || "#" + (i2 + 1);
      S.forEach(function(ser, j2) {
        if (i2 < ser.length) tip += "\n" + (multi ? nameOf(j2) + ": " : "") + fmt(ser[i2], o) + (mode === "percent" ? " (" + share(j2, i2) + "%)" : "");
      });
      return tip + (mode ? "\nTotal: " + fmt(totals[i2], o) : "");
    });
  }, {
    stat: statOf(mode ? totals : S[0] || [], o, ""),
    summary: k + " series " + (mode === "percent" ? "as shares of each total" : mode ? "stacked" : "filled") + " over " + n + " points"
  });
}
area.table = function(o) {
  var S = series(o.values);
  return seriesTable(o, S.length > 1 && (o.stacked === "percent" || bool(o.stacked)));
};

// src/entries/area.js
register("area", area);
define("area");

// src/charts/bars.js
var ANGLE = 40;
var ANGLE_MAX_CHARS = 24;
function bars(o, th) {
  var S = series(o.values), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var k = S.length, n = Math.max.apply(null, [0].concat(S.map(function(s) {
    return s.length;
  })));
  var grouped = k > 1, horiz = bool(o.horizontal), stacked = grouped && bool(o.stacked);
  var many = !grouped && list(o.color).filter(Boolean).length > 1;
  var v0 = S[0] || [], all = [].concat.apply([], S);
  var sumOf = function(i, sign) {
    return S.reduce(function(t2, s) {
      return i < s.length && s[i] * sign > 0 ? t2 + s[i] : t2;
    }, 0);
  };
  var totals = [], ups = [], downs = [];
  for (var t = 0; stacked && t < n; t++) {
    ups.push(sumOf(t, 1));
    downs.push(sumOf(t, -1));
    totals.push(ups[t] + downs[t]);
  }
  var scale = stacked ? ups.concat(downs) : all;
  var top = scale.length ? Math.max.apply(null, scale) : 0;
  var nameOf = function(j) {
    return names[j] || "Series " + (j + 1);
  };
  var patOf = grouped ? styleOf(o.patterns, PATTERNS, "solid") : null, defs = "", fills = [];
  for (var p = 0; patOf && p < k; p++) {
    if (patOf(p) === "solid") continue;
    var pid = newId("g");
    defs += pattern(pid, patOf(p), pal[p % pal.length], o.background || th.tile);
    fills[p] = "url(#" + pid + ")";
  }
  var colourOf = function(j, i) {
    return grouped ? fills[j] || pal[j % pal.length] : many ? pal[i % pal.length] : pal[0];
  };
  var key = patOf && function(j, x, y) {
    return '<rect x="' + r2(x) + '" y="' + r2(y + 1) + '" width="10" height="10" rx="2" fill="' + colourOf(j) + '"/>';
  };
  var opac = function(val) {
    return grouped || many || o.highlight === "none" || val === top ? 1 : 0.5;
  };
  var labelOf = function(i) {
    return labels[i] || "#" + (i + 1);
  };
  var tipOf = function(i) {
    if (!grouped) return labelOf(i) + ": " + fmt(v0[i], o);
    return labelOf(i) + S.map(function(s, j) {
      return i < s.length ? "\n" + nameOf(j) + ": " + fmt(s[i], o) : "";
    }).join("") + (stacked ? "\nTotal: " + fmt(totals[i], o) : "");
  };
  var d0 = dims(o);
  var legendH = grouped || names.length ? legend(S.map(function(_, j) {
    return nameOf(j);
  }), pal, th, 0, 0, d0.w, key, key && 15).height : 0;
  var rows = stacked ? 1 : k, thin = grouped && !stacked;
  var subH = thin ? 10 : 14, subGap = 3;
  var rowH = horiz ? rows * subH + (rows - 1) * subGap + (thin ? 14 : 16) : 0;
  var h = horiz ? legendH + Math.max(1, n) * rowH - 6 : num(o.height, 140) + legendH;
  var best = v0.indexOf(Math.max.apply(null, v0.length ? v0 : [0]));
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!n) return emptyState(th, x0, y0, w, h2);
    var s = defs ? "<defs>" + defs + "</defs>" : "", top0 = y0;
    if (legendH) {
      s += legend(S.map(function(_, j) {
        return nameOf(j);
      }), pal, th, x0, y0, w, key, key && 15).svg;
      top0 += legendH;
    }
    var lo = Math.min(0, Math.min.apply(null, scale)), hi = Math.max(0, top);
    if (has(o.goal)) {
      lo = Math.min(lo, +o.goal);
      hi = Math.max(hi, +o.goal);
    }
    if (hi === lo) hi = lo + 1;
    if (horiz) {
      var labW = labels.length ? Math.min(w * 0.4, Math.max.apply(null, labels.map(function(l) {
        return tw(l, 12);
      })) + 10) : 0;
      var vals = stacked ? [totals.map(function(x) {
        return fmt(x, o);
      })] : S.map(function(s2) {
        return s2.map(function(x) {
          return fmt(x, o);
        });
      });
      var valW = Math.max.apply(null, [].concat.apply([], vals).map(function(t2) {
        return tw(t2, thin ? 10 : 11, true);
      })) + 10;
      var bx = x0 + labW, bw = w - labW - valW, span = Math.max(hi, 0) || 1;
      for (var i = 0; i < n; i++) {
        var ry = top0 + i * rowH;
        if (labels[i] != null) s += text(x0, ry + (rowH - 6) / 2 + 4, trunc(labels[i], Math.floor(labW / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
        if (stacked) {
          s += stackRow(i, bx, ry + 5, bw, span);
          s += text(x0 + w, ry + 5 + subH / 2 + 3.8, vals[0][i], 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
        } else {
          S.forEach(function(ser, j) {
            if (i >= ser.length) return;
            var val = ser[i], by = ry + (grouped ? 2 : 5) + j * (subH + subGap), len = Math.max(0, val) / span * bw;
            if (!grouped) s += '<rect x="' + r2(bx) + '" y="' + r2(by) + '" width="' + r2(bw) + '" height="' + subH + '" rx="' + subH / 2 + '" fill="' + th.grid + '" fill-opacity=".6"/>';
            if (len > 0) {
              s += '<rect x="' + r2(bx) + '" y="' + r2(by) + '" width="' + r2(Math.max(subH, len)) + '" height="' + subH + '" rx="' + subH / 2 + '" fill="' + colourOf(j, i) + '" fill-opacity="' + opac(val) + '"' + anim(o, "bzc-gx", i * 0.06 + j * 0.03) + "/>";
            }
            s += text(x0 + w, by + subH / 2 + 3.8, vals[j][i], 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="' + (grouped ? 10 : 11) + '" font-weight="600"');
          });
        }
        s += hit(x0, ry, w, rowH - 6, tipOf(i));
      }
      if (has(o.goal) && +o.goal > 0) {
        var gx = bx + +o.goal / span * bw;
        s += '<line x1="' + r2(gx) + '" x2="' + r2(gx) + '" y1="' + r2(top0 - 2) + '" y2="' + r2(y0 + h2 + 2) + '" stroke="' + th.fg + '" stroke-opacity=".55" stroke-dasharray="3 3"/>';
      }
      return s;
    }
    function stackRow(i2, bx2, by, bw2, span2) {
      var out = '<rect x="' + r2(bx2) + '" y="' + r2(by) + '" width="' + r2(bw2) + '" height="' + subH + '" rx="' + subH / 2 + '" fill="' + th.grid + '" fill-opacity=".6"/>';
      var at = 0;
      S.forEach(function(ser, j) {
        var val = i2 < ser.length ? ser[i2] : 0, len = Math.max(0, val) / span2 * bw2;
        if (len <= 0) return;
        var gapL = at > 0 ? 1.5 : 0;
        out += '<rect x="' + r2(bx2 + at + gapL) + '" y="' + r2(by) + '" width="' + r2(Math.max(2, len - gapL)) + '" height="' + subH + '" rx="' + r2(Math.min(3, len / 2)) + '" fill="' + colourOf(j, i2) + '"' + anim(o, "bzc-gx", i2 * 0.06 + j * 0.03) + "/>";
        at += len;
      });
      return out;
    }
    var labMax = labels.length ? Math.max.apply(null, labels.map(function(l) {
      return tw(l, 10, true);
    })) : 0;
    var every = labels.length ? Math.max(1, Math.ceil(n * (labMax + 8) / w)) : 1;
    var angled = bool(o.angleLabels) && every > 1, rad = ANGLE * Math.PI / 180;
    var labText = function(l) {
      return angled ? trunc(l, ANGLE_MAX_CHARS) : l;
    };
    if (angled) {
      var slot0 = w / n, lead = 0;
      labels.forEach(function(l, c2) {
        lead = Math.max(lead, Math.cos(rad) * tw(labText(l), 10, true) + 4 - (c2 + 0.5) * slot0);
      });
      lead = Math.min(lead, w * 0.25);
      x0 += lead;
      w -= lead;
      every = 1;
    }
    var negLab = bool(o.showValues) && lo < 0 ? 14 : 0;
    var labDrop = angled ? Math.ceil(Math.sin(rad) * Math.min(labMax, tw("x".repeat(ANGLE_MAX_CHARS), 10, true))) + 18 : 20;
    var bottom = (labels.length ? labDrop : 2) + negLab, topPad = bool(o.showValues) ? 16 : 4;
    var ph = h2 - (top0 - y0) - bottom - topPad, py = top0 + topPad;
    var Y = function(x) {
      return py + ph - (x - lo) / (hi - lo) * ph;
    };
    var slot = w / n, groupW = Math.min(slot * (thin ? 0.78 : 0.62), thin ? k * 30 : 56);
    var gap = thin ? Math.min(3, groupW / k * 0.15) : 0, bwid = stacked ? groupW : (groupW - gap * (k - 1)) / k, Y0 = Y(0);
    s += '<line x1="' + x0 + '" x2="' + (x0 + w) + '" y1="' + r2(Y0) + '" y2="' + r2(Y0) + '" stroke="' + th.grid + '"/>';
    for (var c = 0; c < n; c++) {
      var gx0 = x0 + c * slot + (slot - groupW) / 2;
      if (stacked) {
        s += stackColumn(c, gx0);
      } else {
        S.forEach(function(ser, j) {
          if (c >= ser.length) return;
          var val = ser[c], x = gx0 + j * (bwid + gap), y = Math.min(Y(val), Y0), bh = Math.abs(Y(val) - Y0);
          if (bh > 0.5) {
            s += '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(bwid) + '" height="' + r2(bh) + '" rx="' + r2(Math.min(6, bwid / 2, bh / 2)) + '" fill="' + colourOf(j, c) + '" fill-opacity="' + opac(val) + '"' + anim(o, val < 0 ? "bzc-gn" : "bzc-g", c * 0.05 + j * 0.03) + "/>";
          }
          if (bool(o.showValues)) {
            s += text(
              x + bwid / 2,
              val < 0 ? Y(val) + 12 : Y(val) - 5,
              fmt(val, o, true),
              'text-anchor="middle" fill="' + th.fg + '" font-family="' + MONO + '" font-size="' + (grouped ? 9 : 10) + '" font-weight="600"'
            );
          }
        });
      }
      if (labels[c] != null && c % every === 0) {
        var lx = gx0 + groupW / 2, ly = py + ph + negLab + (angled ? 12 : 15);
        s += angled ? text(lx, ly, labText(labels[c]), small(th, 10, 'text-anchor="end" transform="rotate(-' + ANGLE + " " + r2(lx) + " " + r2(ly) + ')"')) : text(lx, ly, labels[c], small(th, 10, 'text-anchor="middle"'));
      }
      s += hit(x0 + c * slot, top0, slot, h2 - (top0 - y0), tipOf(c));
    }
    if (has(o.goal)) s += goalLine(o, th, x0, x0 + w, Y(+o.goal));
    return s;
    function stackColumn(c2, x) {
      var out = "", up = 0, down = 0;
      S.forEach(function(ser, j) {
        var val = c2 < ser.length ? ser[c2] : 0;
        if (!val) return;
        var from = val > 0 ? up : down, to = from + val;
        if (val > 0) up = to;
        else down = to;
        var yA = Y(Math.max(from, to)), yB = Y(Math.min(from, to)), bh = yB - yA;
        var gapZ = from !== 0 ? Math.min(1.5, bh / 2) : 0;
        if (val > 0) yB -= gapZ;
        else yA += gapZ;
        bh = yB - yA;
        if (bh > 0.5) {
          out += '<rect x="' + r2(x) + '" y="' + r2(yA) + '" width="' + r2(bwid) + '" height="' + r2(bh) + '" rx="' + r2(Math.min(3, bwid / 2, bh / 2)) + '" fill="' + colourOf(j, c2) + '"' + anim(o, val < 0 ? "bzc-gn" : "bzc-g", c2 * 0.05 + j * 0.03) + "/>";
        }
      });
      if (bool(o.showValues)) {
        var tot = totals[c2];
        out += text(
          x + bwid / 2,
          tot < 0 ? Y(downs[c2]) + 12 : Y(ups[c2]) - 5,
          fmt(tot, o, true),
          'text-anchor="middle" fill="' + th.fg + '" font-family="' + MONO + '" font-size="10" font-weight="600"'
        );
      }
      return out;
    }
  }, {
    stat: statOf(v0, o, ""),
    summary: !n ? "no data" : stacked ? k + " series stacked across " + n + " groups" : grouped ? k + " series across " + n + " groups" : "highest " + (labels[best] || "") + " " + fmt(v0[best], o)
  });
}
bars.table = function(o) {
  return seriesTable(o, series(o.values).length > 1 && bool(o.stacked));
};

// src/entries/bars.js
register("bars", bars);
define("bars");

// src/charts/scatter.js
function fit(xs, ys) {
  var n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  var mx = 0, my = 0, i;
  for (i = 0; i < n; i++) {
    mx += xs[i];
    my += ys[i];
  }
  mx /= n;
  my /= n;
  var sxx = 0, syy = 0, sxy = 0;
  for (i = 0; i < n; i++) {
    sxx += (xs[i] - mx) * (xs[i] - mx);
    syy += (ys[i] - my) * (ys[i] - my);
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (!sxx) return null;
  var slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r: syy ? sxy / Math.sqrt(sxx * syy) : 0 };
}
function scatter(o, th) {
  var X = series(o.x), Y = series(o.y), names = list(o.series), labels = list(o.labels), pal = palette(o, th);
  var groups = [];
  for (var g = 0; g < Math.max(X.length, Y.length); g++) {
    var xs = X[g] || [], ys = Y[g] || [], m = Math.min(xs.length, ys.length);
    groups.push({ xs: xs.slice(0, m), ys: ys.slice(0, m) });
  }
  groups = groups.filter(function(gr) {
    return gr.xs.length;
  });
  var count = groups.reduce(function(a, gr) {
    return a + gr.xs.length;
  }, 0);
  var h = num(o.height, 210), multi = groups.length > 1 || names.length > 0, trend = bool(o.trend);
  var nameOf = function(j) {
    return names[j] || "Group " + (j + 1);
  };
  var xo = { decimals: o.decimals, compact: o.compact, lang: o.lang };
  var notes = parseNotes(o, labels);
  var markOf = styleOf(o.markers, SHAPES, "circle"), bg = o.background || th.tile;
  var shapeOf = function(j) {
    var m2 = markOf ? markOf(j) : "circle";
    return m2 === "none" ? "circle" : m2;
  };
  var key = markOf && function(j, x, y) {
    return marker(shapeOf(j), x + 4, y + 6, 4, ' fill="' + pal[j % pal.length] + '"');
  };
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!count) return emptyState(th, x0, y0, w, h2);
    var s = "", top = y0;
    if (multi) {
      var lg = legend(groups.map(function(_, j) {
        return nameOf(j);
      }), pal, th, x0, top, w, key);
      s += lg.svg;
      top += lg.height;
    }
    var ax = [].concat.apply([], groups.map(function(gr) {
      return gr.xs;
    }));
    var ay = [].concat.apply([], groups.map(function(gr) {
      return gr.ys;
    }));
    var ymin = Math.min.apply(null, ay), ymax = Math.max.apply(null, ay);
    if (has(o.goal)) {
      ymin = Math.min(ymin, +o.goal);
      ymax = Math.max(ymax, +o.goal);
    }
    if (bool(o.zero)) {
      ymin = Math.min(0, ymin);
      ymax = Math.max(0, ymax);
    }
    var sy = niceScale(ymin, ymax, 4), sx = niceScale(Math.min.apply(null, ax), Math.max.apply(null, ax), 5);
    var tly = sy.ticks.map(function(t) {
      return fmt(t, o, true);
    });
    var axisW = axisWidth(tly) + (has(o.yLabel) ? 14 : 0);
    var bottom = 20 + (has(o.xLabel) ? 16 : 0);
    var px = x0 + axisW, pw = w - axisW, ph = h2 - (top - y0) - bottom;
    var PX = function(v) {
      return px + 6 + (v - sx.lo) / (sx.hi - sx.lo) * (pw - 12);
    };
    var PY = function(v) {
      return top + 6 + ph - 6 - (v - sy.lo) / (sy.hi - sy.lo) * (ph - 6);
    };
    sy.ticks.forEach(function(t, i) {
      var y = PY(t);
      s += '<line x1="' + r2(px) + '" x2="' + r2(px + pw) + '" y1="' + r2(y) + '" y2="' + r2(y) + '" stroke="' + th.grid + '" stroke-dasharray="2 4"/>' + text(px - 8, y + 3.5, tly[i], small(th, 10, 'text-anchor="end"'));
    });
    var every = Math.max(1, Math.ceil(sx.ticks.length * 44 / pw));
    sx.ticks.forEach(function(t, i) {
      if (i % every) return;
      var x = PX(t);
      s += '<line x1="' + r2(x) + '" x2="' + r2(x) + '" y1="' + r2(top) + '" y2="' + r2(top + ph) + '" stroke="' + th.grid + '" stroke-dasharray="2 4"/>' + text(x, top + ph + 15, fmt(t, xo, true), small(th, 10, 'text-anchor="middle"'));
    });
    if (has(o.xLabel)) s += text(px + pw / 2, top + ph + 32, o.xLabel, small(th, 10, 'text-anchor="middle" font-weight="600"'));
    if (has(o.yLabel)) {
      var cy = top + ph / 2;
      s += '<text x="' + r2(x0 + 4) + '" y="' + r2(cy) + '" transform="rotate(-90 ' + r2(x0 + 4) + " " + r2(cy) + ')" text-anchor="middle" ' + small(th, 10, 'font-weight="600"') + ' dominant-baseline="hanging">' + String(o.yLabel).replace(/[&<>"]/g, function(c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      }) + "</text>";
    }
    if (has(o.goal)) s += goalLine(o, th, px, px + pw, PY(+o.goal));
    if (trend) {
      groups.forEach(function(gr, j) {
        var f = fit(gr.xs, gr.ys);
        if (!f) return;
        var xa = Math.min.apply(null, gr.xs), xb = Math.max.apply(null, gr.xs);
        var ya = f.slope * xa + f.intercept, yb = f.slope * xb + f.intercept;
        var c = pal[j % pal.length];
        s += '<line x1="' + r2(PX(xa)) + '" y1="' + r2(clamp(PY(ya), top, top + ph)) + '" x2="' + r2(PX(xb)) + '" y2="' + r2(clamp(PY(yb), top, top + ph)) + '" stroke="' + c + '" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round" stroke-opacity=".9"/>';
        s += text(Math.min(PX(xb), px + pw) - 2, clamp(PY(yb), top + 10, top + ph) - 7, "r = " + f.r.toFixed(2), small(th, 10, 'text-anchor="end" font-weight="600"', c));
      });
    }
    var idx = 0, r = count > 150 ? 3 : 4.5;
    groups.forEach(function(gr, j) {
      var c = pal[j % pal.length];
      gr.xs.forEach(function(xv, i) {
        var cx = PX(xv), cy2 = PY(gr.ys[i]);
        var tip = (labels[idx] ? labels[idx] + "\n" : multi ? nameOf(j) + "\n" : "") + (has(o.xLabel) ? o.xLabel : "x") + ": " + fmt(xv, xo) + "\n" + (has(o.yLabel) ? o.yLabel : "y") + ": " + fmt(gr.ys[i], o);
        s += marker(shapeOf(j), cx, cy2, r, ' fill="' + c + '" fill-opacity=".85" stroke="' + bg + '" stroke-width="1.5"' + (o.animate ? ' class="bzc-a" style="animation-delay:' + r2(Math.min(0.8, idx * 0.012)) + 's"' : ""));
        s += hit(cx - 8, cy2 - 8, 16, 16, tip);
        idx++;
      });
    });
    var flat = [];
    groups.forEach(function(gr) {
      gr.xs.forEach(function(xv, i) {
        flat.push([PX(xv), PY(gr.ys[i])]);
      });
    });
    notes.forEach(function(nt) {
      var p = flat[nt.i];
      if (!p) return;
      s += '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="' + (r + 4) + '" fill="none" stroke="' + th.fg + '" stroke-width="1.5"/>' + text(clamp(p[0], px + 30, px + pw - 30), p[1] - r - 9, nt.text, small(th, 10, 'text-anchor="middle"', th.fg));
    });
    return s;
  }, { summary: count + " points" + (multi ? " in " + groups.length + " groups" : "") });
}
scatter.table = function(o) {
  var X = series(o.x), Y = series(o.y), names = list(o.series), labels = list(o.labels), multi = X.length > 1 || names.length > 0;
  var xo = { decimals: o.decimals, compact: o.compact, lang: o.lang }, rows = [], idx = 0;
  X.forEach(function(xs, g) {
    var ys = Y[g] || [];
    for (var i = 0; i < Math.min(xs.length, ys.length); i++, idx++) {
      rows.push([labels[idx] || "#" + (idx + 1)].concat(multi ? [names[g] || "Group " + (g + 1)] : [], [fmt(xs[i], xo), fmt(ys[i], o)]));
    }
  });
  return { head: ["Point"].concat(multi ? ["Group"] : [], [has(o.xLabel) ? o.xLabel : "x", has(o.yLabel) ? o.yLabel : "y"]), rows };
};

// src/entries/scatter.js
register("scatter", scatter);
define("scatter");

// src/charts/ring.js
function ring(o, th) {
  var v = nums(o.values), labels = list(o.labels), pal = palette(o, th);
  var max = num(o.max, 100) || 100, h = num(o.height, 140);
  var auto = !has(o.prefix) && !has(o.suffix) && max === 100;
  var show = function(n) {
    return fmt(n, o) + (auto ? "%" : "");
  };
  var st = statOf(v, o, "");
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!v.length) return emptyState(th, x0, y0, w, h2);
    var s = "", single = v.length === 1;
    var size = Math.min(h2, single ? w : w * 0.55);
    var cx = single ? x0 + w / 2 : x0 + size / 2, cy = y0 + h2 / 2;
    var sw = single ? size * 0.12 : clamp(size * 0.42 / (v.length * 1.35), 5, 16), gap = sw * 0.38;
    v.forEach(function(n, i) {
      var r = size / 2 - sw / 2 - i * (sw + gap);
      if (r <= sw / 2) return;
      var pct = clamp(n / max * 100, 0, 100), c = pal[i % pal.length];
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="' + c + '" stroke-opacity=".16" stroke-width="' + r2(sw) + '"/>';
      if (pct > 0) s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="' + c + '" stroke-width="' + r2(sw) + '" stroke-linecap="round" pathLength="100" transform="rotate(-90 ' + r2(cx) + " " + r2(cy) + ')" style="stroke-dasharray:' + r2(pct) + " 100" + (o.animate ? ";animation-delay:" + i * 0.12 + "s" : "") + '"' + (o.animate ? ' class="bzc-s"' : "") + "/>";
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r + sw / 2) + '" fill="#000" fill-opacity="0" class="bzc-hit" data-tip="' + esc((labels[i] || "#" + (i + 1)) + ": " + show(n) + (auto ? "" : " of " + fmt(max, o))) + '"/>';
    });
    if (single) {
      s += text(cx, cy + size * 0.08, show(v[0]), 'text-anchor="middle" fill="' + th.fg + '" font-family="' + SANS + '" font-size="' + r2(size * 0.22) + '" font-weight="800"');
      if (labels[0]) s += text(cx, cy + size * 0.08 + 16, labels[0], small(th, 10, 'text-anchor="middle"'));
    } else {
      var lx = x0 + size + 22, rowH = Math.min(26, h2 / v.length), ly = cy - rowH * v.length / 2;
      v.forEach(function(n, i) {
        var y = ly + i * rowH + rowH / 2;
        s += '<circle cx="' + r2(lx + 4) + '" cy="' + r2(y) + '" r="4" fill="' + pal[i % pal.length] + '"/>' + text(lx + 14, y + 4, trunc(labels[i] || "#" + (i + 1), Math.floor((x0 + w - lx - 60) / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"') + text(x0 + w, y + 4, show(n), 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
      });
    }
    return s;
  }, { stat: st, summary: v.map(function(n, i) {
    return (labels[i] ? labels[i] + " " : "") + show(n);
  }).join(", ") });
}
ring.table = function(o) {
  var labels = list(o.labels), max = num(o.max, 100) || 100, auto = !has(o.prefix) && !has(o.suffix) && max === 100;
  return { head: ["Label", "Value"], rows: nums(o.values).map(function(n, i) {
    return [labels[i] || "#" + (i + 1), fmt(n, o) + (auto ? "%" : " of " + fmt(max, o))];
  }) };
};

// src/entries/ring.js
register("ring", ring);
define("ring");

// src/charts/donut.js
function donut(o, th) {
  var raw = nums(o.values).map(function(n) {
    return Math.max(0, n);
  }), lab = list(o.labels), pal = palette(o, th);
  var v = raw.slice(), labels = lab.slice();
  if (v.length > 6) {
    var idx = v.map(function(n, i) {
      return i;
    }).sort(function(a, b) {
      return raw[b] - raw[a];
    });
    var keep = idx.slice(0, 5).sort(function(a, b) {
      return a - b;
    });
    v = keep.map(function(i) {
      return raw[i];
    });
    labels = keep.map(function(i) {
      return lab[i] || "#" + (i + 1);
    });
    v.push(sum(idx.slice(5).map(function(i) {
      return raw[i];
    })));
    labels.push("Other");
  }
  var total = sum(v), h = num(o.height, 150);
  var st = statOf(v, o, "");
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!total) return emptyState(th, x0, y0, w, h2);
    var s = "", size = Math.min(h2, w * 0.5), cx = x0 + size / 2, cy = y0 + h2 / 2;
    var sw = size * 0.16, r = (size - sw) / 2, start = 0, gap = v.filter(Boolean).length > 1 ? 0.9 : 0;
    v.forEach(function(n, i) {
      var len = n / total * 100;
      if (len <= 0) return;
      var seg = Math.max(0.01, len - gap);
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="' + pal[i % pal.length] + '" stroke-width="' + r2(sw) + '" pathLength="100" stroke-dasharray="' + r2(seg) + " " + r2(100 - seg) + '" stroke-dashoffset="' + r2(-start) + '" transform="rotate(-90 ' + r2(cx) + " " + r2(cy) + ')"' + anim(o, "bzc-a", i * 0.08) + "/>";
      start += len;
    });
    s += text(cx, cy + 2, fmt(total, o, true), 'text-anchor="middle" fill="' + th.fg + '" font-family="' + SANS + '" font-size="' + r2(size * 0.17) + '" font-weight="800"');
    s += text(cx, cy + 2 + 14, (has(o.centerLabel) ? o.centerLabel : "Total").toUpperCase(), small(th, 9, 'text-anchor="middle" letter-spacing="1"'));
    var lx = x0 + size + 22, rowH = Math.min(24, h2 / v.length), ly = cy - rowH * v.length / 2;
    v.forEach(function(n, i) {
      var y = ly + i * rowH + rowH / 2, pct = Math.round(n / total * 100);
      var tip = (labels[i] || "#" + (i + 1)) + ": " + fmt(n, o) + " (" + pct + "%)";
      s += '<circle cx="' + r2(lx + 4) + '" cy="' + r2(y) + '" r="4" fill="' + pal[i % pal.length] + '"/>' + text(lx + 14, y + 4, trunc(labels[i] || "#" + (i + 1), Math.floor((x0 + w - lx - 50) / 6.7)), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"') + text(x0 + w, y + 4, pct + "%", 'text-anchor="end" fill="' + th.muted + '" font-family="' + MONO + '" font-size="11" font-weight="600"') + hit(lx, y - rowH / 2, x0 + w - lx, rowH, tip);
    });
    start = 0;
    v.forEach(function(n, i) {
      var len = n / total * 100;
      if (len <= 0) return;
      s += '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="none" stroke="#000" stroke-opacity="0" stroke-width="' + r2(sw) + '" pathLength="100" stroke-dasharray="' + r2(len) + " " + r2(100 - len) + '" stroke-dashoffset="' + r2(-start) + '" transform="rotate(-90 ' + r2(cx) + " " + r2(cy) + ')" class="bzc-hit" data-skip="" data-tip="' + esc((labels[i] || "#" + (i + 1)) + ": " + fmt(n, o) + " (" + Math.round(len) + "%)") + '"/>';
      start += len;
    });
    return s;
  }, { stat: st, summary: "total " + fmt(total, o) + " across " + v.length + " parts" });
}
donut.table = function(o) {
  var v = nums(o.values).map(function(n) {
    return Math.max(0, n);
  }), labels = list(o.labels), total = sum(v);
  return { head: ["Label", "Value", "Share"], rows: v.map(function(n, i) {
    return [labels[i] || "#" + (i + 1), fmt(n, o), (total ? Math.round(n / total * 100) : 0) + "%"];
  }) };
};

// src/entries/donut.js
register("donut", donut);
define("donut");

// src/charts/gauge.js
function gauge(o, th) {
  var v = nums(o.values), val = v.length ? v[0] : num(o.value, NaN), labels = list(o.labels);
  var mn = num(o.min, 0), mx = num(o.max, 100), h = num(o.height, 130);
  if (mx === mn) mx = mn + 1;
  var zones = nums(o.zones), pal = palette(o, th);
  var zc = list(o.color).filter(Boolean).length > 1 ? pal : [th.up, th.palette[3], th.down];
  var colour = pal[0];
  if (zones.length && isFinite(val)) {
    var z = 0;
    while (z < zones.length && val >= zones[z]) z++;
    colour = zc[Math.min(z, zc.length - 1)];
  }
  var auto = !has(o.prefix) && !has(o.suffix) && mn === 0 && mx === 100;
  var show = function(n) {
    return fmt(n, o) + (auto ? "%" : "");
  };
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!isFinite(val)) return emptyState(th, x0, y0, w, h2);
    var R = Math.min(w / 2, h2 - 22), sw = R * 0.16, r = R - sw / 2, cx = x0 + w / 2, cy = y0 + R;
    var t = clamp((val - mn) / (mx - mn), 0, 1);
    var pt = function(f, rr) {
      var a = Math.PI * (1 - f);
      return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
    };
    var arc = "M" + r2(cx - r) + "," + r2(cy) + "A" + r2(r) + "," + r2(r) + " 0 0 1 " + r2(cx + r) + "," + r2(cy);
    var s = '<path d="' + arc + '" fill="none" stroke="' + colour + '" stroke-opacity=".16" stroke-width="' + r2(sw) + '" stroke-linecap="round"/>';
    if (zones.length) zones.forEach(function(zv) {
      var f = clamp((zv - mn) / (mx - mn), 0, 1), a = pt(f, r - sw / 2 - 3), b = pt(f, r - sw / 2 - 8);
      s += '<line x1="' + r2(a[0]) + '" y1="' + r2(a[1]) + '" x2="' + r2(b[0]) + '" y2="' + r2(b[1]) + '" stroke="' + th.muted + '" stroke-width="1.5"/>';
    });
    if (t > 0) s += '<path d="' + arc + '" fill="none" stroke="' + colour + '" stroke-width="' + r2(sw) + '" stroke-linecap="round" pathLength="100" style="stroke-dasharray:' + r2(t * 100) + ' 100"' + anim(o, "bzc-s") + "/>";
    var e = pt(t, r);
    s += '<circle cx="' + r2(e[0]) + '" cy="' + r2(e[1]) + '" r="' + r2(sw * 0.26) + '" fill="' + (o.background || th.tile) + '"' + anim(o, "bzc-a", 0.9) + "/>";
    if (has(o.goal)) {
      var gf = clamp((+o.goal - mn) / (mx - mn), 0, 1), g1 = pt(gf, r + sw / 2 + 4), g2 = pt(gf, r - sw / 2 - 4);
      s += '<line x1="' + r2(g1[0]) + '" y1="' + r2(g1[1]) + '" x2="' + r2(g2[0]) + '" y2="' + r2(g2[1]) + '" stroke="' + th.fg + '" stroke-width="2" stroke-linecap="round"/>';
    }
    s += text(cx, cy - R * 0.12, show(val), 'text-anchor="middle" fill="' + th.fg + '" font-family="' + SANS + '" font-size="' + r2(R * 0.34) + '" font-weight="800"');
    if (labels[0]) s += text(cx, cy - R * 0.12 + 16, labels[0], small(th, 10, 'text-anchor="middle"'));
    s += text(cx - r, cy + 18, fmt(mn, o, true), small(th, 10, 'text-anchor="middle"')) + text(cx + r, cy + 18, fmt(mx, o, true), small(th, 10, 'text-anchor="middle"'));
    s += hit(cx - R, cy - R, R * 2, R, (labels[0] ? labels[0] + ": " : "") + show(val) + " (range " + fmt(mn, o) + " to " + fmt(mx, o) + ")" + (has(o.goal) ? "\nGoal: " + fmt(+o.goal, o) : ""));
    return s;
  }, { summary: isFinite(val) ? show(val) + " on a scale of " + fmt(mn, o) + " to " + fmt(mx, o) : "no data" });
}
gauge.table = function(o) {
  var v = nums(o.values), val = v.length ? v[0] : num(o.value, NaN), labels = list(o.labels);
  var mn = num(o.min, 0), mx = num(o.max, 100), auto = !has(o.prefix) && !has(o.suffix) && mn === 0 && mx === 100;
  if (!isFinite(val)) return { head: ["Label", "Value"], rows: [] };
  return { head: ["Label", "Value"], rows: [[labels[0] || "Reading", fmt(val, o) + (auto ? "%" : "")], ["Lowest", fmt(mn, o)], ["Highest", fmt(mx, o)]].concat(has(o.goal) ? [["Goal", fmt(+o.goal, o)]] : []) };
};

// src/entries/gauge.js
register("gauge", gauge);
define("gauge");

// src/charts/progress.js
function progress(o, th) {
  var v = nums(o.values).map(function(n) {
    return Math.max(0, n);
  }), labels = list(o.labels), pal = palette(o, th);
  var single = v.length === 1, total = sum(v);
  var max = has(o.max) ? num(o.max, 100) : single ? 100 : total;
  if (!(max > 0)) max = 1;
  var auto = !has(o.prefix) && !has(o.suffix) && max === 100 && single;
  var show = function(n) {
    return fmt(n, o) + (auto ? "%" : "");
  };
  var d0 = dims(o), w0 = d0.w, rows = 0, layout = [];
  if (!single && v.length) {
    var x = 0;
    rows = 1;
    v.forEach(function(n, i) {
      var l = labels[i] || "#" + (i + 1), wd = 14 + tw(l, 12) + 6 + tw(fmt(n, o), 11, true) + 18;
      if (x > 0 && x + wd > w0) {
        x = 0;
        rows++;
      }
      layout.push({ x, row: rows - 1, l });
      x += wd;
    });
  }
  var h = 22 + 14 + (rows ? 12 + rows * 20 : 0);
  var st = statOf(v, o, "");
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!v.length) return emptyState(th, x0, y0, w, h2);
    var s = "", by = y0 + 22, cid = newId("c");
    var head = single ? show(v[0]) + (auto ? "" : " of " + fmt(max, o)) : fmt(total, o) + " of " + fmt(max, o);
    if (single && labels[0]) s += text(x0, y0 + 11, labels[0], 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="12"');
    s += text(x0 + w, y0 + 11, head, 'text-anchor="end" fill="' + th.fg + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
    s += '<rect x="' + x0 + '" y="' + by + '" width="' + w + '" height="14" rx="7" fill="' + th.grid + '" fill-opacity=".7"/>';
    s += '<clipPath id="' + cid + '"><rect x="' + x0 + '" y="' + by + '" width="' + w + '" height="14" rx="7"/></clipPath><g clip-path="url(#' + cid + ')"><g' + anim(o, "bzc-gx") + ">";
    var acc = 0;
    v.forEach(function(n, i) {
      var len = Math.min(n, Math.max(0, max - acc)) / max * w;
      if (len > 0) s += '<rect x="' + r2(x0 + acc / max * w) + '" y="' + by + '" width="' + r2(len) + '" height="14" fill="' + pal[i % pal.length] + '"/>';
      if (i > 0 && len > 0) s += '<rect x="' + r2(x0 + acc / max * w - 1) + '" y="' + by + '" width="2" height="14" fill="' + (o.background || th.tile) + '"/>';
      acc += n;
    });
    s += "</g></g>";
    if (has(o.goal)) {
      var gx = x0 + clamp(+o.goal / max, 0, 1) * w;
      s += '<line x1="' + r2(gx) + '" x2="' + r2(gx) + '" y1="' + (by - 4) + '" y2="' + (by + 18) + '" stroke="' + th.fg + '" stroke-width="2" stroke-linecap="round"/>';
    }
    acc = 0;
    v.forEach(function(n, i) {
      var len = Math.min(n, Math.max(0, max - acc)) / max * w;
      if (len > 0) s += hit(x0 + acc / max * w, by - 4, len, 22, (labels[i] || (single ? "Progress" : "#" + (i + 1))) + ": " + show(n) + (single ? "" : " (" + Math.round(n / max * 100) + "%)"));
      acc += n;
    });
    layout.forEach(function(it, i) {
      var lx = x0 + it.x, ly = by + 14 + 12 + it.row * 20 + 8;
      s += '<circle cx="' + r2(lx + 4) + '" cy="' + r2(ly) + '" r="4" fill="' + pal[i % pal.length] + '"/><text x="' + r2(lx + 14) + '" y="' + r2(ly + 4) + '" fill="' + th.fg + '" font-family="' + SANS + '" font-size="12">' + esc(it.l) + '<tspan dx="6" fill="' + th.muted + '" font-family="' + MONO + '" font-size="11">' + esc(fmt(v[i], o)) + "</tspan></text>";
    });
    return s;
  }, { stat: st, summary: single ? show(v[0]) + (auto ? "" : " of " + fmt(max, o)) : fmt(total, o) + " of " + fmt(max, o) });
}
progress.table = function(o) {
  var v = nums(o.values).map(function(n) {
    return Math.max(0, n);
  }), labels = list(o.labels), single = v.length === 1;
  var max = has(o.max) ? num(o.max, 100) : single ? 100 : sum(v);
  if (!(max > 0)) max = 1;
  var auto = !has(o.prefix) && !has(o.suffix) && max === 100 && single;
  if (single) return { head: ["Label", "Value"], rows: [[labels[0] || "Progress", fmt(v[0], o) + (auto ? "%" : " of " + fmt(max, o))]] };
  return { head: ["Label", "Value", "Share"], rows: v.map(function(n, i) {
    return [labels[i] || "#" + (i + 1), fmt(n, o), Math.round(n / max * 100) + "%"];
  }) };
};

// src/entries/progress.js
register("progress", progress);
define("progress");

// src/charts/heatmap.js
var FULL = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
function startOf(o, len) {
  if (has(o.start) && /^\d{4}-\d{2}-\d{2}$/.test(String(o.start))) return /* @__PURE__ */ new Date(String(o.start) + "T00:00:00Z");
  var t = /* @__PURE__ */ new Date();
  return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Math.max(0, len - 1) * 864e5);
}
function dates(lang, opt) {
  try {
    return new Intl.DateTimeFormat(lang, Object.assign({ timeZone: "UTC" }, opt));
  } catch (e) {
    return new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: "UTC" }, opt));
  }
}
function heatmap(o, th) {
  var v = nums(o.values), c = palette(o, th)[0], lang = o.lang || "en-GB";
  var start = startOf(o, v.length);
  var offset = (start.getUTCDay() + 6) % 7, cols = Math.max(1, Math.ceil((offset + v.length) / 7));
  var d0 = dims(o), leftW = 28, maxCols = Math.max(1, Math.floor((d0.w - leftW) / 10));
  if (cols > maxCols) {
    var drop = (cols - maxCols) * 7 - offset;
    v = v.slice(drop);
    start = new Date(start.getTime() + drop * 864e5);
    offset = 0;
    cols = maxCols;
  }
  var pitch = Math.min(18, (d0.w - leftW) / cols), gap = pitch < 8 ? 1 : 3, cell = pitch - gap;
  var h = 16 + 7 * pitch + 26;
  var max = v.length ? Math.max.apply(null, v) : 0;
  var dfm = function(opt) {
    return dates(lang, opt);
  };
  var monthF = dfm({ month: "short" }), dayF = dfm({ weekday: "short" }), fullF = dfm(FULL);
  var st = statOf(v, o, "");
  return tile(o, th, h, function(x0, y0, w, h2) {
    if (!v.length) return emptyState(th, x0, y0, w, h2);
    var s = "", gx = x0 + leftW, gy = y0 + 16, lastMonthX = -99, op = [0.28, 0.5, 0.75, 1];
    if (pitch >= 9) [0, 2, 4].forEach(function(r) {
      var d = new Date(Date.UTC(2024, 0, 1 + r));
      s += text(x0, gy + r * pitch + cell / 2 + 3.5, dayF.format(d), small(th, 9));
    });
    for (var i = 0; i < v.length; i++) {
      var k = offset + i, col = Math.floor(k / 7), row = k % 7;
      var day = new Date(start.getTime() + i * 864e5), x = gx + col * pitch, y = gy + row * pitch;
      if ((day.getUTCDate() === 1 || i === 0) && x - lastMonthX > 30) {
        s += text(x, y0 + 9, monthF.format(day), small(th, 9));
        lastMonthX = x;
      }
      var lvl = v[i] <= 0 || !max ? 0 : Math.ceil(v[i] / max * 4);
      var fill = lvl ? c : th.grid, fo = lvl ? op[lvl - 1] : 0.7;
      s += '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(cell) + '" height="' + r2(cell) + '" rx="' + r2(cell * 0.24) + '" fill="' + fill + '" fill-opacity="' + fo + '"' + (o.animate ? ' class="bzc-a" style="animation-delay:' + r2(col * 0.012) + 's"' : "") + ' data-tip="' + esc(fullF.format(day) + ": " + fmt(v[i], o)) + '"/>';
    }
    var ly = gy + 7 * pitch + 14, lc = 10, lx = x0 + w - 5 * (lc + 3) - 30;
    s += text(x0, ly + 8, fmt(sum(v), o, true) + " in " + v.length + " days", small(th, 10));
    s += text(lx - 6, ly + 8, "Less", small(th, 9, 'text-anchor="end"'));
    for (var j = 0; j < 5; j++) {
      s += '<rect x="' + r2(lx + j * (lc + 3)) + '" y="' + ly + '" width="' + lc + '" height="' + lc + '" rx="2.5" fill="' + (j ? c : th.grid) + '" fill-opacity="' + (j ? op[j - 1] : 0.7) + '"/>';
    }
    s += text(lx + 5 * (lc + 3) + 3, ly + 8, "More", small(th, 9));
    return s;
  }, { stat: st, summary: fmt(sum(v), o) + " across " + v.length + " days" });
}
heatmap.table = function(o) {
  var v = nums(o.values), start = startOf(o, v.length), f = dates(o.lang || "en-GB", FULL);
  return { head: ["Date", "Value"], rows: v.map(function(n, i) {
    return [f.format(new Date(start.getTime() + i * 864e5)), fmt(n, o)];
  }) };
};

// src/entries/heatmap.js
register("heatmap", heatmap);
define("heatmap");

// src/index.js
var version = "1.4.0";
var types = NAMES.slice();
export {
  BezelChart,
  render,
  THEMES as themes,
  toSVG,
  types,
  version
};
