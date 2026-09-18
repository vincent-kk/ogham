import { createHash } from 'node:crypto';

import { portableRelative } from '@ogham/cross-platform';

import type {
  AdapterResolution,
  DependencyReference,
} from '../../../types/adapters.js';
import type {
  AnalysisCertainty,
  SnapshotDiagnostic,
} from '../../../types/fractal.js';

import { createDependencyDiagnostic } from './utils/createDependencyDiagnostic.js';

export interface CollectedDependencyReferences {
  certainty: AnalysisCertainty;
  diagnostics: SnapshotDiagnostic[];
  filePaths: string[];
  references: DependencyReference[];
}

export async function collectDependencyReferences(
  resolution: AdapterResolution,
  projectRoot: string,
): Promise<CollectedDependencyReferences> {
  const diagnostics: SnapshotDiagnostic[] = [];
  const filePaths = [...resolution.ownership.keys()].sort();
  const references: DependencyReference[] = [];
  let certainty: AnalysisCertainty =
    resolution.adapters.length === 0
      ? 'unsupported'
      : resolution.diagnostics.length > 0
        ? 'indeterminate'
        : 'exact';

  for (const filePath of filePaths) {
    const ownership = resolution.ownership.get(filePath);
    if (!ownership) continue;
    try {
      const extracted = await ownership.adapter.extractDependencies(filePath);
      references.push(...extracted);
      for (const reference of extracted)
        if (reference.resolvedPath === null)
          diagnostics.push(
            createDependencyDiagnostic(
              'unresolved-local-dependency',
              `Could not resolve ${reference.rawSpecifier} from ${filePath}.`,
              projectRoot,
              filePath,
              reference.rawSpecifier,
            ),
          );
        else if (reference.certainty === 'indeterminate')
          diagnostics.push(
            createDependencyDiagnostic(
              'uncertain-local-dependency',
              `Could not confirm ${reference.rawSpecifier} in ${filePath} as code: it sits where the lexer lost track or inside an unterminated literal.`,
              projectRoot,
              filePath,
              reference.rawSpecifier,
            ),
          );
    } catch (error) {
      certainty = 'indeterminate';
      diagnostics.push({
        code: 'dependency-analysis-failed',
        message: error instanceof Error ? error.message : String(error),
        path: filePath,
        affects: ['dependencies', 'boundaries'],
        causeId: createHash('sha256')
          .update(
            JSON.stringify([
              'dependency-analysis-failed',
              portableRelative(projectRoot, filePath),
            ]),
          )
          .digest('hex'),
      });
    }
  }

  return { certainty, diagnostics, filePaths, references };
}
