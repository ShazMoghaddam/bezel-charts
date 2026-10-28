// Builds the distributable bundles: an ES module, a minified ES module and a script-tag build.
import { build } from 'esbuild';
import { mkdir, stat } from 'node:fs/promises';

const banner = { js: `/*! Bezel Charts v${process.env.npm_package_version ?? '1.0.1'} | MIT | github.com/ShazMoghaddam/bezel-charts */` };
const common = { entryPoints: ['src/index.js'], bundle: true, target: ['es2022', 'safari16.4'], banner, legalComments: 'none' };

await mkdir('dist', { recursive: true });
await Promise.all([
  build({ ...common, format: 'esm', outfile: 'dist/bezel-charts.js' }),
  build({ ...common, format: 'esm', minify: true, outfile: 'dist/bezel-charts.min.js' }),
  build({ ...common, format: 'iife', globalName: 'BezelCharts', minify: true, outfile: 'dist/bezel-charts.iife.js' }),
]);

for (const f of ['dist/bezel-charts.js', 'dist/bezel-charts.min.js', 'dist/bezel-charts.iife.js']) {
  const { size } = await stat(f);
  console.log(`${f.padEnd(28)} ${(size / 1024).toFixed(1)} kB`);
}
