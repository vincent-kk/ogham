import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { DependencyReference, ResolutionAlias } from '../../../types/adapters.js';
import type { ScannedSource } from '../scanSource.js';
import { scanSource } from '../scanSource.js';

import { referencesInSource } from './referencesInSource.js';

/**
 * Extract local, substituted and external dependency references of one file.
 *
 * @param filePath - Absolute path of a source file this analysis owns.
 * @param scanned - The file's text and its scan, when the caller already has
 * them; omitted, the file is read and scanned here.
 * @param aliases Validated project substitution list.
 * @param projectRoot Root used for alias targets.
 * @returns Static, dynamic and re-export references in source order; one the
 * lexer cannot confirm as code carries `certainty: 'indeterminate'`.
 */
export function extractDependencyReferences(
  filePath: string,
  scanned?: ScannedSource,
  aliases: readonly ResolutionAlias[] = [],
  projectRoot: string = dirname(filePath),
): DependencyReference[] {
  const reading = scanned ?? scanSource(readFileSync(filePath, 'utf8'));
  return referencesInSource(filePath, reading.source, reading, aliases, projectRoot);
}
