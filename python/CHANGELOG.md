# Changelog (Python package)

## 0.1.0 (unreleased)

First release of the Python companion to Bezel Charts.

- `bc.spark()` and `bc.line()` take a pandas DataFrame or Series, a NumPy array, a dict or a plain list, and return a `Chart` that shows up in Jupyter, saves as an `.svg` file and converts to an SVG string.
- `bc.to_svg()` and `bc.render()` mirror the JavaScript functions of the same names and take the same options, in snake_case, kebab-case or camelCase.
- The output matches the web components byte for byte, checked against fixtures generated from the JavaScript on every pull request.
- Zero dependencies. Python 3.10 or newer.
