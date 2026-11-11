# ADR 0009: Deploying under a base path

Status: accepted, 2026-11-11

## Decision
- The site stays a static export. `NEXT_PUBLIC_BASE_PATH` (empty by default) sets
  Next's `basePath`, so the same build works at a domain root or under
  `/<repository>/` on GitHub Pages.
- Next adds the base path to `next/link`, scripts and assets. It does **not** add it to
  plain `<a href>`, `fetch` or worker URLs, so those go through `withBase`
  (`apps/web/src/lib/base-path.ts`, unit-tested). MDX lesson links use it too.
- The Pages workflow is manual (`workflow_dispatch`): Pages must be switched on by the
  owner first, and private repositories need a plan that includes it.

## Checked
Served under `/aiforge/` in a real browser: the Python worker starts and runs the
starter (0 of 9 tests pass, as designed), no failed requests, no unprefixed links.

## Known limits
- The Playwright suite runs at the domain root only; the base-path check was done by hand.
- Prefetch files named `__next.<route>.__PAGE__.txt` are requested but the export stores
  them in folders; on a static server they 404 harmlessly. TODO-VERIFY on the real host.
- Monaco still loads from a CDN.
