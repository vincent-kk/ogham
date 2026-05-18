---
"@ogham/filid": minor
---

Next.js App Router structure support.

- **`detectFrameworks` walks up to the nearest `package.json`** — sub-path
  scans (`src`, `src/app`) now detect the enclosing package's framework
  instead of returning `[]`. In a monorepo the package's own `package.json`
  is the framework boundary (nearest-wins).
- **`module-entry-point` recognizes framework-invoked entry points** — a
  route segment with `page.tsx`/`route.ts` (and no `index.ts`) is no longer
  flagged as missing an entry point. Directories with no entry of any kind
  still warn.
- **`naming-convention` exempts framework route-segment names** — route
  groups `(app)`, dynamic `[id]`, catch-all `[...slug]`, parallel slots
  `@modal`, intercepts `(.)photo`, and private `_components` pass when a
  framework is detected.
- **New `.filid/config.json` keys** — `additional-entry-points` and
  `additional-route-patterns` extend entry-point and route-name recognition
  for project-specific conventions; framework defaults stay hardcoded so
  zero-config projects are unaffected.
- Expanded `FRAMEWORK_RESERVED_FILES.next` with Next special files
  (`globals.css`, `favicon.ico`, `icon.*`, `robots.*`, `sitemap.*`, etc.).
