import { DETAIL_MD, INTENT_MD } from './documentFiles.js';

export const ALLOWED_FRACTAL_ROOT_FILES = new Set([
  'index.ts',
  'index.js',
  'index.tsx',
  'index.mjs',
  'index.cjs',
  'main.ts',
  'main.js',
  INTENT_MD,
  DETAIL_MD,
]);

export const FRAMEWORK_RESERVED_FILES: Record<string, string[]> = {
  next: [
    'layout.tsx',
    'layout.ts',
    'layout.js',
    'page.tsx',
    'page.ts',
    'page.js',
    'loading.tsx',
    'loading.ts',
    'error.tsx',
    'error.ts',
    'not-found.tsx',
    'not-found.ts',
    'template.tsx',
    'template.ts',
    'default.tsx',
    'default.ts',
    'route.ts',
    'route.js',
    'middleware.ts',
    'middleware.js',
    'opengraph-image.tsx',
    'opengraph-image.ts',
    'opengraph-image.js',
    'twitter-image.tsx',
    'twitter-image.ts',
    'twitter-image.js',
    'twitter-image.png',
    'twitter-image.jpg',
    'twitter-image.jpeg',
    'global-error.tsx',
    'global-error.ts',
    'global-error.js',
    'globals.css',
    'favicon.ico',
    'icon.ico',
    'icon.png',
    'icon.svg',
    'icon.jpg',
    'icon.jpeg',
    'icon.tsx',
    'icon.ts',
    'icon.js',
    'apple-icon.png',
    'apple-icon.jpg',
    'apple-icon.jpeg',
    'apple-icon.tsx',
    'apple-icon.ts',
    'apple-icon.js',
    'robots.txt',
    'robots.ts',
    'robots.js',
    'sitemap.xml',
    'sitemap.ts',
    'sitemap.js',
    'manifest.json',
    'manifest.webmanifest',
    'manifest.ts',
    'manifest.js',
    'instrumentation.ts',
    'instrumentation.js',
  ],
  remix: ['root.tsx', 'root.ts', 'entry.client.tsx', 'entry.server.tsx'],
  nuxt: ['app.vue', 'error.vue', 'app.config.ts'],
  sveltekit: [
    '+page.svelte',
    '+page.ts',
    '+page.js',
    '+page.server.ts',
    '+page.server.js',
    '+layout.svelte',
    '+layout.ts',
    '+layout.js',
    '+layout.server.ts',
    '+layout.server.js',
    '+error.svelte',
    '+server.ts',
    '+server.js',
  ],
};

/**
 * Framework-invoked entry-point files per framework. A directory holding one
 * of these files satisfies `module-entry-point` the same way an
 * index.ts/main.ts barrel does — the framework invokes the file as the
 * module's execution entry.
 *
 * Conservative subset rationale: only `page.*` and `route.*` are true module
 * entry points in the `module-entry-point` rule sense. Files such as
 * `layout.*`, `loading.*`, `error.*`, and `not-found.*` are auxiliary
 * rendering segments that support a route; `middleware.*` is root-level
 * infrastructure. None of these act as the primary execution entry for their
 * containing directory, so they are intentionally excluded.
 *
 * Note: this list is NOT a subset of (nor synchronized with)
 * `FRAMEWORK_RESERVED_FILES`. That constant serves a different rule
 * (`zero-peer-file` exemption for any framework-owned file); this constant
 * serves `module-entry-point` exemption for files that act as entry points.
 * The two lists have different criteria and evolve independently.
 *
 * To recognize additional entry-point patterns, use `.filid/config.json`
 * `additional-entry-points` — do not extend this constant directly.
 */
export const FRAMEWORK_ENTRY_FILES: Record<string, string[]> = {
  next: ['page.tsx', 'page.ts', 'page.js', 'route.ts', 'route.js'],
};

export const FRAMEWORK_PACKAGES: Record<string, string> = {
  next: 'next',
  remix: 'remix',
  '@remix-run/react': 'remix',
  '@remix-run/node': 'remix',
  nuxt: 'nuxt',
  '@sveltejs/kit': 'sveltekit',
};
