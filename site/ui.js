// Small page helpers shared by the showcase and the Studio.

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2000);
}

/** Copies text, falling back to a hidden textarea where the Clipboard API is refused. */
export async function copyText(value, done) {
  try {
    await navigator.clipboard.writeText(value);
    toast(done);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value, readOnly: true });
    ta.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    toast(ok ? done : 'Copy was blocked. Select the code and copy it yourself.');
  }
}

/** Saves text as a file. */
export function saveFile(name, value, type = 'image/svg+xml') {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Saved ${name}`);
}

/** A year of made-up daily activity ending today, quieter at weekends. Same pattern every load. */
export function sampleYear(days = 365) {
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const start = new Date(Date.now() - (days - 1) * 864e5);
  const values = [];
  for (let i = 0; i < days; i++) {
    const wd = (start.getDay() + i) % 7;
    const weekend = wd === 0 || wd === 6;
    const r = rnd();
    values.push(r < (weekend ? 0.6 : 0.2) ? 0 : Math.round(r * (weekend ? 4 : 11)));
  }
  const pad = (n) => String(n).padStart(2, '0');
  return { start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`, values: values.join(',') };
}
