/**
 * @file import-resolver.ts
 * @description Import 소스 문자열을 절대 경로로 변환하는 모듈.
 *
 * v1 scope:
 * - 상대 경로 해석: path.resolve(dirname(currentFile), importSource)
 * - ESM .js -> .ts 치환: TypeScript는 .js 확장자로 .ts 파일을 참조
 * - Index resolution: './dir' -> './dir/index.ts'
 *
 * Out of scope (TODO):
 * - Barrel re-exports (import from re-exporting index.ts)
 * - tsconfig.json path aliases (e.g., @/ prefixes)
 * - node_modules package resolution
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Resolve a raw import source string to an absolute file path.
 *
 * @param importSource - Raw import source string from extractDependencies
 *                       (e.g., '../../shared/utils.js', './dir', 'node:fs')
 * @param currentFilePath - Absolute path of the file containing the import
 * @returns Absolute path to the resolved file, or null if unresolvable
 */
export function resolveImportPath(
  importSource: string,
  currentFilePath: string,
): string | null {
  // Bare specifiers: package imports, node: prefix, etc.
  if (!importSource.startsWith('.') && !importSource.startsWith('/')) {
    return null;
  }

  const baseDir = dirname(currentFilePath);
  const resolved = resolve(baseDir, importSource);

  // Strategy 1: ESM .js -> .ts substitution
  if (resolved.endsWith('.js')) {
    const tsPath = resolved.slice(0, -3) + '.ts';
    if (existsSync(tsPath)) return tsPath;
    const tsxPath = resolved.slice(0, -3) + '.tsx';
    if (existsSync(tsxPath)) return tsxPath;
  }

  // Strategy 2: ESM .mjs -> .mts substitution
  if (resolved.endsWith('.mjs')) {
    const mtsPath = resolved.slice(0, -4) + '.mts';
    if (existsSync(mtsPath)) return mtsPath;
  }

  // Strategy 3: No extension — try adding common extensions
  if (!/\.\w+$/.test(resolved)) {
    const extensions = ['.ts', '.tsx', '.js', '.mjs'];
    for (const ext of extensions) {
      if (existsSync(resolved + ext)) return resolved + ext;
    }
    // Index resolution: './dir' -> './dir/index.ts'
    const indexExtensions = ['/index.ts', '/index.tsx', '/index.js'];
    for (const idx of indexExtensions) {
      if (existsSync(resolved + idx)) return resolved + idx;
    }
  }

  // Strategy 4: Exact match
  if (existsSync(resolved)) return resolved;

  return null;
}
