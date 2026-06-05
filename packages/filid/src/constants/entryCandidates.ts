export const ENTRY_CANDIDATES = [
  'index.ts',
  'index.js',
  'main.ts',
  'main.js',
] as const;

export const RE_IMPORT =
  /^(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+(?:\s*,\s*\{[^}]*\})?)\s+from\s+['"]([^'"]+)['"]/gm;
export const RE_DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gm;
export const RE_REQUIRE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gm;
