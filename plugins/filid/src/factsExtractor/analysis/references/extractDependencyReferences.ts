import { readFileSync } from 'node:fs';

import type { DependencyReference } from '../../../types/adapters.js';
import type { ScannedSource } from '../scanSource.js';
import { scanSource } from '../scanSource.js';

import { referencesInSource } from './referencesInSource.js';

/**
 * Extract the project-local dependency references of one file.
 *
 * @param filePath - Absolute path of a source file this analysis owns.
 * @param scanned - The file's text and its scan, when the caller already has
 * them; omitted, the file is read and scanned here.
 * @returns Static, dynamic and re-export references in source order; one the
 * lexer cannot confirm as code carries `certainty: 'indeterminate'`.
 */
export function extractDependencyReferences(
  filePath: string,
  scanned?: ScannedSource,
): DependencyReference[] {
  const reading = scanned ?? scanSource(readFileSync(filePath, 'utf8'));
  return referencesInSource(filePath, reading.source, reading);
}
