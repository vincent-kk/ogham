import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { EntryPointInspection } from '../../../types/adapters.js';

import { ECMASCRIPT_ADAPTER_ID } from '../../../adapters/ecmascript/structure/ecmascriptConventions.js';
import { hidesExport } from './hidesExport.js';
import { findEntryPoints } from '../../../adapters/ecmascript/structure/findEntryPoints.js';
import { inspectManifestEntry } from '../../../adapters/ecmascript/structure/inspectManifestEntry.js';
import type { ScannedSource } from '../scanSource.js';
import { scanSource } from '../scanSource.js';

/**
 * Read one entry point's declared surface from its own text.
 * @param scanned The file's text and its scan.
 * @returns Exported names, whether it declares them directly, and how certain that reading is.
 */
function inspectEntryPointSource(
  scanned: ScannedSource,
): Omit<EntryPointInspection, 'entryPoint'> {
  const { source, tokens } = scanned;
  const exportedNames = new Set<string>();
  let hasDirectDeclarations = false;
  let certainty: EntryPointInspection['certainty'] = 'exact';
  const declarationKeywords = new Set([
    'class',
    'const',
    'enum',
    'function',
    'interface',
    'let',
    'type',
    'var',
  ]);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      token.braceDepth === 0 &&
      token.kind === 'identifier' &&
      declarationKeywords.has(token.value)
    )
      hasDirectDeclarations = true;
    if (token.kind !== 'identifier' || token.value !== 'export') continue;
    const next = tokens[index + 1];
    if (!next) {
      certainty = 'indeterminate';
      continue;
    }
    if (next.value === 'default') {
      exportedNames.add('default');
      continue;
    }
    if (next.value === '*') {
      certainty = 'indeterminate';
      continue;
    }
    if (next.value === '{') {
      for (let cursor = index + 2; cursor < tokens.length; cursor += 1) {
        const candidate = tokens[cursor];
        if (candidate.value === '}') break;
        if (candidate.kind !== 'identifier' || candidate.value === 'as')
          continue;
        const alias =
          tokens[cursor + 1]?.value === 'as' ? tokens[cursor + 2] : null;
        exportedNames.add(
          alias?.kind === 'identifier' ? alias.value : candidate.value,
        );
      }
      continue;
    }
    if (declarationKeywords.has(next.value)) {
      const name = tokens
        .slice(index + 2)
        .find((candidate) => candidate.kind === 'identifier');
      if (name) exportedNames.add(name.value);
      else certainty = 'indeterminate';
    }
  }

  if (hidesExport(source, tokens)) certainty = 'indeterminate';
  return {
    exportedNames: [...exportedNames].sort(),
    hasDirectDeclarations,
    certainty,
  };
}

/**
 * Inspect the public surface one entry point declares.
 *
 * Kept apart from the adapter object so a consumer that only parses files —
 * the facts extractor — reaches it without the discovery code, whose ignore
 * filter starts git.
 *
 * @param entryPointPath Absolute path of the entry point to inspect.
 * @param scanned The file's text and its scan, when the caller already has
 * them; omitted, the file is read and scanned here.
 * @returns The entry point record and the surface reading for it.
 */
export async function inspectEntrySurface(
  entryPointPath: string,
  scanned?: ScannedSource,
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
    ...inspectEntryPointSource(
      scanned ?? scanSource(readFileSync(entryPointPath, 'utf8')),
    ),
  };
}
