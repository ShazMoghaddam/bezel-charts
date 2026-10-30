# Changelog (Python package)

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
