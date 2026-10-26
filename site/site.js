// Page wiring: the gallery's theme switch and buttons, and the Studio.
import { copyText, sampleYear } from './ui.js';
import { createStudio } from './studio.js';

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
