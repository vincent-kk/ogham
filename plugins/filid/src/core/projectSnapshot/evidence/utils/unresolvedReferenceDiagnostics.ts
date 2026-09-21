import { portableJoin } from '@ogham/cross-platform';

import { DEPENDENCY_DIAGNOSTIC_CODES } from '../../../../constants/dependencyDiagnosticCodes.js';
import type { SnapshotDiagnostic } from '../../../../types/fractal.js';
import type { ProjectFacts } from '../../../facts/index.js';

import { createDependencyDiagnostic } from './createDependencyDiagnostic.js';

/**
 * Report every reference an `exact` file resolves to nothing.
 *
 * A broken import does not become quiet because the evidence now comes from
 * the store: the provider positively reported that the specifier resolves
 * nowhere, so no edge exists, and the diagnostic is what keeps the dependency
 * and boundary axes from reading that absence as a pass.
 *
 * @param projectRoot - Absolute project root the stored paths hang off.
 * @param facts - One read of the store against the current tree.
 * @param exactPaths - Paths the state model reported as `exact`; a file in any
 * other state is reported through `unknownFiles` instead.
 * @returns One diagnostic per unresolved reference, in stored path order.
 */
export function unresolvedReferenceDiagnostics(
  projectRoot: string,
  facts: ProjectFacts,
  exactPaths: ReadonlySet<string>,
): SnapshotDiagnostic[] {
  const diagnostics: SnapshotDiagnostic[] = [];
  for (const path of facts.scannedPaths) {
    if (!exactPaths.has(path)) continue;
    const sourceFile = portableJoin(projectRoot, path);
    for (const reference of facts.records.get(path)?.record.facts.references ??
      [])
      if ('unresolved' in reference.resolved)
        diagnostics.push(
          createDependencyDiagnostic(
            DEPENDENCY_DIAGNOSTIC_CODES.UNRESOLVED,
            `Could not resolve ${reference.specifier} from ${sourceFile}: no file exists at that path, with a source extension, or as a directory index.`,
            'Fix the specifier if its target was renamed, moved or deleted; if a build step generates the target, generate it first. Then run again — the dependency graph stays indeterminate until every local import resolves.',
            projectRoot,
            sourceFile,
            reference.specifier,
          ),
        );
  }
  return diagnostics;
}
