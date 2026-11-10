# Changelog

## 1.9.0 (2026-11-10)

Waterfall and bullet charts.

- `<bezel-waterfall>`: the changes from a starting value to where it ends up. Rises and falls float from the previous level, joined by thin step lines, and `totals` names the bars that show the running total from zero, by label or position. A total adds its own value first, so a start bar takes the opening amount and a subtotal takes `0`.
- Rises, falls and totals use the theme's up, down and first colours, with a legend, and `color="rise,fall,total"` changes them. Every bar carries a signed label (`+£85k`, `−£160k`) so the chart reads without relying on colour; when any label would overlap, they all hide. Tooltips and the data table give each change and the running total.
- `<bezel-bullet>`: one row per measure, with the actual value as a bar, the target as an upright line (`targets`, one per row or one for all) and grey bands behind from `zones`, the same as the gauge. `zone-labels` names the bands, and each row can have its own with `|`.
- Each bullet row has its own scale, so measures in different units sit together; `max` sets one end for every row. The summary counts the measures at or above target, and the tooltip and data table give the actual, target, difference and band.
- In the Studio (with presets, totals, targets, band edges and names, and CSV import), the Python package as `bc.waterfall()` and `bc.bullet()`, and on their own as `bezel-charts/waterfall` (9.0 kB) and `bezel-charts/bullet` (9.1 kB).
- A test now fails if the npm package, the Python package, the library's `version` and the built files disagree on the version number. The 1.8.0 npm release needed a second tag because of exactly that.
- Size: the full bundle is 25.9 kB, and its budget is now 28 kB. Pages that load only some charts are unchanged.

## 1.8.0 (2026-11-10)

Line and area axes: real dates, fixed ranges and log scales.

- `dates`: one date per point (`2026-01-05`, or `2026-01-05T14:30`) places points where they fall in time instead of evenly. The axis picks its own step for the span and the width (hours, days, weeks, months or years) and labels it to suit: `14:00`, `5 Jan`, `Jan 2026` then `Feb`, or `2026`. Tooltips and the data table show the full date, and hover columns reach halfway to each neighbour. Without a valid date for every point, the points stay evenly spaced.
- `min` and `max` fix the value axis. Anything beyond is clipped at the edge, and the tooltip keeps the true value. On area charts, `min` applies only at or below zero, so areas keep their base.
- `log` (line charts): each power of ten gets the same height, with 2 and 5 between when the range is short. Zero and negative values leave gaps in the line but keep their tooltips. The soft fill under the first line is left out on a log scale.
- In the Studio: a Dates field, Axis from and to, and a log toggle. Importing a CSV with a date column into a line or area chart now uses it as dates.
- Size: the line chart file is 12.0 kB (from 9.9 kB) and area 12.3 kB, as dates, fixed ranges and log scales live in the shared line and area code. Their budgets are now 13 kB. The bars-and-line chart moved its line helpers out of that code and is now 10.5 kB (from 11.1 kB). The full bundle is 23.8 kB, budget 26 kB.

## 1.7.0 (2026-11-10)

Bars and a line on two axes.

