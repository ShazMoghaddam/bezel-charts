// Fails when the minified bundle grows past its gzip budget, so size never creeps up unnoticed.
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 14;
const bytes = gzipSync(await readFile('dist/bezel-charts.min.js'), { level: 9 }).length;
const kb = bytes / 1024;
console.log(`dist/bezel-charts.min.js gzipped: ${kb.toFixed(1)} kB (budget ${BUDGET_KB} kB)`);
if (kb > BUDGET_KB) {
  console.error(`Over budget by ${(kb - BUDGET_KB).toFixed(1)} kB.`);
  process.exit(1);
}
