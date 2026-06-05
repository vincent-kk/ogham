import { createRequire } from 'node:module';

import type { SgModule } from '../../../types/index.js';

let sgModule: SgModule | null = null;
let sgLoadFailed = false;
let sgLoadError = '';

export async function getSgModule(): Promise<SgModule | null> {
  if (sgLoadFailed) {
    return null;
  }
  if (!sgModule) {
    try {
      // Use createRequire for CJS-style resolution (respects NODE_PATH)
      // In CJS bundles, import.meta.url becomes undefined (esbuild replaces import.meta with {}).
      // __filename provides the bundle file path as fallback for CJS-relative resolution.
      const _base =
        import.meta.url ||
        (typeof __filename !== 'undefined' ? __filename : undefined) ||
        process.cwd() + '/';
      const require = createRequire(_base);
      sgModule = require('@ast-grep/napi') as SgModule;
    } catch {
      // Fallback to dynamic import for pure ESM environments
      try {
        // @ts-ignore - optional dependency, may not be installed
        sgModule = await import('@ast-grep/napi');
      } catch (error) {
        sgLoadFailed = true;
        sgLoadError = error instanceof Error ? error.message : String(error);
        return null;
      }
    }
  }
  return sgModule;
}

export function getSgLoadError(): string {
  return sgLoadError;
}