- `<bezel-combo>`: bars read against the left axis and one or more lines against the right, for two measures with different units. Several bar series sit side by side, or pile up with `stacked`, with negative parts below zero.
- The right axis always has the same number of steps as the left, so every gridline reads on both sides. A rule down each side takes its data's colour, and `y-label` and `line-label` add titles above the axes.
- `line-prefix`, `line-suffix` and `line-decimals` format the right axis and the line values. `line-zero` starts it at zero; otherwise it fits the data.
- Tooltips give each value in its own units, with the total when stacked, and the data table has a column for every bar series and line. `dash`, `markers` and `patterns` work as on line and bar charts.
- In the Studio (with the line's values, names, units and axis titles), the Python package as `bc.combo()`, and on its own as `bezel-charts/combo` (11.1 kB).
- The full bundle's budget is now 24 kB (the bundle is 22.1 kB).

## 1.6.0 (2026-11-09)

Box plots.

- `<bezel-boxplot>`: one box per group of raw values, from the lower to the upper quartile, with a line at the median. Whiskers reach the furthest values within 1.5 times the box's height, and anything further out is an outlier dot. `whiskers="range"` reaches the lowest and highest values instead.
- Quartiles use linear interpolation, as pandas, NumPy and Excel's `QUARTILE.INC` do, so the numbers match `df.describe()`.
- `mark="mean"` adds a diamond at the mean, `horizontal` lays the boxes on their side, `goal` draws a reference line and `color` can give each box its own colour. Long group names are shortened to fit.
- Tooltips give each group's median, middle half, range, outliers and count, and the data table lists every figure. Keyboard and screen reader support work as on every chart.
- In the Studio, the Python package as `bc.boxplot()` (with `by=` for long DataFrames), and on its own as `bezel-charts/boxplot` (9.4 kB).
- The full bundle's budget is now 22 kB (the bundle is 20.4 kB). It will rise a little with each new chart, so it keeps catching growth nobody meant.
- Studio: a toggle can now set a value, such as `mark="mean"`, and toggles with the same name on different charts no longer mix up.

## 1.5.0 (2026-11-09)

Histograms.

- `<bezel-histogram>`: give it raw values and it counts how many fall into each range. Ranges get round edges (1, 2, 2.5 or 5 times a power of ten), about log₂(n) + 1 of them by default. `bins` sets roughly how many and `bin-width` an exact width.
- Each range includes its lower edge and not its upper one, except the last, which includes both. Edges are rounded to the width's decimals, so a value typed as 0.3 starts the 0.3 range rather than ending the one before.
- Several series share the same ranges and overlap, with `patterns` available. `mark="mean,median"` adds labelled lines, and `percent` shows shares instead of counts, so groups of different sizes compare.
- Tooltips and the data table give each range's count and share. Keyboard and screen reader support work as on every chart.
- In the Studio (with range, line and share controls), the Python package as `bc.histogram()`, and on its own as `bezel-charts/histogram` (9.8 kB).
- The full bundle is 19.0 kB, close to its 20 kB budget. v1.6.0 will need to revisit it.

## 1.4.0 (2026-11-09)

Area charts.

- `<bezel-area>`: filled areas over time. Several series overlap as see-through fills; `stacked` piles them up so the top edge is the total, and `stacked="percent"` scales each column to 100% to show how it splits. The axis always starts at zero.
- Tooltips list every series, plus the total when stacked and each share in a percent stack. `show-values` writes each value, or the total above each column of a stack. Negative values stack below zero, as on stacked bars.
- Areas take `labels`, `series`, `notes`, `goal`, `straight`, `dash` and `markers` for the top edges, and `patterns` for the fills. Keyboard, screen reader announcements and the hidden data table work as on every chart, with a Total column when stacked.
- In the Studio, with a stacking choice, in the Python package as `bc.area()`, and on its own as `bezel-charts/area` (10.3 kB).
- Line and area charts now share their axis code. Line charts draw exactly as before, checked against the Python parity fixtures.

## 1.3.0 (2026-11-09)

Load only the charts you use.

- Every chart comes as its own file: `dist/charts/line.js` from the CDN, or `import 'bezel-charts/line'` with npm. A page with one chart loads 7.2 to 10.1 kB instead of 15.9 kB. The chart files share one common file, so a page with a line and a bar chart loads 12.0 kB.
- `<bezel-chart type="…">` works with whichever charts are loaded, and says which file to add when a type isn't loaded.
- The full bundle, the `@1` script line and `import 'bezel-charts'` work exactly as before. The classic `iife.js` script still has every chart.
- Size budgets: 20 kB for the full bundle, and one per chart file, counting the shared file it loads.
- No change to how charts draw, and no new Python release: the Python package stays at 1.2.0.

## 1.2.0 (2026-11-09)

Accessibility. Every chart now works without a mouse and without seeing it.

- Keyboard: Tab to a chart, then step through its values with the arrow keys, or jump with Home and End. The value you're on is outlined with its tooltip showing, and Escape hides it. On a heatmap, Left and Right move a week and Up and Down a day. Charts keep focus and their place when they redraw.
- Screen readers hear the chart's name once, a hint about the arrow keys, and each value as you move ("Tue: 9. 2 of 7"). The tooltip is no longer read out as the mouse passes over a chart.
- A hidden data table on every chart lists every value, including the small donut slices grouped as "Other" and the early weeks a narrow heatmap leaves out. Exported SVGs don't include it.
- `dash` gives each line its own style (`solid`, `dashed`, `dotted`, `dashdot`) and `markers` puts a shape on each point (`circle`, `square`, `triangle`, `diamond`), on line charts and scatter groups. `patterns` fills grouped and stacked bars with stripes, dots or a grid. Use the attribute on its own to hand out styles in turn, or list one per series. Legends show each style. Dashed lines fade in rather than drawing in.
- `no-tooltips` now also takes a chart out of the Tab order.
- All three options are in the Studio, the Python package and the README. Charts that don't use them draw exactly as before.
- The size budget is now 16 kB gzipped (the bundle is 15.8 kB). Version 1.3.0 adds per-chart imports, so pages can load only the charts they use.

## 1.1.1 (2026-11-09)

No changes to the charts. This release puts the package on npm properly.

- Bezel Charts is on npm: `npm install bezel-charts`. New releases publish there automatically from GitHub, with a provenance statement showing each package was built from this repository.
- A security policy in [SECURITY.md](SECURITY.md), with private reporting through GitHub.
- Dependabot checks npm, Python and GitHub Actions dependencies every week.

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
