import { createRequire } from 'node:module';

import type { SgModule } from '../../../types/index.js';

let sgModule: SgModule | null = null;
let sgLoadFailed = false;
let sgLoadError = '';

export async function getSgModule(): Promise<SgModule | null> {
  if (sgLoadFailed) return null;

  if (!sgModule)
    try {
      // Use createRequire for CJS-style resolution (respects NODE_PATH).
      // buildMcpServer.mjs defines import.meta.url in the CJS bundle, but the
      // __filename fallback stays: without that define, esbuild replaces import.meta
      // with {} and this resolves against the wrong root (or nothing at all).
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

  return sgModule;
}

export function getSgLoadError(): string {
  return sgLoadError;
}
