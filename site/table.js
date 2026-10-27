// Turns data files and pasted spreadsheet cells into labelled columns the Studio can chart.
// Pure functions apart from readXlsx, which needs the browser's DecompressionStream and DOMParser.

export const MAX_ROWS = 5000;

const cleanNum = (s) => String(s).trim().replace(/[£$€¥%\s]/g, '').replace(/,(?=\d{3}\b)/g, '');
export const isNum = (s) => s != null && cleanNum(s) !== '' && Number.isFinite(Number(cleanNum(s)));
export const toNum = (s) => (isNum(s) ? Number(cleanNum(s)) : 0);

/* ---------- dates ---------- */

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const validDate = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};

/** Reads 2026-03-01, 2026/03/01 or the UK order 01/03/2026 (with an optional time after it). Returns YYYY-MM-DD or null. */
export function parseDate(s) {
  const v = String(s ?? '').trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(v);
  if (m && validDate(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\s.*)?$/.exec(v);
  if (m && validDate(+m[3], +m[2], +m[1])) return iso(+m[3], +m[2], +m[1]);
  return null;
}

/** Excel stores dates as days since 30 December 1899. */
export function excelDate(serial) {
  const t = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 864e5);
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/* ---------- reading files ---------- */

/** CSV, semicolon-separated CSV or TSV, with quoted cells. */
export function parseDelimited(text) {
  const src = String(text).replace(/^﻿/, '');
  const first = src.slice(0, src.search(/\r?\n|$/));
  const outside = first.replace(/"[^"]*"/g, '');
  const counts = { '\t': outside.split('\t').length, ';': outside.split(';').length, ',': outside.split(',').length };
  const delim = counts['\t'] > 1 ? '\t' : counts[';'] > counts[','] ? ';' : ',';
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.trim() === '') { quoted = true; cell = ''; }
    else if (ch === delim) { row.push(cell.trim()); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell.trim()); rows.push(row); }
  const out = rows.filter((r) => r.some((c) => c !== ''));
  // Semicolon files usually come from places that write 1.234,5 for 1234.5.
  if (delim === ';') {
    for (const r of out) for (let c = 0; c < r.length; c++) {
      if (/^-?[\d.]*\d,\d+$/.test(r[c].replace(/[£$€%\s]/g, ''))) r[c] = r[c].replace(/\./g, '').replace(',', '.');
    }
  }
  return out;
}

/** An array of objects, an array of rows, a list of numbers, or an object of columns. */
export function parseJSON(text) {
  let data;
  try { data = JSON.parse(String(text).replace(/^﻿/, '')); }
  catch { throw new Error("That JSON file couldn't be read. Check it's valid JSON."); }
  if (data && !Array.isArray(data) && typeof data === 'object') {
    const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v));
    if (arrays.length && arrays.every(([, v]) => v.every((x) => x === null || typeof x !== 'object'))) {
      const n = Math.max(...arrays.map(([, v]) => v.length));
      return [arrays.map(([k]) => k), ...Array.from({ length: n }, (_, i) => arrays.map(([, v]) => cellText(v[i])))];
    }
    const inner = arrays.find(([, v]) => v.length && typeof v[0] === 'object');
    if (inner) data = inner[1];
  }
  if (!Array.isArray(data) || !data.length) throw new Error('The JSON needs a list of rows, like [{"month": "Jan", "sales": 120}, ...].');
  if (data.every((x) => x === null || typeof x !== 'object')) return [['Value'], ...data.map((x) => [cellText(x)])];
  if (data.every(Array.isArray)) return data.map((r) => r.map(cellText));
  const keys = [];
  for (const obj of data) if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) if (!keys.includes(k)) keys.push(k);
  return [keys, ...data.map((obj) => keys.map((k) => cellText(obj?.[k])))];
}
const cellText = (v) => (v == null ? '' : typeof v === 'object' ? '' : String(v));

/* ---------- Excel ---------- */

