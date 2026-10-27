"""Drives every Studio control for every chart type in a real browser.

Run from the project folder after `npm run build`:
    pip install playwright && python3 -m playwright install chromium
    python3 test/browser/studio.py
"""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

PORT = 4199
server = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=os.path.join(os.path.dirname(__file__), '..', '..'),
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = f'http://localhost:{PORT}/site/'
problems = []
def check(cond, msg):
    if not cond:
        problems.append(msg); print('FAIL', msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, color_scheme='dark', permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'TUNNEL' not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(1200)
    code = lambda: pg.locator('#code').inner_text()
    svg_ok = lambda: pg.evaluate("(() => { const el = document.querySelector('#frame').firstElementChild; const s = el && el.shadowRoot && el.shadowRoot.querySelector('svg'); return !!s && !/NaN|undefined/.test(el.shadowRoot.innerHTML) })()")

    ids = ['spark','line','bars','grouped','scatter','ring','donut','gauge','progress','heatmap']
    for cid in ids:
        pg.click(f'[data-ui="{cid}"]'); pg.wait_for_timeout(250)
        check(svg_ok(), f'{cid}: preview renders')
        tag = 'bars' if cid == 'grouped' else cid
        check(f'<bezel-{tag}' in code() and code().startswith('<script'), f'{cid}: code tag with script line')
        # every tab, every toggle on then off, every select through its options
        for tab in ['data','style','extras']:
            pg.click(f'#tab-{tab}'); pg.wait_for_timeout(80)
            for t in pg.locator(f'#pane-{tab} [data-toggle]').all():
                if not t.is_visible() and not t.locator('xpath=..').is_visible(): continue
                t.locator('xpath=..').click(); pg.wait_for_timeout(60)
                check(svg_ok(), f'{cid}: toggle {t.get_attribute("data-toggle")} on')
                pg.locator(f'#pane-{tab} [data-toggle="{t.get_attribute("data-toggle")}"]').locator('xpath=..').click(); pg.wait_for_timeout(60)
            sels = pg.evaluate(f"[...document.querySelectorAll('#pane-{tab} select')].map(s => s.id).filter(Boolean)")
            for sid in sels:
                s = pg.locator('#' + sid)
                if not s.count() or not s.is_visible(): continue
                vals = [o.get_attribute('value') for o in s.locator('option').all()]
                for v in vals:
                    s = pg.locator('#' + sid)
                    if not s.count() or not s.is_visible(): break
                    s.select_option(v); pg.wait_for_timeout(40)
                    check(svg_ok(), f'{cid}: select {sid}={v}')
                if pg.locator('#' + sid).count() and pg.locator('#' + sid).is_visible(): pg.locator('#' + sid).select_option(index=0)
            for seg in pg.locator(f'#pane-{tab} [data-seg]:visible').all():
                seg.click(); pg.wait_for_timeout(50)
                check(svg_ok(), f'{cid}: seg {seg.get_attribute("data-seg")}={seg.get_attribute("data-val")}')
            pg.locator(f'#pane-{tab} [data-seg][data-val=""]:visible').evaluate_all('els => els.forEach(e => e.click())')
        pg.click('#tab-data')
        # bad number warns but still renders
        ta = pg.locator('#pane-data [data-numbers], #pane-data [data-svalues], #pane-data [data-gx]').first
        if ta.count():
            ta.fill('5, 3, abc, 8'); pg.wait_for_timeout(150)
            check(pg.locator('#pane-data .warn:visible').count() >= 1, f'{cid}: warning shown for "abc"')
            check(svg_ok(), f'{cid}: renders with bad input')
            ta.fill(''); pg.wait_for_timeout(150)
            check(svg_ok() or 'No data' in pg.evaluate("document.querySelector('#frame').firstElementChild.shadowRoot.innerHTML"), f'{cid}: empty data')
        pg.click('#reset'); pg.wait_for_timeout(200)
        check(svg_ok(), f'{cid}: reset')

    # series editing on line
    pg.click('[data-ui="line"]'); pg.wait_for_timeout(200)
    pg.click('[data-sadd]'); pg.wait_for_timeout(150)
    check(code().count('|') == 2, 'add series gives 3 series')
    pg.locator('[data-sremove]').first.click(); pg.wait_for_timeout(150)
    check(code().count('|') == 1, 'remove series gives 2')
    # paste a spreadsheet table into series values
    table = 'Month\tSales\tCosts\nJan\t£1,200\t800\nFeb\t1500\t900\nMar\t1700\t950'
    pg.evaluate("""(t) => { const ta = document.querySelector('[data-svalues]'); const dt = new DataTransfer(); dt.setData('text/plain', t);
      ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }""", table)
    pg.wait_for_timeout(200)
    c = code()
    check('values="1200,1500,1700|800,900,950"' in c and 'series="Sales,Costs"' in c and 'labels="Jan,Feb,Mar"' in c, 'paste table fills series, names and labels: ' + c[:200])
    # notes
    pg.click('#tab-extras'); pg.click('[data-nadd]'); pg.wait_for_timeout(150)
    pg.locator('[data-ntext]').last.fill('Peak'); pg.wait_for_timeout(150)
    check('Peak' in code(), 'note added')
    # colours
    pg.click('#tab-style')
    pg.locator('[data-colour="0"]').evaluate("el => { el.value = '#ff0000'; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); }")
    pg.wait_for_timeout(150)
    check('color="#ff0000' in code(), 'colour set')
    pg.click('[data-creset]'); pg.wait_for_timeout(150)
    check('color=' not in code(), 'colour reset')
    # scatter paste two columns
    pg.click('[data-ui="scatter"]'); pg.wait_for_timeout(200)
    pg.evaluate("""(t) => { const ta = document.querySelector('[data-gx]'); const dt = new DataTransfer(); dt.setData('text/plain', t);
      ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }""", 'Hours\tScore\n1\t40\n2\t55\n3\t61')
    pg.wait_for_timeout(200)
    check('x="1,2,3"' in code() and 'y="40,55,61"' in code(), 'scatter paste')
    # share link round trip
    pg.click('#share'); pg.wait_for_timeout(200)
    link = pg.evaluate('navigator.clipboard.readText()')
    check('#chart=' in link, 'share link copied')
    before = code()
    pg2 = ctx.new_page(); pg2.goto(link); pg2.wait_for_timeout(1200)
    check(pg2.locator('#code').inner_text() == before, 'share link restores the same chart')
    # customise from gallery
    pg.locator('[data-card="donut"] [data-edit]').click(); pg.wait_for_timeout(600)
    check('<bezel-donut' in code() and 'Monthly budget' in code(), 'customise loads gallery chart')
    pg.locator('[data-card="grouped"] [data-edit]').click(); pg.wait_for_timeout(400)
    check(pg.locator('[data-ui="grouped"]').get_attribute('aria-checked') == 'true', 'grouped detected')
    # SVG copy
    pg.click('#copy-svg'); pg.wait_for_timeout(150)
    check(pg.evaluate('navigator.clipboard.readText()').startswith('<svg xmlns'), 'copy svg')
    # save svg triggers a download
    with pg.expect_download() as dl:
        pg.click('#save-svg')
    check(dl.value.suggested_filename == 'revenue-by-quarter.svg', 'save svg filename ' + dl.value.suggested_filename)
    # the script line toggle
    pg.click('label[for="with-script"]'); pg.wait_for_timeout(100)
    check(code().startswith('<bezel-'), 'script line can be left out')
    pg.click('label[for="with-script"]'); pg.wait_for_timeout(100)
    check(code().startswith('<script type="module"'), 'script line comes back')

    # importing files
    files = os.path.join(os.path.dirname(__file__), 'files')
    note = lambda: pg.locator('.import__note').inner_text() if pg.locator('.import__note').count() else ''
    pg.click('[data-ui="bars"]'); pg.wait_for_timeout(200)
    pg.set_input_files('#import-file', os.path.join(files, 'monthly-sales.csv')); pg.wait_for_timeout(500)
    c = code()
    check(pg.locator('[data-ui="grouped"]').get_attribute('aria-checked') == 'true', 'CSV with 3 number columns switches Bars to Grouped bars')
    check('values="1200,1500,1700,1650|800,900,950,1000|400,600,750,650"' in c and 'series="Sales,Costs,Profit"' in c and 'labels="Jan,Feb,Mar,Apr"' in c, 'CSV fills series and labels: ' + c[:240])
    check('heading="Monthly sales"' in c, 'title from the file name')
    check('Loaded monthly-sales.csv' in note() and 'Labels from Month' in note(), 'import note: ' + note())
    check(svg_ok(), 'CSV chart renders')
    pg.click('[data-ui="donut"]'); pg.wait_for_timeout(300)
    c = code()
    check('values="1200,1500,1700,1650"' in c and 'labels="Jan,Feb,Mar,Apr"' in c, 'imported data carries over to another chart type')
    check('try Line or Grouped bars' in note(), 'note explains the extra columns: ' + note())
    pg.click('[data-ui="scatter"]'); pg.wait_for_timeout(300)
    check('x="1200,1500,1700,1650"' in code() and 'y="800,900,950,1000"' in code() and 'x-label="Sales"' in code(), 'scatter uses the first two number columns')
    pg.click('[data-ui="gauge"]'); pg.wait_for_timeout(300)
    check('values="1650"' in code() and 'max="2000"' in code(), 'gauge shows the last value on a fitted scale: ' + code()[:200])
    pg.click('[data-ui="ring"]'); pg.wait_for_timeout(300)
    check(svg_ok(), 'ring renders imported data')

    pg.click('[data-ui="scatter"]'); pg.wait_for_timeout(200)
    pg.set_input_files('#import-file', os.path.join(files, 'study.json')); pg.wait_for_timeout(500)
    c = code()
    check('series="A,B"' in c and 'x="2,4,6,8|3,5,7,9"' in c and 'y="48,55,70,75|52,63,72,82"' in c, 'JSON scatter grouped by a text column: ' + c[:300])
    check(svg_ok(), 'JSON scatter renders')

    pg.click('[data-ui="heatmap"]'); pg.wait_for_timeout(200)
    pg.set_input_files('#import-file', os.path.join(files, 'commits.xlsx')); pg.wait_for_timeout(800)
    c = code()
    check('start="2026-01-02"' in c, 'Excel dates read and placed on the calendar: ' + c[:200])
    vals = c.split('values="')[1].split('"')[0].split(',') if 'values="' in c else []
    check(len(vals) == 119, f'one square per day from first to last date ({len(vals)})')
    check('added up per day' in note(), 'heatmap note: ' + note())
    check(svg_ok(), 'Excel heatmap renders')

    with open(os.path.join(files, 'bad.csv'), 'w') as f: f.write('name,city\nAna,Leeds\n')
    pg.set_input_files('#import-file', os.path.join(files, 'bad.csv')); pg.wait_for_timeout(400)
    check("Couldn't find a column of numbers" in note() and svg_ok(), 'a file with no numbers explains itself and keeps the chart')
    os.remove(os.path.join(files, 'bad.csv'))
    pg.click('#reset'); pg.wait_for_timeout(200)
    check(not note() and 'Contributions' in code(), 'start over clears the imported data')

    # sample files, each in its own chart
    pg.click('[data-sample="monthly-sales-2026.csv"]'); pg.wait_for_timeout(700)
    c = code()
    check(pg.locator('[data-ui="grouped"]').get_attribute('aria-checked') == 'true' and 'series="Sales,Costs,Profit"' in c and 'prefix="£"' in c and 'compact' in c, 'sales sample opens in Grouped bars with £: ' + c[:300])
    check('Download the file' in note(), 'sample note offers the file')
    pg.click('[data-sample="study-hours-vs-scores.csv"]'); pg.wait_for_timeout(700)
    c = code()
    check(pg.locator('[data-ui="scatter"]').get_attribute('aria-checked') == 'true' and 'series="Class A,Class B"' in c and 'trend' in c, 'study sample opens as a grouped scatter with trend lines')
    pg.click('[data-sample="daily-running-2026.csv"]'); pg.wait_for_timeout(700)
    c = code()
    check(pg.locator('[data-ui="heatmap"]').get_attribute('aria-checked') == 'true' and 'start="2026-01-01"' in c and 'suffix=" km"' in c and 'commits' not in c, 'running sample opens as a heatmap in km: ' + c[:200])
    # imported data starts clean: no units or wording left from the built-in example
    pg.click('[data-ui="spark"]'); pg.wait_for_timeout(300)
    c = code()
    check('°C' not in c and 'since Monday' not in c and 'suffix=" km"' in c, 'sparkline drops the example units: ' + c[:200])
    pg.click('[data-ui="ring"]'); pg.wait_for_timeout(300)
    shadow = pg.evaluate("document.querySelector('#frame').firstElementChild.shadowRoot.innerHTML")
    check('max="10"' in code() and '%' not in shadow.split('</style>',1)[1], 'rings show km against a fitted scale, not percentages')
    check('<title>' not in shadow, 'no second browser tooltip')
    check('labels="1 Jan,3 Jan,6 Jan' in code(), 'date labels are shortened: ' + code()[:260])
    pg.click('#reset'); pg.wait_for_timeout(200)
    check(not note(), 'start over clears the sample')

    # drag and drop
    pg.click('[data-ui="line"]'); pg.wait_for_timeout(200)
    csv = open(os.path.join(files, 'monthly-sales.csv')).read()
    pg.evaluate("""(csv) => { const dt = new DataTransfer(); dt.items.add(new File([csv], 'dropped.csv', { type: 'text/csv' }));
      document.querySelector('#studio').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }""", csv)
    pg.wait_for_timeout(500)
    check('Loaded dropped.csv' in note() and 'series="Sales,Costs,Profit"' in code(), 'drop a file onto the Studio')

    check(not errs, 'console errors: ' + json.dumps(errs[:5]))
    b.close()
server.terminate()
print(f'{len(problems)} problems' if problems else 'Studio: every check passed')
sys.exit(1 if problems else 0)
