# Changelog

## 1.0.1 (2026-10-28)

- Live charts no longer show the browser's own tooltip on top of the chart's tooltip. Screen readers still get the chart's name, and exported SVGs keep their title.
- The script line in the README, the site and the Studio now loads `@1`, the latest 1.x release, so fixes reach every page automatically.
- Studio: three sample files to try, units read from imported files (km, £, %), cleaner imports, and the header shows every link on phones.

## 1.0.0 (2026-10-26)

First release.

- Ten chart types as web components: `<bezel-spark>`, `<bezel-line>`, `<bezel-bars>` (including grouped bars), `<bezel-scatter>`, `<bezel-ring>`, `<bezel-donut>`, `<bezel-gauge>`, `<bezel-progress>` and `<bezel-heatmap>`, plus `<bezel-chart type="...">`.
- Shared options for headings, number formatting, locales, colours, light and dark themes, frames, corners, headline numbers with change since the start, goal lines, notes on points and value labels.
- Scatter plots with axis titles and an optional least-squares trend line showing Pearson's r.
- Static SVG export from every chart (`toSVG()` and `download()`), and `render()` / `toSVG()` functions that run without a DOM, including in Node.
- Charts fill their container and redraw on resize; heatmaps keep the most recent weeks on narrow screens.
- The Studio: build any chart without code, import a CSV, Excel or JSON file (or paste cells from a spreadsheet, or try one of three sample files), pick colours, then copy the HTML with the script line, save an SVG or share a link.
- About 12 kB gzipped with no dependencies, a 14 kB size budget checked in CI, unit tests and a Playwright browser test.
