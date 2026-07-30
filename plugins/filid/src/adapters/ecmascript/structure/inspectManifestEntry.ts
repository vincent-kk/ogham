import { readFileSync } from 'node:fs';

import type { EntryPointInspection } from '../../../types/adapters.js';

interface ManifestSurface {
  exports?: unknown;
  main?: unknown;
  bin?: unknown;
}

const UNREADABLE: Omit<EntryPointInspection, 'entryPoint'> = {
  exportedNames: [],
  hasDirectDeclarations: false,
  certainty: 'indeterminate',
};

const DECLARES_NOTHING: Omit<EntryPointInspection, 'entryPoint'> = {
  exportedNames: [],
  hasDirectDeclarations: false,
  certainty: 'exact',
};

/**
 * Read the public surface a package manifest declares.
 * `exports` subpath keys are the enumerated surface. A manifest without an
 * `exports` object but with a string `exports`, `main` or `bin` declares one
 * default entry, reported as `.`. A manifest that declares none of them exports
 * nothing by specifier, which is a determinate empty surface — only a manifest
 * that cannot be parsed leaves the surface undecided, because "exports nothing"
 * and "cannot be read" are different facts.
 * @param manifestPath Absolute path of the manifest to inspect.
 * @returns Inspection fields without the descriptor the caller already holds.
 */
export function inspectManifestEntry(
  manifestPath: string,
): Omit<EntryPointInspection, 'entryPoint'> {
  let manifest: ManifestSurface;
  try {
    manifest = JSON.parse(
      readFileSync(manifestPath, 'utf8'),
    ) as ManifestSurface;
  } catch {
    return UNREADABLE;
  }
  const subpaths =
    typeof manifest.exports === 'object' && manifest.exports !== null
      ? Object.keys(manifest.exports as Record<string, unknown>).sort()
      : [];
  if (subpaths.length > 0)
    return {
      exportedNames: subpaths,
      hasDirectDeclarations: false,
      certainty: 'exact',
    };
  if (
    typeof manifest.exports === 'string' ||
    manifest.main !== undefined ||
    manifest.bin !== undefined
  )
    return {
      exportedNames: ['.'],
      hasDirectDeclarations: false,
      certainty: 'exact',
    };
  return DECLARES_NOTHING;
}
