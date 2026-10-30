# Contributing to Bezel Charts

Thanks for helping. Bug reports, new options and new chart types are all welcome.

## Setup

```sh
npm install
npm run serve   # then open http://localhost:4173/site/
npm run check   # build, tests and the size budget
```

There's no build step for development: the site loads `src/` directly as ES modules. Run `npm run build` before you commit, so `dist/` matches `src/`. CI checks this.

The browser test needs Python and Playwright:

```sh
pip install playwright && python3 -m playwright install chromium
npm run test:browser
```

## Adding an option

1. Read it in the chart files that should use it. Options arrive camelCased, so `goal-label` is `o.goalLabel`.
2. Add the attribute name to `ATTRIBUTES` in `src/element.js`.
3. Add a control to `FIELDS` in `site/studio.js`, with `only` listing the charts it changes, and add it to `ORDER` so the generated code puts it in a sensible place.
4. Document it in the README.

## Adding a chart type

1. Create `src/charts/your-chart.js` exporting a function `(o, th) => svg string`. Use `tile()` from `src/core/tile.js` for the frame, heading and headline number, and the helpers in `src/core/util.js` for parsing, formatting and text.
2. Register it in `TYPES` in `src/render.js`. That also defines `<bezel-your-chart>`.
3. Add cases to `test/render.test.js`, including empty data, one value, negatives and very large numbers.
4. If the chart exists in the Python package, add the same cases to `scripts/py-fixtures.mjs` and run `npm run fixtures`.
5. Add it to `CHARTS`, `PRESETS` and the relevant `FIELDS` in `site/studio.js`, and add an example card to `site/index.html`.

## The Python package

`python/` holds a line-by-line port of the renderers. Its tests compare the Python output with fixtures drawn by the JavaScript, so the two can't drift apart.

```sh
npm run fixtures                          # redraw python/tests/fixtures from src/
cd python && pip install -e ".[test]" && pytest
```

Change a chart in `src/charts/` and its port in `python/src/bezel_charts/charts/` in the same pull request. CI regenerates the fixtures and fails if they differ from the committed ones.

## Guidelines

- No runtime dependencies.
- Charts are pure: the same options and theme always give the same SVG.
- Escape any text that comes from attributes with `esc()`.
- Give every mark a `data-tip` or a `hit()` target so it has a tooltip, and a summary for screen readers.
- Respect `prefers-reduced-motion`, and keep animation in the classes from `src/core/tile.js`.
- Check new work at phone, tablet and desktop widths, in light and dark.
- Keep the gzipped bundle within the budget in `scripts/size.mjs`.
- Run `npm run check` before opening a pull request.
