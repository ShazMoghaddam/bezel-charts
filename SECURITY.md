# Security policy

## Supported versions

| Package | Version | Supported |
| --- | --- | --- |
| Web components (`bezel-charts` on npm and jsDelivr) | 1.x | Yes |
| Python package (`bezel-charts` on PyPI) | 1.x | Yes |
| Either package | 0.x | No |

Fixes go into the latest 1.x release. The `@1` script line in the README always loads it, so most sites pick up a fix without changing anything.

## Reporting a vulnerability

Please report it privately, not in a public issue.

1. Open the [Security tab](https://github.com/ShazMoghaddam/bezel-charts/security) and press **Report a vulnerability**, or go straight to [a new advisory](https://github.com/ShazMoghaddam/bezel-charts/security/advisories/new).
2. Describe the problem, the version you tested, and the steps or the chart markup that show it.

You'll get a reply within 7 days. Once the problem is confirmed, I'll agree a fix and a disclosure date with you, and credit you in the advisory and the changelog unless you'd rather stay anonymous.

## Scope

In scope:

- The web components and the `render()` / `toSVG()` functions in `src/` and `dist/`, for example text from an attribute or a data value that ends up running as script or markup in a page or an exported SVG.
- The Python package in `python/`, for example data that produces unsafe SVG.
- The Studio and website in `site/`, for example a shared link or an imported file that runs script.
- The release workflows in `.github/workflows/`.

Out of scope:

- Pages that pass untrusted HTML into Bezel Charts by other means, such as setting `innerHTML` themselves.
- Problems in third-party services such as jsDelivr, npm or PyPI. Please report those to the service.
