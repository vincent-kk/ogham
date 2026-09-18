import { readFileSync } from 'node:fs';

import type { DependencyReference } from '../../../types/adapters.js';

import { referencesInSource } from './dependencies/referencesInSource.js';

/**
 * Extract the project-local dependency references of one file.
 * @param filePath - Absolute path of a source file this adapter owns
 * @returns Static, dynamic and re-export references in source order; one the
 * lexer cannot confirm as code carries `certainty: 'indeterminate'`
 */
export function extractDependencyReferences(
  filePath: string,
): DependencyReference[] {
  return referencesInSource(filePath, readFileSync(filePath, 'utf8'));
}
