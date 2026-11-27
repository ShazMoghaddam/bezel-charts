# Changelog

## 1.12.0 (2026-11-27)

Fan charts, a treemap, shaded spans, and missing values shown as gaps instead of 0.

### New

- **Fan charts:** bands on line charts, each a shaded range between a low and a high series with an optional dashed middle line. Made for forecast scenarios (bad, middling, good) that carry on from a history line, and percentile ranges such as 10th to 90th. Set them with `band-low`, `band-high`, `band-mid`, `band-series` and `band-color`, bands separated by `|`, or from JavaScript as `bands: [{ name, low, high, mid, color }]`. Bands sit under the lines with a faint edge, and middle lines take turns at dashed, dotted and dash-dot, so bands differ by more than colour. The legend, tooltips ("Good: 54.6 to 57.9, mid 56.2"), summary and data table all include them, and the years a line stops for its forecast aren't counted as missing. In the Studio too. See [Fan charts](README.md#bezel-line).
- **Treemap:** a new chart, `<bezel-treemap>`, for parts of a whole with too many parts for a donut, such as holdings by sector. `groups` puts each group in a block of its own colour with its items inside, with a legend. Tiles are squarified so they stay easy to compare, smaller tiles in a group step down a little in strength, and each tile shows its name, value and share when they fit, in white or near-black, whichever stands out more. Zero, negative and missing values are left out and counted. Tooltips, the data table, the summary and the arrow keys (biggest to smallest) work as on the other charts. In the Studio, with a sample portfolio and file import that groups by a text column, and on its own as `bezel-charts/treemap`. That makes seventeen charts.
- **Shaded spans:** `notes` can shade a stretch as well as mark a point: `notes="2020:2020 shock;2022..2023:Rate rises"`. Spans sit behind the data, with a faint edge so they show in greyscale and print.
- **Notes on more charts:** upright bars, combo charts and waterfalls now take `notes` and spans. A span covers whole columns, and labels get their own strip above the bars so none sits on a bar.
- **`fill` on line charts:** `fill="none"` (or `false`) turns off the soft shading under the first line, `fill="all"` shades every line, more lightly so they stay readable together, and `fill="first"` is the default. Sparklines take `fill="none"` too. In the Studio as "Shading under the line".

### Missing values are gaps, never 0

Every chart used to draw a missing value as 0, which made a gap in the data look like a real drop. Now a blank slot (`4,,6`), `null`, `NaN`, `-` or anything else that isn't a number is a gap, as are `null`, `undefined` and `NaN` in arrays. Each chart shows it in its own way:

- lines and areas break, with a dot on a value alone between gaps; a stacked area breaks the whole column, since its total isn't known
- bars leave a dashed slot on the zero line, and a stacked total with a missing part is unknown rather than smaller
- a waterfall draws a dashed "No data" step that keeps the level, and later totals say how many steps they leave out; a blank total just shows the running total
- histograms, box plots and scatter plots leave gaps out and say how many
- rings, progress bars and bullet rows say "No data", donuts drop the slice, and the heatmap draws an empty dashed outline

