/** The bezel frame every chart sits in: background, heading, headline stat and outer SVG. */
import { SANS, MONO, esc, num, has, clamp, fmt, text, small } from './util.js';

export function dims(o) {
  var W = Math.round(clamp(num(o.width, 360), 160, 2400));
  var b = o.frame === 'none' ? 0 : 4;
  var P = o.frame === 'none' ? 8 : 20;
  return { W: W, b: b, P: P, w: W - 2 * (b + P) };
}

export const CSS = '.bzc-a{animation:bzc-in .6s ease both}' +
  '.bzc-d{animation:bzc-draw 1.1s cubic-bezier(.3,.7,.2,1) both}' +
  '.bzc-g{transform-box:fill-box;transform-origin:50% 100%;animation:bzc-grow .7s cubic-bezier(.2,.8,.2,1) both}' +
  '.bzc-gn{transform-box:fill-box;transform-origin:50% 0;animation:bzc-grow .7s cubic-bezier(.2,.8,.2,1) both}' +
  '.bzc-gx{transform-box:fill-box;transform-origin:0 50%;animation:bzc-growx .8s cubic-bezier(.2,.8,.2,1) both}' +
  '.bzc-s{animation:bzc-sweep 1.1s cubic-bezier(.2,.8,.2,1) both}' +
  '@keyframes bzc-in{from{opacity:0}}@keyframes bzc-draw{from{stroke-dashoffset:1}}' +
  '@keyframes bzc-grow{from{transform:scaleY(0)}}@keyframes bzc-growx{from{transform:scaleX(0)}}' +
  '@keyframes bzc-sweep{from{stroke-dasharray:0 100}}' +
  '@media (prefers-reduced-motion:reduce){[class^=bzc-]{animation:none!important}}';

export function tile(o, th, h, draw, meta) {
  var d = dims(o), W = d.W, b = d.b, P = d.P, w = d.w;
  var R = clamp(num(o.corners, 22), 0, 60);
  var y = b + P, head = '';
  if (has(o.heading)) {
    head += text(b + P, y + 10, String(o.heading).toUpperCase(),
      small(th, 11, 'font-weight="600" letter-spacing="1.3"'));
    y += 24;
  }
  var st = meta && meta.stat;
  if (st) {
    head += text(b + P, y + 30, fmt(st.val, o), 'fill="' + th.fg + '" font-family="' + SANS + '" font-size="32" font-weight="800" letter-spacing="-0.5"');
    if (st.delta != null) {
      var up = st.delta > 0, flat = st.delta === 0;
      var good = o.delta === 'inverse' ? !up : up;
      var col = flat ? th.muted : good ? th.up : th.down;
      var lbl = (flat ? '● ' : up ? '▲ ' : '▼ ') + fmt(Math.abs(st.delta), o) + ' ' + (has(o.deltaLabel) ? o.deltaLabel : 'since start');
      head += text(b + P + w, y + 28, lbl, 'text-anchor="end" fill="' + col + '" font-family="' + MONO + '" font-size="11" font-weight="600"');
    }
    y += 44;
  }
  var body = draw(b + P, y, w, h);
  var H = Math.round(y + h + P + b);
  var bg = '';
  if (o.frame !== 'none') {
    bg = '<rect width="' + W + '" height="' + H + '" rx="' + R + '" fill="' + th.bezel + '"/>' +
      '<rect x="' + b + '" y="' + b + '" width="' + (W - 2 * b) + '" height="' + (H - 2 * b) + '" rx="' + Math.max(0, R - b) + '" fill="' + (o.background || th.tile) + '"/>';
  } else if (has(o.background)) {
    bg = '<rect width="' + W + '" height="' + H + '" rx="' + R + '" fill="' + o.background + '"/>';
  }
  var label = (has(o.heading) ? o.heading + ': ' : '') + ((meta && meta.summary) || 'chart');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
    '" role="img" aria-label="' + esc(label) + '"><title>' + esc(label) + '</title>' +
    (o.animate ? '<style>' + CSS + '</style>' : '') + bg + head + body + '</svg>';
}
