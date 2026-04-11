import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FRAMEWORK_PACKAGES,
  FRAMEWORK_RESERVED_FILES,
} from '../../../../constants/allowed-peer-files.js';

/**
 * Detect frameworks from the nearest package.json's dependencies.
 * Returns framework identifiers matching keys in FRAMEWORK_RESERVED_FILES.
 */
export function detectFrameworks(rootPath: string): string[] {
  const pkgPath = join(rootPath, 'package.json');
  if (!existsSync(pkgPath)) return [];
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
    return [];
  }
}

/**
 * Detect framework reserved files from the root package.json.
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
