import type {
  AdapterResolution,
  DependencyReference,
} from '../../../types/adapters.js';
import type {
  AnalysisCertainty,
  SnapshotDiagnostic,
} from '../../../types/fractal.js';

export interface CollectedDependencyReferences {
  certainty: AnalysisCertainty;
  diagnostics: SnapshotDiagnostic[];
  filePaths: string[];
  references: DependencyReference[];
}

export async function collectDependencyReferences(
  resolution: AdapterResolution,
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
          diagnostics.push({
            code: 'unresolved-local-dependency',
            message: `Could not resolve ${reference.rawSpecifier} from ${filePath}.`,
            path: filePath,
          });
    } catch (error) {
      certainty = 'indeterminate';
      diagnostics.push({
        code: 'dependency-analysis-failed',
        message: error instanceof Error ? error.message : String(error),
        path: filePath,
      });
    }
  }

  return { certainty, diagnostics, filePaths, references };
}
