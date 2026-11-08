# Changelog

## 1.1.0 (2026-11-07)

- Stacked bars: add `stacked` to bars with several series to pile them into one bar per group, vertical or horizontal. Negative parts stack below zero. The tooltip lists every part and the total, and `show-values` writes the total on each bar.
- Angled labels: add `angle-labels` to vertical bars and labels that don't fit side by side lean at 40 degrees, so every one shows instead of every few. Long labels are shortened after 24 characters, and the tooltip keeps the full text. Charts whose labels already fit don't change.
- Both options are in the Studio, the Python package and the README. Charts that don't use them draw exactly as before.

## 1.0.2 (2026-11-02)

- Notes now work on charts whose labels are numbers, such as years. `notes="1980:Boycott"` used to be read as position 1980, so the note silently disappeared. A label now wins, and a whole number that matches no label is still a position. If your labels are numbers and you used a note like `1:Text` to mean a position, it now points at the label `1`.

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
