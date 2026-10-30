# Changelog (Python package)

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
