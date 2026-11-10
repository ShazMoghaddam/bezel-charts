# Changelog (Python package)

## 1.8.0 (2026-11-10)

- **Changed:** when `x=` or the index holds real dates (a `datetime64` column, `datetime.date` or `Timestamp` values), `bc.line()` and `bc.area()` now space the points in time, with date steps on the axis and full dates in tooltips. Before, the dates became evenly spaced labels. Charts of irregular dates will look different, and correct. `x_format` still names the points; pass `dates=None` to keep the old even spacing. Text that only looks like a date is unchanged.
- `min=`, `max=` and `log=True`, matching the web components, with 26 parity cases covering dates, ranges and log scales.

## 1.7.0 (2026-11-10)

- `bc.combo()`: bars and lines on two axes, from a DataFrame with `x=`, `bars=` and `line=`, or from lists. Single columns keep their names for the legend. Matches `<bezel-combo>` byte for byte, with 12 parity cases.
- The histogram now uses the package's existing `toFixed` helper rather than a second copy of it.

## 1.6.0 (2026-11-09)

- `bc.boxplot()`: box plots from a list, Series, dict, DataFrame columns, or a long DataFrame with `y=` and `by=`. Quartiles match pandas. `whiskers="range"`, `mark="mean"` and `horizontal=True`. Matches `<bezel-boxplot>` byte for byte, with 13 parity cases.

## 1.5.0 (2026-11-09)

- `bc.histogram()`: counts raw values from a Series, list, DataFrame or dict into round ranges, with `bins=`, `bin_width=`, `mark="mean,median"` and `percent=True`. Counts and edges match `<bezel-histogram>` exactly, including values on an edge, with 18 parity cases.

## 1.4.0 (2026-11-09)

The Python package skips 1.3.0, which only changed how the web components load, so both packages are 1.4.0 again.

- `bc.area()`: filled areas over time from a DataFrame, Series, dict or lists. `stacked=True` piles the series up and `stacked="percent"` shows each column as shares of 100%. Matches `<bezel-area>` byte for byte, with 15 parity cases.
- `chart.alt` lists the values for single-series area charts too.

## 1.2.0 (2026-11-09)

- `dash`, `markers` and `patterns` tell series apart without relying on colour, matching the web components. Pass `True` to hand out styles in turn, or a list with one per series: `dash=["solid", "dashed"]`.
- `chart.alt` gives ready-made alt text for a saved SVG: the title, the summary and up to 12 values with their labels.
- 16 more parity cases against the JavaScript.

## 1.1.0 (2026-11-07)

- `stacked=True` piles several series into one bar per group, matching the web components' new `stacked` option.
- `angle_labels=True` slants labels under vertical bars when they don't fit, so every one shows.
- 11 more parity cases against the JavaScript.

## 1.0.1 (2026-11-02)

- Notes now work on charts whose labels are numbers, such as years. `notes={"1980": "Boycott"}` used to be read as position 1980, so the note silently disappeared. A label now wins, and a whole number that matches no label is still a position. If your labels are numbers and you used a note like `{1: "Text"}` to mean a position, it now points at the label `1`.
- 3 more parity cases against the JavaScript.

## 1.0.0 (2026-10-30)

All ten charts, matching the web components.

- `bc.gauge()`: a half-circle gauge for one value, with `zones=` for green, amber and red bands, a `goal=` marker and a `label=` under the number.
- `bc.progress()`: a progress bar from one number, or stacked parts with a legend from a list, dict, Series or DataFrame.
- 23 more parity cases against the JavaScript: 119 chart cases across the ten charts, each checked static, interactive and animated, plus 689 number formatting and scale cases.
- The "coming in a later release" errors are gone, since every chart type is now here.

## 0.4.0 (2026-10-30)

- `bc.ring()`: progress rings, a single large ring or several nested ones with a legend, out of 100 unless you set `max`.
- `bc.donut()`: parts of a whole with the total in the middle. More than six parts keep the five largest and group the rest as "Other".
- Both take a list, a dict of name to value, a Series such as `value_counts()`, or a DataFrame with `x=` and `y=`.
- 23 more parity cases against the JavaScript.

## 0.3.0 (2026-10-30)

- `bc.scatter()`: scatter plots from two DataFrame columns or two lists, with `by=` for coloured groups, `label=` for naming points, and `trend=True` for a least-squares line labelled with Pearson's r. Column names become the axis titles. Points with a missing x or y are left out, with a warning.
- `bc.heatmap()`: calendar heatmaps from a Series with a date index, a DataFrame date column, a list of dates (each day counts its rows) or plain daily numbers. Missing days are filled with 0.
- Dates in heatmap tooltips follow `en-GB` or `en-US`, matching the browser exactly (including "Sept").
- 24 more parity cases against the JavaScript, plus a check of the trend line against NumPy.

## 0.2.0 (2026-10-30)

- `bc.bars()`: vertical and horizontal bar charts, single or grouped. Several DataFrame columns, a dict or a list of lists become grouped bars with a legend, and a Series such as `value_counts()` uses its index as labels.
- The highest bar is highlighted unless you pass `highlight="none"`, and several colours give each bar its own.
- 19 more parity cases against the JavaScript, covering negatives, goals, long labels, emoji, compact numbers and wrapping legends.

## 0.1.0 (2026-10-30)

First release of the Python companion to Bezel Charts.

- `bc.spark()` and `bc.line()` take a pandas DataFrame or Series, a NumPy array, a dict or a plain list, and return a `Chart` that shows up in Jupyter, saves as an `.svg` file and converts to an SVG string.
- `bc.to_svg()` and `bc.render()` mirror the JavaScript functions of the same names and take the same options, in snake_case, kebab-case or camelCase.
- The output matches the web components byte for byte, checked against fixtures generated from the JavaScript on every pull request.
- Zero dependencies. Python 3.10 or newer.
