# Bezel Charts

**Charts that look finished the moment you add them.**

[![Web components release](https://img.shields.io/github/v/release/ShazMoghaddam/bezel-charts?filter=v*&label=web%20components&color=6E70F0)](https://github.com/ShazMoghaddam/bezel-charts/releases)
[![npm](https://img.shields.io/npm/v/bezel-charts?label=npm&color=CB3837)](https://www.npmjs.com/package/bezel-charts)
[![PyPI](https://img.shields.io/pypi/v/bezel-charts?label=PyPI&color=16A884)](https://pypi.org/project/bezel-charts/)
[![CI](https://github.com/ShazMoghaddam/bezel-charts/actions/workflows/ci.yml/badge.svg)](https://github.com/ShazMoghaddam/bezel-charts/actions/workflows/ci.yml)
[![Python](https://github.com/ShazMoghaddam/bezel-charts/actions/workflows/python.yml/badge.svg)](https://github.com/ShazMoghaddam/bezel-charts/actions/workflows/python.yml)
[![MIT licence](https://img.shields.io/badge/licence-MIT-D99A0E)](LICENSE)

Bezel Charts is a set of free, open-source web components: twelve chart tiles drawn in pure SVG, so they stay sharp on a phone, a 4K screen or a printed report. Build one in the Studio, paste one line of HTML into any site, or save any chart as a static SVG for a README, Notion page or slide, where JavaScript can't run.

![Bezel Charts: a sparkline, rings, a gauge, a line chart with a launch day note, a donut, a bar chart with a target, a scatter plot with a trend line and a year-long activity heatmap, in light and dark tiles](docs/bezel-charts.png)

**[Open the Studio](https://shazmoghaddam.github.io/bezel-charts/site/#studio)** to build a chart and copy its code.

- **One tag per chart.** `<bezel-bars values="4,9,6">` is a finished, labelled, animated chart.
- **Yours to style.** Any colour, light and dark themes that follow the viewer's setting, rounder or squarer corners, with or without the bezel frame.
- **Made for READMEs.** Every chart exports as a clean static SVG, so a GitHub README can show a real chart.
- **Data science friendly.** Scatter plots with a least-squares trend line and Pearson's r, grouped series, goal lines and notes on key points.
- **Speaks your language.** Numbers and dates follow any locale, including Persian.
- **Light.** About 19 kB gzipped for all twelve charts, or 7 to 10 kB for a page that loads just one. No dependencies and no build step.
- **Accessible.** Tab to any chart and step through its values with the arrow keys. Screen readers hear each value and get a hidden table of the data. Dashes, shapes and patterns tell series apart without relying on colour, and animation respects reduced-motion settings.
- **Python too.** `pip install bezel-charts` draws the same charts straight from a pandas DataFrame, for notebooks, reports and READMEs.

A sibling of [Bezel](https://github.com/ShazMoghaddam/bezel), the clock, calendar and weather tiles.

## Contents

- [Quick start](#quick-start)
- [Load only the charts you use](#load-only-the-charts-you-use)
- [The Studio](#the-studio)
- [The charts](#the-charts)
- [Options for every chart](#options-for-every-chart)
- [Colours and dark mode](#colours-and-dark-mode)
- [Accessibility](#accessibility)
- [Charts in a README](#charts-in-a-readme)
- [JavaScript API](#javascript-api)
- [Python](#python)
- [Frameworks](#frameworks)
- [Development](#development)

## Quick start

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/ShazMoghaddam/bezel-charts@1/dist/bezel-charts.min.js"></script>

<bezel-bars heading="Commits this week" values="4,9,6,3,8,5,3" labels="M,T,W,T,F,S,S" stat="total"></bezel-bars>
```

`@1` always loads the latest 1.x release, so you get fixes without changing anything. To pin an exact version, use `@v1.5.0` instead.

That's all. Charts fill the width of whatever they sit in and redraw when it changes, so they work in a sidebar, a card grid or a full-width section without extra CSS.

Prefer a classic script tag? `dist/bezel-charts.iife.js` registers the same elements and exposes a `BezelCharts` global.

With npm:

```sh
npm install bezel-charts
```

```js
import 'bezel-charts';                      // registers every element
import { render, toSVG } from 'bezel-charts'; // draw charts as SVG strings, even in Node
```

## Load only the charts you use

Each chart also comes as its own file, so a page with a single chart loads less than half the full bundle. The files share their common code, so a page with two or three charts downloads that part once.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/ShazMoghaddam/bezel-charts@1/dist/charts/line.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/gh/ShazMoghaddam/bezel-charts@1/dist/charts/bars.js"></script>
```

```js
import 'bezel-charts/line';
import 'bezel-charts/bars';
import { toSVG } from 'bezel-charts/line'; // render and toSVG work for every chart loaded so far
```

| Page | Gzipped |
| --- | --- |
| One sparkline, ring, donut, gauge, progress bar or heatmap | 7.2 to 7.4 kB |
| One line, area, histogram, scatter or bar chart | 9.5 to 10.4 kB |
| A line and a bar chart | 12.6 kB |
| Every chart: the full bundle | 19.0 kB |

Once a page needs four or five different charts, load the full bundle instead. `<bezel-chart type="…">` works with whichever charts are loaded, and tells you which file to add if its type isn't one of them. The classic `iife.js` script always has every chart, because a classic script can't load the shared file.

## The Studio

The [Studio](https://shazmoghaddam.github.io/bezel-charts/site/#studio) is the easiest way to make a chart. No data to hand? Press one of the three sample files under **Import a file** to see a finished chart straight away, or download them from [`site/samples`](site/samples). Then pick a chart type then work through the tabs while the preview updates beside them:

- **Data:** the title, your numbers, labels and series. **Import a file** (CSV, Excel .xlsx or JSON), drop one onto the Studio, or paste cells straight from Excel, Numbers or Google Sheets, and it fills the values, series names and labels in one go.
- **Style:** theme, frame, corners, height, colours and how numbers are written.
- **Extras:** headline number, goal line, notes on key points, and the options that suit that chart, such as a trend line on a scatter plot.

The Studio only offers settings that change the chart you're editing. When you're done, **Copy HTML** gives you the script line and your chart's tag, ready to paste into a page. Untick **Include the script line** when the page already has it. **Save SVG** gives you an image file, and **Copy link** opens your exact chart in the Studio for someone else. The **Customise** button under every example on the site opens that example in the Studio.

### Importing data

The Studio reads the first sheet of an Excel file, CSV (comma or semicolon separated, quoted cells are fine) and JSON. It looks at your columns and fills in the chart for you:

- A text column becomes the labels, and number columns become the values. Line and bar charts take up to six number columns as series; Bars switches to Grouped bars when there's more than one.
- A scatter plot uses the first two number columns for across and up. A text column with a few repeated values, like a team name, splits the points into groups.
- A heatmap uses a date column (2026-03-01, 01/03/2026 or Excel dates) and adds up the values for each day.
- Currency signs and thousands separators are understood, so `£1,200` reads as 1200.

Units are picked up too: a column called `Distance (km)` gets " km" after its numbers, and cells like `£1,200` or `45%` set the £ or %. Dates used as labels are shortened to "1 Jan".

The imported data stays when you switch chart type, so you can try it as a line, then bars, then a donut. **Start over with sample data** clears it. Files stay in your browser: nothing is uploaded.

No file to hand? The Studio has three to try, which you can also download from [`site/samples`](site/samples): monthly sales (grouped bars), study hours against exam scores (a scatter plot with trend lines) and a year of daily runs (a heatmap).

```json
[
  { "month": "Jan", "sales": 1200, "costs": 800 },
  { "month": "Feb", "sales": 1500, "costs": 900 }
]
```

## The charts

Values can be separated with commas, spaces or new lines. Labels are separated with commas.

### `<bezel-spark>`

A sparkline with the latest value up front and its change since the start.

```html
<bezel-spark heading="London · 7 day high" values="17,16,15,15,13,12,14" labels="Mon,Tue,Wed,Thu,Fri,Sat,Sun" suffix="°C"></bezel-spark>
```

| Attribute     | Values                                      | Default |
| ------------- | ------------------------------------------- | ------- |
| `values`      | numbers                                     |         |
| `labels`      | one per value, shown in tooltips            |         |
| `height`      | chart height in px                          | `64`    |
| `straight`    | boolean, straight lines instead of curves   | off     |

Also takes `stat`, `goal`, `notes` and `show-values` from [the shared options](#options-for-every-chart). `stat` is `last` by default here.

### `<bezel-line>`

One or more lines over time, with an axis, a legend and notes on key moments. Separate series with `|`.

```html
<bezel-line heading="Site visitors"
  values="420,460,510,580,620,900|380,400,430,450,470,490"
  series="2026,2025" labels="Jan,Feb,Mar,Apr,May,Jun" notes="Jun:Launch day"></bezel-line>
```

| Attribute     | Values                                      | Default |
| ------------- | ------------------------------------------- | ------- |
| `values`      | numbers, series separated by `\|`           |         |
| `series`      | series names for the legend                 |         |
| `labels`      | one per point, along the bottom             |         |
| `height`      | chart height in px                          | `170`   |
| `zero`        | boolean, start the axis at zero             | off     |
| `straight`    | boolean, straight lines instead of curves   | off     |
| `dash`        | a line style per series: `solid`, `dashed`, `dotted`, `dashdot`. On its own, gives each series the next style | off |
| `markers`     | a shape on each point, per series: `circle`, `square`, `triangle`, `diamond`, `none`. On its own, gives each series the next shape | off |

### `<bezel-area>`

Filled areas over time. Several series overlap as see-through fills, or add `stacked` to pile them up so the top edge is the total, or `stacked="percent"` to show how each total splits. The axis always starts at zero, since an area's height reads as an amount.

```html
<bezel-area heading="Energy mix · GWh" values="120,130,125,140,150,160|80,85,90,88,95,100|40,45,60,70,85,110"
  series="Gas,Nuclear,Wind" labels="2021,2022,2023,2024,2025,2026" stacked></bezel-area>
```

| Attribute     | Values                                                   | Default |
| ------------- | -------------------------------------------------------- | ------- |
| `values`      | numbers, series separated by `\|`                        |         |
| `series`      | series names for the legend                              |         |
| `labels`      | one per point, along the bottom                          |         |
| `stacked`     | with several series: on its own to pile them up, or `percent` to scale each column to 100% | off |
| `height`      | chart height in px                                       | `170`   |
| `straight`    | boolean, straight edges instead of curves                | off     |
| `dash`, `markers` | styles for each series' top edge, as on line charts  | off     |
| `patterns`    | a fill per series, as on bars                            | off     |

The tooltip lists every series, plus the total when stacked, and each series' share in a percent stack. `show-values` writes each value, or the total above each column of a stack. Negative values stack below zero, as stacked bars do, but stacks read best when every value is positive: bands that swing between positive and negative cross over each other.

### `<bezel-bars>`

Bars, vertical or horizontal. Give it more than one series and you get **grouped bars**, side by side with a legend, or add `stacked` to pile each group's series into one bar.

```html
<bezel-bars heading="Revenue by quarter" values="182000,214000,236000,268000|151000,170000,198000,205000"
  series="2026,2025" labels="Q1,Q2,Q3,Q4" prefix="£" compact></bezel-bars>
```

| Attribute     | Values                                                   | Default |
| ------------- | -------------------------------------------------------- | ------- |
| `values`      | numbers, series separated by `\|`                        |         |
| `series`      | series names for the legend                              |         |
| `labels`      | one per bar or group                                     |         |
| `horizontal`  | boolean, bars run left to right with labels beside them  | off     |
| `stacked`     | boolean, with several series, piles them into one bar per group | off |
| `angle-labels` | boolean, slants labels under vertical bars when they don't fit side by side, so every one shows | off |
| `patterns`    | with several series, a fill per series: `solid`, `stripes`, `dots`, `grid`. On its own, gives each series the next pattern | off |
| `highlight`   | `none` to stop the highest bar standing out              | on      |
| `height`      | chart height in px (vertical bars)                       | `140`   |

With a single series and several colours in `color`, each bar takes its own colour.

Stacked bars put positive parts above zero and negative parts below it. The tooltip lists every part and the total, and `show-values` writes the total at the end of each bar. Horizontal stacked bars always show the total.

```html
<bezel-bars heading="Land in a flood zone" values="18.4,16.6,0.1|6.6,24.8,33"
  series="Low or higher,Very Low" labels="Barking and Dagenham,Newham,Southwark"
  suffix="%" decimals="1" stacked angle-labels></bezel-bars>
```

Without `angle-labels`, labels that don't fit take turns, so only every few are shown. With it, they lean at 40 degrees and every one shows, shortened after 24 characters. The tooltip always has the full label.

### `<bezel-histogram>`

How raw values spread out. Give it the values themselves, such as 500 customers' ages, and it counts how many fall into each range. The ranges get round edges (20, 30, 40, not 19.7, 31.4) and a sensible number for the amount of data.

```html
<bezel-histogram heading="Commute times · minutes" values="34,28,41,22,37,30,45,26,33,52,29,38" mark="median"></bezel-histogram>
```

| Attribute     | Values                                                     | Default |
| ------------- | ---------------------------------------------------------- | ------- |
| `values`      | raw numbers, series separated by `\|`                      |         |
| `series`      | series names for the legend                                |         |
| `bins`        | roughly how many ranges                                    | about log₂(n) + 1 |
| `bin-width`   | an exact width for each range, such as `5`                 | automatic |
| `mark`        | `mean`, `median` or `mean,median`: a labelled line for each | none    |
| `percent`     | boolean, shares instead of counts, so groups of different sizes compare | off |
| `patterns`    | with several series, a fill each, as on bars               | off     |
| `height`      | chart height in px                                         | `190`   |

Each range includes its lower edge but not its upper one, except the last, which includes both, so the largest value always counts. Several series share the same ranges and overlap, so their spreads compare directly. `prefix`, `suffix` and `decimals` format the range edges. If you have already counted, use `<bezel-bars>` instead.

### `<bezel-scatter>`

How two measures move together. Pass matching `x` and `y` lists; separate groups with `|`.

```html
<bezel-scatter heading="Study hours vs exam score"
  x="2,3,4,5,6,7,8,9,10" y="48,52,55,63,70,72,75,82,88"
  x-label="Hours studied" y-label="Score" suffix="%" trend></bezel-scatter>
```

| Attribute     | Values                                                         | Default |
| ------------- | -------------------------------------------------------------- | ------- |
| `x`, `y`      | numbers, one of each per point, groups separated by `\|`       |         |
| `series`      | group names for the legend                                     |         |
| `labels`      | point names, shown in tooltips                                 |         |
| `x-label`, `y-label` | axis titles                                             |         |
| `trend`       | boolean, a least-squares line per group with Pearson's r      | off     |
| `markers`     | a point shape per group: `circle`, `square`, `triangle`, `diamond`. On its own, gives each group the next shape | circles |
| `zero`        | boolean, start the y axis at zero                              | off     |
| `height`      | chart height in px                                             | `210`   |

`prefix`, `suffix` apply to y. Notes point at a point by its position, counting from 0 across all groups, or by its label.

### `<bezel-ring>`

A progress ring, or several nested like an activity tracker.

```html
<bezel-ring heading="Today" values="72,45,90" labels="Move,Focus,Sleep"></bezel-ring>
```

| Attribute     | Values                                      | Default |
| ------------- | ------------------------------------------- | ------- |
| `values`      | one number per ring                         |         |
| `labels`      | one per ring                                |         |
| `max`         | the value that fills a ring                 | `100`   |
| `height`      | chart height in px                          | `140`   |

With `max` at 100 and no `prefix` or `suffix`, values show as percentages.

### `<bezel-donut>`

How a total splits into parts. More than six slices are grouped into "Other".

```html
<bezel-donut heading="Monthly budget" values="1200,420,210,160,140" labels="Rent,Food,Bills,Travel,Fun" prefix="£"></bezel-donut>
```

| Attribute      | Values                       | Default  |
| -------------- | ---------------------------- | -------- |
| `values`       | one number per slice         |          |
| `labels`       | one per slice                |          |
| `center-label` | the word under the total     | `Total`  |
| `height`       | chart height in px           | `150`    |

### `<bezel-gauge>`

A reading on a scale, optionally coloured by zone.

```html
<bezel-gauge heading="Server load" values="63" labels="CPU" zones="60,85" goal="80"></bezel-gauge>
```

| Attribute     | Values                                                          | Default |
| ------------- | --------------------------------------------------------------- | ------- |
| `values`      | the reading                                                     |         |
| `labels`      | a caption under the reading                                     |         |
| `min`, `max`  | the ends of the scale                                           | `0`, `100` |
| `zones`       | breakpoints, e.g. `60,85`: green, then amber, then red          |         |
| `goal`        | a marker on the scale                                           |         |
| `height`      | chart height in px                                              | `130`   |

Pass several colours in `color` to choose the zone colours yourself.

### `<bezel-progress>`

A progress bar, or stacked parts against a target.

```html
<bezel-progress heading="Sprint 14" values="18,6,3" labels="Done,In review,Blocked" max="34" goal="27"></bezel-progress>
```

| Attribute     | Values                                       | Default |
| ------------- | -------------------------------------------- | ------- |
| `values`      | one number, or one per segment               |         |
| `labels`      | one per segment                              |         |
| `max`         | the full length of the bar                   | `100` for one value, otherwise the total |
| `goal`        | a marker on the bar                          |         |

### `<bezel-heatmap>`

Activity by day, GitHub style, with Monday at the top.

```html
<bezel-heatmap heading="Contributions" start="2026-01-01" values="0,3,5,1,0,2,8,4" suffix=" commits"></bezel-heatmap>
```

| Attribute     | Values                                      | Default |
| ------------- | ------------------------------------------- | ------- |
| `values`      | one number per day                          |         |
| `start`       | the first day, `YYYY-MM-DD`                 | so the last value is today |

On narrow screens the heatmap shows the most recent weeks that fit rather than shrinking the squares.

### `<bezel-chart>`

Any of the above, picked with `type`: `<bezel-chart type="donut" values="3,2,1">`. Handy when the chart type comes from data.

## Options for every chart

| Attribute       | Values                                                          | Default       |
| --------------- | --------------------------------------------------------------- | ------------- |
| `heading`       | a title above the chart                                         |               |
| `prefix`        | text before numbers, e.g. `£`                                   |               |
| `suffix`        | text after numbers, e.g. `%` or ` kg`                           |               |
| `decimals`      | decimal places, `0` to `6`                                      | automatic     |
| `compact`       | boolean, writes big numbers short, e.g. `12.5k`                 | off           |
| `lang`          | a locale for numbers and dates, e.g. `fr-FR`, `fa-IR`           | `en-GB`       |
| `theme`         | `auto`, `dark`, `light`                                         | `auto`        |
| `frame`         | `bezel`, `none`                                                 | `bezel`       |
| `corners`       | corner radius in px                                             | `22`          |
| `color`         | one colour, or a comma list for series, slices or zones         | theme palette |
| `background`    | the tile colour                                                 | from theme    |
| `stat`          | a headline number: `last`, `total`, `average`, `max`, `min`, `none` | `none`    |
| `delta`         | with `stat="last"`: `inverse` when falling is good, `none` to hide the change |  |
| `delta-label`   | wording after the change                                        | `since start` |
| `goal`          | a dashed goal line, or a marker on gauges and progress bars     |               |
| `goal-label`    | wording for the goal line                                       | `Goal`        |
| `notes`         | `point:text` pairs separated by `;`, e.g. `Jun:Launch;9:Peak`. A point is a label or, if no label matches, a position counted from 0 | |
| `show-values`   | boolean, writes each value on the chart                         | off           |
| `width`         | a fixed width in px instead of filling the container            |               |
| `no-tooltips`   | boolean, turns off hover, tap and keyboard values, and leaves the chart out of the Tab order | off |
| `static`        | boolean, skips the entrance animation                           | off           |

Not every option suits every chart: `notes` works on spark, line, area and scatter; `show-values` on spark, line, area and bars; `goal-label` on spark, line, area, bars and scatter; `stat` on everything except the gauge and scatter. The Studio only shows what applies.

## Colours and dark mode

With `theme="auto"` (the default) a chart follows the viewer's light or dark setting, and redraws when it changes. A page can also force one by setting `data-theme="light"` or `data-theme="dark"` on `<html>`. Each theme has its own palette, picked to read well on its background:

| Theme | Palette |
| ----- | ------- |
| Dark  | `#9FA1FF` `#F675A8` `#5EE6C8` `#FFC857` `#7CC4FF` `#FF8A5B` |
| Light | `#6E70F0` `#E2508C` `#16A884` `#D99A0E` `#2F8FE0` `#EE6431` |

Set `color` to use your own. Colours you set stay the same in both themes, so choose ones with enough contrast against both tile colours, or set `theme` to fix one.

## Accessibility

Every chart works without a mouse and without seeing it.

**Keyboard.** Press Tab to reach a chart. A focus ring shows where you are, then:

| Key | Does |
| --- | --- |
| Right or Down | The next value |
| Left or Up | The previous value |
| Home, End | The first or last value |
| Escape | Hides the tooltip |

The value you're on is outlined, with its tooltip showing. On a heatmap, Left and Right move a week and Up and Down move a day, following the grid. A chart keeps its place when it redraws, for example when the window resizes.

**Screen readers** hear the chart's name and summary, a hint about the arrow keys, and each value as you move, such as "Tue: 9. 2 of 7". Each chart also carries a hidden table of its data, with every value, including the small donut slices grouped as "Other" and the early weeks a narrow heatmap leaves out.

**Telling series apart.** Colour alone isn't enough for everyone, so lines can have their own dash, points their own shape, and grouped or stacked bars their own pattern. Use the attribute on its own to hand out styles in turn, or list one per series, in the same order as `color`:

```html
<bezel-line values="420,460,510|380,400,430" series="2026,2025" dash markers></bezel-line>
<bezel-bars values="4,9,6|3,7,8" series="2026,2025" labels="Q1,Q2,Q3" patterns="solid,stripes"></bezel-bars>
```

The legend shows each style, so it still matches the chart in black and white.

**Fewer tab stops.** A page with many charts gets a tab stop for each. Add `no-tooltips` to a chart that doesn't need exact values, such as a decorative sparkline: it drops the tooltips and the tab stop, and keeps the name and the hidden table.

**Images.** An exported SVG is a picture, so give it alt text that says what it shows: `![Commits this week: highest Tue 9](docs/commits.svg)`. The Python package writes this for you with `chart.alt`.

## Charts in a README

GitHub doesn't run scripts in a README, but it shows SVG images. So:

1. Build your chart in the [Studio](https://shazmoghaddam.github.io/bezel-charts/site/#studio) and press **Save SVG**. The image is drawn at the preview width.
2. Commit the file to your repository, e.g. `docs/commits.svg`.
3. Add it to your README:

```md
![Commits this week: highest Tue 9](docs/commits.svg)
```

Make the alt text say what the chart shows, since that's all a screen reader gets from an image.

The SVG is self-contained: no scripts, no fonts to load, no tooltips. It uses the system font, so it looks at home on GitHub, in Notion and in slides.

## JavaScript API

Every chart element has:

- `toSVG()`: the chart as a static SVG string.
- `download(name)`: saves the chart as an `.svg` file.
- `options`: the current settings as a plain object.
- `refresh()`: redraws without replaying the animation.

It fires a `bezel-render` event each time it draws.

The module also exports `render(type, options)` and `toSVG(type, options)`, which return SVG strings without touching the DOM. They take the same option names as the attributes and run anywhere, including Node:

```js
import { toSVG } from 'bezel-charts';
import { writeFileSync } from 'node:fs';

writeFileSync('downloads.svg', toSVG('bars', { heading: 'Downloads', values: [120, 340, 410], labels: 'Jan,Feb,Mar', width: 480 }));
```

## Python

The [Python package](python/) draws the same charts from a pandas DataFrame, a NumPy array or a plain list, with no dependencies. Charts show up in Jupyter and save as static SVGs:

```sh
pip install bezel-charts
```

```python
import bezel_charts as bc

bc.line(df, x="month", y=["sales", "costs"], heading="Sales", prefix="£")
bc.spark(df["signups"], heading="Signups").save("docs/signups.svg")
```

All twelve charts are available, and the Python output matches the JavaScript byte for byte, checked in CI. `chart.alt` gives ready-made alt text for the saved image. See the [Python README](python/README.md).

## Frameworks

Bezel Charts are standard custom elements, so they work anywhere HTML does. Set attributes as strings.

**React 19+**

```jsx
<bezel-line values={data.join(',')} labels={months.join(',')} heading="Sales" />
```

**Vue**

```vue
<bezel-donut :values="parts.join(',')" heading="Budget" />
```

In Vue, tell the compiler these are custom elements with `compilerOptions.isCustomElement: (tag) => tag.startsWith('bezel-')`.

## Development

```sh
git clone https://github.com/ShazMoghaddam/bezel-charts.git
cd bezel-charts
npm install
npm run serve        # http://localhost:4173/site/
npm run check        # build, run the tests, and check the size budget
npm run test:browser # click through every Studio control in a real browser (needs Python and Playwright)
```

```
src/
  core/        shared helpers, the bezel frame and the colour themes; series.js has the extras for line, area, bars
               and scatter, and xy.js the axis frame line and area charts share
  charts/      one file per chart type: options in, SVG string out
  render.js    picks the chart and returns its SVG
  element.js   the custom element: sizing, theme, tooltips, keyboard and export
  entries/     one file per chart that registers it and defines its tag, for per-chart imports
site/          the website and Studio, with sample files in site/samples
python/        the Python package, with parity tests against the JavaScript
docs/          the README image and social preview, with the pages that render them
test/          node:test suites, plus a Playwright browser test
```

Each chart is a pure function that takes its options and a theme and returns an SVG string, which keeps them easy to test and lets the same code run in Node. The full bundle has a 20 kB gzip budget and each chart file its own, checked in CI by `npm run size`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Found a security problem? Please report it privately through GitHub rather than in an issue. [SECURITY.md](SECURITY.md) explains how, and which versions get fixes.

## Credits

Typeface Geist (SIL Open Font License) on the website; the charts themselves use the system font. Designed and built by [Shaz Moghaddam](https://shazmoghaddam.github.io), London.

## Licence

[MIT](LICENSE)
