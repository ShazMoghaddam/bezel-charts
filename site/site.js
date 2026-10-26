// Page wiring: the gallery's theme switch and buttons, and the Studio.
import { copyText, sampleYear } from './ui.js';
import { createStudio } from './studio.js';

/**
 * The footer is split on its diagonal. The real content shows in deep brown on the amber half;
 * this copy shows in deep teal on the mint half. Screen readers and keyboards only meet the real
 * content; the copy's links still work for a mouse or a tap on the mint side.
 */
function buildFooterCopy() {
  const layer = document.querySelector('.foot__layer');
  if (!layer || document.querySelector('.foot__layer--mint')) return;
  const copy = layer.cloneNode(true);
  copy.classList.add('foot__layer--mint');
  copy.setAttribute('aria-hidden', 'true');
  for (const el of copy.querySelectorAll('a, button, [tabindex]')) el.setAttribute('tabindex', '-1');
  for (const el of copy.querySelectorAll('[id]')) el.removeAttribute('id');
  layer.after(copy);
}
buildFooterCopy();

await customElements.whenDefined('bezel-chart');

const heat = document.getElementById('heat');
if (heat) {
  const s = sampleYear();
  heat.setAttribute('start', s.start);
  heat.setAttribute('values', s.values);
}

const studio = createStudio(document.getElementById('studio'));

document.querySelectorAll('.card').forEach((card) => {
  const chart = card.firstElementChild;
  card.querySelector('[data-copy="svg"]')?.addEventListener('click', () => copyText(chart.toSVG(), 'SVG copied. Save it as a .svg file.'));
  card.querySelector('[data-edit]')?.addEventListener('click', () => studio.load(chart));
});

document.querySelectorAll('[data-theme-set]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.themeSet;
    document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    document.querySelectorAll('.card > :first-child').forEach((c) => (t === 'auto' ? c.removeAttribute('theme') : c.setAttribute('theme', t)));
  });
});

addEventListener('hashchange', () => {
  if (studio.fromHash()) document.getElementById('studio').scrollIntoView();
});
if (location.hash.startsWith('#chart=')) document.getElementById('studio').scrollIntoView();