async function unzip(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("That doesn't look like an Excel .xlsx file.");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries = new Map(), dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true), size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true), extra = view.getUint16(p + 30, true), comment = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    entries.set(dec.decode(bytes.subarray(p + 46, p + 46 + nameLen)), { method, size, local });
    p += 46 + nameLen + extra + comment;
  }
  return async (name) => {
    const e = entries.get(name);
    if (!e) return null;
    const start = e.local + 30 + view.getUint16(e.local + 26, true) + view.getUint16(e.local + 28, true);
    const raw = bytes.subarray(start, start + e.size);
    if (e.method === 0) return dec.decode(raw);
    if (e.method !== 8 || typeof DecompressionStream !== 'function') throw new Error("This browser can't open .xlsx files. Save the sheet as CSV and import that instead.");
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  };
}

const xml = (text) => new DOMParser().parseFromString(text, 'application/xml');
const byTag = (node, tag) => [...node.getElementsByTagName(tag)];
const colIndex = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const BUILTIN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/** Reads the first sheet of an Excel workbook into rows of text. Dates come out as YYYY-MM-DD. */
export async function readXlsx(buffer) {
  const read = await unzip(buffer);
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
  if (wb && rels) {
    const first = byTag(xml(wb), 'sheet')[0];
    const id = first?.getAttribute('r:id') || first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rel = byTag(xml(rels), 'Relationship').find((r) => r.getAttribute('Id') === id);
    if (rel) {
      const target = rel.getAttribute('Target');
      sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`.replace(/\/\.\//g, '/');
    }
  }
  const sheetText = await read(sheetPath);
  if (!sheetText) throw new Error("Couldn't find a sheet in that workbook.");
  const shared = [];
  const ss = await read('xl/sharedStrings.xml');
  if (ss) for (const si of byTag(xml(ss), 'si')) shared.push(byTag(si, 't').map((t) => t.textContent).join(''));
  const dateStyles = new Set();
  const st = await read('xl/styles.xml');
  if (st) {
    const doc = xml(st), custom = new Map();
    for (const f of byTag(doc, 'numFmt')) custom.set(+f.getAttribute('numFmtId'), f.getAttribute('formatCode') || '');
    const xfs = byTag(doc, 'cellXfs')[0];
    if (xfs) byTag(xfs, 'xf').forEach((xf, i) => {
      const id = +xf.getAttribute('numFmtId');
      const code = (custom.get(id) || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, '');
      if (BUILTIN_DATES.has(id) || /[dy]/i.test(code)) dateStyles.add(i);
    });
  }
  const rows = [];
  for (const r of byTag(xml(sheetText), 'row')) {
    if (rows.length > MAX_ROWS) break;
    const row = [];
    let next = 0;
    for (const c of byTag(r, 'c')) {
      const ref = c.getAttribute('r'), i = ref ? colIndex(ref) : next;
      next = i + 1;
      const type = c.getAttribute('t'), v = byTag(c, 'v')[0]?.textContent ?? '';
      let text;
      if (type === 's') text = shared[+v] ?? '';
      else if (type === 'inlineStr') text = byTag(c, 't').map((t) => t.textContent).join('');
      else if (type === 'b') text = v === '1' ? 'TRUE' : 'FALSE';
      else if (type === 'str' || type === 'e') text = v;
      else text = v !== '' && dateStyles.has(+c.getAttribute('s')) ? excelDate(+v) : v;
      row[i] = text;
    }
    rows.push(Array.from(row, (x) => x ?? ''));
  }
  return rows.filter((r) => r.some((c) => c !== ''));
}

/** Reads a File (CSV, TSV, TXT, JSON or XLSX) into rows. */
export async function readFile(file) {
  const name = file.name.toLowerCase();
  if (file.size > 10 * 1024 * 1024) throw new Error('That file is over 10 MB. Try a smaller extract of the data.');
  if (name.endsWith('.xls')) throw new Error('Old .xls files aren\'t supported. In Excel, save it as .xlsx or CSV.');
  if (name.endsWith('.xlsx')) return readXlsx(await file.arrayBuffer());
  const text = await file.text();
  if (name.endsWith('.json') || /^\s*[[{]/.test(text)) return parseJSON(text);
  return parseDelimited(text);
}

/* ---------- understanding the table ---------- */

/**
 * Works out the header, the label column, the number columns and any date or group column.
 * Returns null when there are no numbers to chart.
 */
export function describe(rows) {
  rows = rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!rows.length) return null;
  const cols = Math.max(...rows.map((r) => r.length));
  const filled = (r, c) => r[c] != null && String(r[c]).trim() !== '';
  const kindOf = (body, c) => {
    const vals = body.filter((r) => filled(r, c)).map((r) => String(r[c]));
    if (!vals.length) return 'empty';
    if (vals.every((v) => parseDate(v))) return 'date';
    if (vals.every(isNum)) return 'number';
    return 'text';
  };
  // The first row is a header when it holds words above columns of numbers or dates.
  const header = rows.length > 1 && rows[0].some((cell, c) =>
    filled(rows[0], c) && !isNum(cell) && !parseDate(cell) && ['number', 'date'].includes(kindOf(rows.slice(1), c)));
  let body = header ? rows.slice(1) : rows;
  const truncated = body.length > MAX_ROWS;
  if (truncated) body = body.slice(0, MAX_ROWS);
  const columns = Array.from({ length: cols }, (_, c) => ({
    index: c,
    name: header && filled(rows[0], c) ? String(rows[0][c]).trim() : '',
    kind: kindOf(body, c),
  }));
  const numbers = columns.filter((c) => c.kind === 'number');
  if (!numbers.length) return null;
  const texts = columns.filter((c) => c.kind === 'text');
  const dates = columns.filter((c) => c.kind === 'date');
  // A text column with a handful of repeated values reads as groups, e.g. Team A / Team B.
  const distinct = (c) => new Set(body.map((r) => String(r[c.index] ?? '').trim())).size;
  const group = texts.find((c) => body.length >= 4 && distinct(c) >= 2 && distinct(c) <= 6 && distinct(c) < body.length / 2) || null;
  const label = texts.find((c) => c !== group) || dates[0] || group || null;
  const unnamed = (c, i) => c.name || (numbers.length > 1 ? `Series ${i + 1}` : '');
  // Units come from the column name, like "Distance (km)", or from the cells, like "£1,200" or "45%".
  const unitOf = (c) => {
    const cells = body.map((r) => String(r[c.index] ?? '').trim()).filter(Boolean);
    const most = (re) => cells.length && cells.filter((v) => re.test(v)).length >= cells.length / 2;
    const m = /\(([^()]{1,12})\)\s*$/.exec(c.name);
    const u = m ? m[1].trim() : '';
    if (/^[£$€¥]$/.test(u) || most(/^-?[£$€¥]/)) return { prefix: /^[£$€¥]$/.test(u) ? u : cells.find((v) => /^-?[£$€¥]/.test(v)).replace(/^-/, '')[0], suffix: '' };
    if (u === '%' || most(/%$/)) return { prefix: '', suffix: '%' };
    return { prefix: '', suffix: u ? ` ${u}` : '' };
  };
  return {
    body,
    truncated,
    label,
    date: dates[0] || null,
    group,
    numbers: numbers.map((c, i) => ({ ...c, name: unnamed(c, i), ...unitOf(c) })),
    cell: (r, c) => String(r[c.index] ?? '').trim(),
  };
}

/** Adds up values per day from the first to the last date, filling missing days with 0. Keeps the latest two years. */
export function daily(table, numberCol) {
  const sums = new Map();
  for (const r of table.body) {
    const d = parseDate(table.cell(r, table.date));
    if (d) sums.set(d, (sums.get(d) || 0) + toNum(table.cell(r, numberCol)));
  }
  const days = [...sums.keys()].sort();
  if (!days.length) return null;
  let start = new Date(days[0] + 'T00:00:00Z');
  const end = new Date(days[days.length - 1] + 'T00:00:00Z');
  const span = Math.round((end - start) / 864e5) + 1;
  if (span > 731) start = new Date(end.getTime() - 730 * 864e5);
  const values = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 864e5) values.push(sums.get(new Date(t).toISOString().slice(0, 10)) || 0);
  return { start: start.toISOString().slice(0, 10), values, clipped: span > 731 };
}
