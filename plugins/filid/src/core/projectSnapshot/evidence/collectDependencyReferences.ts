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

  if (resolution.adapters.length === 0) {
    diagnostics.push({
      code: 'dependency-adapter-unavailable',
      message:
        "No active structure adapter reads this project's source files, so no dependency evidence exists.",
      nextAction:
        'Filid ships only the ecmascript adapter; if adapters.mode is "explicit", check that adapters.enabled lists it. For other languages, report dependency, boundary and DAG results as unsupported, never as passing.',
      affects: ['dependencies', 'boundaries'],
    });
    return { certainty, diagnostics, filePaths, references };
  }

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
              `Could not resolve ${reference.rawSpecifier} from ${filePath}: no file exists at that path, with a source extension, or as a directory index.`,
              'Fix the specifier if its target was renamed, moved or deleted; if a build step generates the target, generate it first. Then run again — the dependency graph stays indeterminate until every local import resolves.',
              projectRoot,
              filePath,
              reference.rawSpecifier,
            ),
          );
        else if (reference.certainty === 'indeterminate')
          diagnostics.push(
            createDependencyDiagnostic(
              'uncertain-local-dependency',
              `Could not confirm that ${reference.rawSpecifier} in ${filePath} (line ${reference.line}) is code: the lexer could not pair a quote before it on that line, or lost track of token boundaries earlier in the file.`,
              `Read line ${reference.line} and the text above it. If the reference is real code, the dependency graph is missing an edge; if it is text, nothing is imported. The evidence stays indeterminate until the file lexes exactly: with the user's consent, rewrite the unpaired quote — typically an apostrophe in JSX text such as Don't, written as &apos; or {"'"} — and run again.`,
              projectRoot,
              filePath,
              reference.rawSpecifier,
            ),
          );
    } catch (error) {
      certainty = 'indeterminate';
      const rawMessage = error instanceof Error ? error.message : String(error);
      diagnostics.push({
        code: 'dependency-analysis-failed',
        message: `Could not read the dependencies of ${filePath}: ${rawMessage}`,
        nextAction:
          "Check that the file is readable source text, then run again; if it repeats, report this message to the user. The file's dependencies are unknown until then.",
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