Tooltips say "No data", summaries count the gaps, the data table shows "–" and `bezel-click` gives `null`. The Studio keeps blank cells from a file as gaps and keeps `4,,6` typed into a field. See [Missing values](README.md#missing-values).

### Changed

These change how some existing charts look. None changes the API.

- `4,,6` used to be read as `4,6`, which quietly moved every later value onto the wrong label. The blank is now a gap. A trailing comma is still ignored.
- A word in a number list (such as `targets="7,nope"`) used to count as 0. It's now a gap, so that bullet row has no target.
- Bullet charts call the bar "Value" by default instead of "Actual", which read oddly for scores, forecasts and budgets. `series="This quarter,Plan"` names both, now documented properly.
- Bars used to ignore `notes`, and so did the combo chart. They now draw them.
- Notes that would overlap move down a row, up to three, and a long label stays inside the chart. Notes that never overlapped are drawn exactly as before.

### Docs

- The heatmap is described as what it is: a calendar heatmap, one square per day, with how its shading works, its `color` option, and a note that it isn't a grid of rows by columns. A grid heatmap is planned as its own chart for 1.13.0. The Studio and gallery call it "Calendar heatmap"; the tag stays `<bezel-heatmap>`.
- New README image (`docs/bezel-charts-17.png`) and social preview, with the fan chart and treemap. The old `bezel-charts-16.png` stays, as the READMEs of published versions point at it.
- The gallery said "Fourteen" chart types; it now says seventeen.

### Size

The full bundle is 32.4 kB gzipped, up from 27.3 kB: about 1.4 kB for gap handling across every chart, 1.5 kB for the treemap, 1.2 kB for bands, which only line charts load, and 0.7 kB for notes and spans, shared by the six charts that use them. A page that loads one chart takes 8.5 to 15.3 kB. Every budget is now the next whole kB with at least 0.3 kB of room.

## 1.11.0 (2026-11-16)

Stable SVGs, clearer goal labels, capital M and a donut centre that fits.

- **Stable ids:** the same options now give the same SVG, byte for byte, every time. Gradients, patterns and clip paths used to get random ids, so a rebuilt chart always looked changed and CI couldn't check that committed charts were up to date. Ids are now worked out from the chart itself (`bzcg` plus a short hash), so different charts on one page still never clash.
- `id`: names the ids yourself. `toSVG('bars', { id: 'oldest-trees', ... })` gives `oldest-trees-g1`, `oldest-trees-c1` and so on. Anything other than letters, digits, `-` and `_` becomes `-`, and an id that doesn't start with a letter gets `bzc-` in front.
- **Goal label on vertical bars:** it no longer sits on top of `show-values` numbers. It takes the first free spot of above right, below right, above left and below left. If every spot is taken, it gets an outline in the tile colour so it still reads.
- **Goal label on horizontal bars:** the dashed line had no label at all. It now has one above the first row, centred on the line and kept inside the bar area. The chart is 16px taller when it has a goal.
- **Changed, compact numbers:** British English wrote millions as `2.2m`, which reads like metres, and billions and trillions as `bn` and `tn`. They're now `2.2M`, `3.4B` and `5T`, with thousands still `15k`. US English is unchanged (`15K`, `2.2M`, `3.4B`, `5T`), as are other languages. This changes how existing `en-GB` charts look wherever numbers are shortened: `compact`, the values on bars and the donut total.
- **Donut centre:** a long `center-label` used to spill out of the hole. It now shrinks to as small as 7px, then wraps onto two lines, then is shortened with "…". The total in the middle also shrinks if it's too wide, which mostly helps narrow donuts.
- The Python package matches all of this byte for byte. Its parity tests now compare the raw SVG, ids included, instead of renaming ids first.
- Size: about 1 kB more for the full bundle (27.5 kB), mostly the donut and goal label code. The bars budget is now 12 kB and the area budget 14 kB, as the shared code both load grew.

## 1.10.1 (2026-11-11)

README image fix for npm.

- The README image on npm was broken. npm resolves relative image paths against the repository, and the image was renamed to `docs/bezel-charts-16.png` after 1.10.0 was published, so the 1.10.0 page still pointed at the old name. The README now uses the full GitHub address, so npm, PyPI mirrors and any other site that shows it load the same image.
- No code changes. The version moves in step across npm and Python, as the version test expects.

## 1.10.0 (2026-11-10)

Data from JavaScript and click events.

- `data`: set any options from JavaScript as real arrays and numbers, such as `chart.data = { values: [[4, 9], [3, 5]], labels: ['Mon', 'Tue'] }`, and the chart redraws. It wins over the matching attributes, takes camelCase or HTML names, and `null` goes back to the attributes. Data set before the chart's script loads is kept. React 19 and Vue (`:data.prop`) pass it straight through.
- `bezel-click`: fires when someone clicks a bar, point, slice, row or day, with the chart type, the item's index, series, label, value and tooltip text in `e.detail`. Enter or Space on the value the arrow keys are on fires it too, so keyboard users can do the same as mouse users.
- `clickable`: a pointer cursor over each value, and a hint for screen reader users that Enter selects one. Charts don't show a pointer by default, since they can't tell whether anything handles the click.
- Hover areas now carry `data-i`, `data-s` and `data-v` markers saying which item they stand for. They're in static SVGs too, and the Python package draws them identically.
- Size: about 0.5 kB more per chart, as the new code is shared by all of them. The histogram, box plot and scatter budgets are now 11 kB. The full bundle is 26.4 kB.

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
