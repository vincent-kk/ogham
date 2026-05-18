import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  FRAMEWORK_PACKAGES,
  FRAMEWORK_RESERVED_FILES,
} from '../../../../constants/allowed-peer-files.js';

/**
 * Parse a package.json file and map its dependencies (and devDependencies)
 * to framework identifiers from FRAMEWORK_PACKAGES. Returns [] on any read
 * or parse failure.
 */
function frameworksFromPackageJson(pkgPath: string): string[] {
  try {
    const raw = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps: Record<string, string> = {
      ...raw.dependencies,
      ...raw.devDependencies,
    };
    const detected: string[] = [];
    for (const depName of Object.keys(allDeps ?? {})) {
      const fw = FRAMEWORK_PACKAGES[depName];
      if (fw && !detected.includes(fw)) detected.push(fw);
    }
    return detected;
  } catch {
    // Intentional graceful degradation: both expected absence (ENOENT) and
    // abnormal failures (permission errors, malformed JSON) return [] so that
    // framework-exempt rules degrade safely rather than throwing. The caller
    // (detectFrameworks) treats [] as "no frameworks detected".
    return [];
  }
}

/**
 * Detect frameworks from the nearest package.json's dependencies.
 *
 * Walks upward from `rootPath` to the filesystem root and resolves at the
 * first package.json found — that file is the package boundary
 * (nearest-wins), so a sub-path scan (`<repo>/src`, `<repo>/src/app`)
 * detects the enclosing package's framework rather than returning []. In a
 * monorepo the package's own package.json wins over the monorepo root.
 * Returns [] when no package.json exists anywhere up the chain.
 *
 * Returns framework identifiers matching keys in FRAMEWORK_RESERVED_FILES.
 */
export function detectFrameworks(rootPath: string): string[] {
  let dir = rootPath;
  for (;;) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) return frameworksFromPackageJson(pkgPath);
    const parent = dirname(dir);
    if (parent === dir) return [];
    dir = parent;
  }
}

/**
 * Detect framework reserved files from the nearest package.json.
 * Returns the deduplicated list of reserved filenames.
 */
export function detectFrameworkReserved(rootPath: string): string[] {
  const detectedFrameworks = detectFrameworks(rootPath);
  const frameworkReservedSet = new Set<string>();
  for (const fw of detectedFrameworks) {
    const files = FRAMEWORK_RESERVED_FILES[fw];
    if (files) for (const f of files) frameworkReservedSet.add(f);
  }
  return [...frameworkReservedSet];
}
