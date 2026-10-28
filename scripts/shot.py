"""Dev helper: renders docs/showcase.html and docs/social.html to the PNGs in docs/, at 2x.
Usage: python3 scripts/shot.py <url> <out.png> [width] [height] [dark]
With no height the whole page is captured."""
import sys
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
h = int(sys.argv[4]) if len(sys.argv) > 4 else 0
dark = len(sys.argv) > 5 and sys.argv[5] == 'dark'
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': w, 'height': h or 800}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    pg.goto(url)
    pg.wait_for_timeout(1200)
    pg.screenshot(path=out, full_page=not h)
    for l in logs: print(l)
    b.close()
