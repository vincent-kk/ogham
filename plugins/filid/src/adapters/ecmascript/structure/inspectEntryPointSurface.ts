import { dirname } from 'node:path';

import { ECMASCRIPT_ADAPTER_ID } from './ecmascriptConventions.js';
import type { EntryPointInspection } from '../../../types/adapters.js';

import { findEntryPoints } from './findEntryPoints.js';
import { inspectManifestEntry } from './inspectManifestEntry.js';

/**
 * Read the surface a manifest entry point declares.
 *
 * Only a manifest is read here. A source entry point's surface is a fact about
 * its contents, and filid takes facts about contents from the file's record,
 * never from a parse of its own (spec §11-8) — so a source path is answered
 * with `unsupported`, which the caller reports rather than treats as empty.
 *
 * @param entryPointPath - Absolute path of the entry point to inspect.
 * @returns The entry point descriptor and the surface read from it.
 */
export async function inspectEntryPointSurface(
  entryPointPath: string,
): Promise<EntryPointInspection> {
  const entryPoint = (await findEntryPoints(dirname(entryPointPath))).find(
    ({ path }) => path === entryPointPath,
  ) ?? {
    path: entryPointPath,
    kind: 'module' as const,
    adapterId: ECMASCRIPT_ADAPTER_ID,
    surface: 'enumerated' as const,
  };
  if (entryPoint.kind === 'manifest')
    return { entryPoint, ...inspectManifestEntry(entryPointPath) };
  return {
    entryPoint,
    exportedNames: [],
    hasDirectDeclarations: false,
    certainty: 'unsupported',
  };
}
