// Fails when a bundle grows past its gzip budget, so size never creeps up unnoticed.
// The full bundle has one budget, and each chart file has its own, counting the shared file it loads too.
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { NAMES } from '../src/render.js';

const FULL_KB = 24;
const CHART_KB = { spark: 8, line: 10, area: 11, bars: 11, combo: 12, histogram: 10, boxplot: 10, scatter: 10, ring: 8, donut: 8, gauge: 8, progress: 8, heatmap: 8 };

const gz = async (f) => gzipSync(await readFile(f), { level: 9 }).length / 1024;

// A chart file plus every shared file it imports, each counted once, as a browser downloads them.
async function chartKB(type) {
  const seen = new Set(), todo = [`${type}.js`];
  let kb = 0;
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const src = await readFile(`dist/charts/${f}`, 'utf8');
    kb += await gz(`dist/charts/${f}`);
    for (const m of src.matchAll(/from\s*"\.\/([\w-]+\.js)"|import\s*"\.\/([\w-]+\.js)"/g)) todo.push(m[1] || m[2]);
  }
  return kb;
}

const rows = [['dist/bezel-charts.min.js', await gz('dist/bezel-charts.min.js'), FULL_KB]];
for (const t of NAMES) rows.push([`dist/charts/${t}.js`, await chartKB(t), CHART_KB[t]]);

let over = 0;
for (const [name, kb, budget] of rows) {
  const flag = kb > budget ? `  over by ${(kb - budget).toFixed(1)} kB` : '';
  if (flag) over++;
  console.log(`${name.padEnd(28)} ${kb.toFixed(1).padStart(5)} kB gzipped (budget ${budget} kB)${flag}`);
}
if (over) {
  console.error(`${over} over budget.`);
  process.exit(1);
}
