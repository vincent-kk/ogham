export const ECMASCRIPT_ADAPTER_ID = 'ecmascript';

export const SOURCE_EXTENSIONS = [
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
] as const;

export const MODULE_ENTRY_BASENAMES = ['index'] as const;
export const EXECUTABLE_ENTRY_BASENAMES = ['main'] as const;

/** Manifest whose `exports`/`main`/`bin` declare a package's public surface. */
export const MANIFEST_ENTRY_FILENAME = 'package.json';

export const EXCLUDED_DIRECTORY_NAMES = new Set([
  '.git',
  '.next',
  'bridge',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'public',
]);

export const FRAMEWORK_PACKAGES = {
  next: 'next',
  '@remix-run/react': 'remix',
  nuxt: 'nuxt',
  '@sveltejs/kit': 'sveltekit',
} as const;

export const FRAMEWORK_ENTRY_BASENAMES = {
  next: new Set([
    'default',
    'error',
    'layout',
    'loading',
    'not-found',
    'page',
    'route',
    'template',
  ]),
  remix: new Set(['root']),
  nuxt: new Set(['app', 'error']),
  sveltekit: new Set(['+error', '+layout', '+page', '+server']),
} as const;
