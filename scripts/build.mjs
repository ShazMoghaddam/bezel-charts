// Builds the distributable bundles: the full ES module (plain and minified), the full script-tag build, and one
// minified ES module per chart in dist/charts, which share their common code through one shared file.
import { build } from 'esbuild';
import { mkdir, rm, stat, readdir } from 'node:fs/promises';
import { NAMES } from '../src/render.js';

const banner = { js: `/*! Bezel Charts v${process.env.npm_package_version ?? '1.3.0'} | MIT | github.com/ShazMoghaddam/bezel-charts */` };
const common = { bundle: true, target: ['es2022', 'safari16.4'], banner, legalComments: 'none' };

// Old shared files have a different name once the code changes, so start the chart folder from scratch.
await rm('dist/charts', { recursive: true, force: true });
await mkdir('dist/charts', { recursive: true });
await Promise.all([
  build({ ...common, entryPoints: ['src/index.js'], format: 'esm', outfile: 'dist/bezel-charts.js' }),
  build({ ...common, entryPoints: ['src/index.js'], format: 'esm', minify: true, outfile: 'dist/bezel-charts.min.js' }),
  build({ ...common, entryPoints: ['src/index.js'], format: 'iife', globalName: 'BezelCharts', minify: true, outfile: 'dist/bezel-charts.iife.js' }),
  build({
    ...common, entryPoints: NAMES.map((t) => `src/entries/${t}.js`), format: 'esm', minify: true,
    splitting: true, outdir: 'dist/charts', chunkNames: 'shared-[hash]',
  }),
]);

const files = ['dist/bezel-charts.js', 'dist/bezel-charts.min.js', 'dist/bezel-charts.iife.js', ...(await readdir('dist/charts')).sort().map((f) => `dist/charts/${f}`)];
for (const f of files) {
  const { size } = await stat(f);
  console.log(`${f.padEnd(34)} ${(size / 1024).toFixed(1)} kB`);
}
