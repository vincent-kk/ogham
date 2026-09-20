import { portableJoin } from '@ogham/cross-platform';

import { FACTS_ADJUDICATION_STATES } from '../../../constants/facts.js';
import type { ProjectFacts } from '../../facts/index.js';
import type { DependencyReference } from '../../../types/adapters.js';

/** One edge an adjudication added, kept apart from what the records carry. */
export interface AppliedAdjudication {
  /** Project-relative POSIX path of the file the reference sits in. */
  path: string;
  /** `sourceText ?? specifier`, as the item names it. */
  reference: string;
  /** The in-project path the adopted edge points at. */
  resolvedPath: string;
  /** Digest of the judged lines, so a freeze can record what was applied. */
  lineDigest: string;
}

/** References the store stands behind, and the judgements that widened them. */
export interface FactsDependencyReferences {
  references: DependencyReference[];
  adjudications: AppliedAdjudication[];
}

/**
 * Turn what the store holds into the reference shape the graph consumes.
 *
 * Valid references are the record's plus the adopted ones (spec §4.5), and the
 * two are reported apart rather than merged into one indistinguishable list:
 * a frozen review has to record which judgements it applied, and a list that
 * cannot say where an edge came from cannot answer that later.
 *
 * Only files the scope covers and the state model calls `exact` contribute. A
 * file in any other state is an `unknownFiles` entry, not a source of edges —
 * reading half-bound records would be the silent narrowing spec §2.4 forbids.
 *
 * A reference the provider resolved nowhere travels with a null target rather
 * than being dropped: the graph attributes it to its file the way it always
 * has, which is what keeps a broken import out of a conclusion that requires
 * an absence, and what lets a review tell an unknown file inside its scope
 * from one outside it. `external` and `nonLiteral` resolutions carry no edge
 * and no attribution — no rule can hang on them (spec §5).
 *
 * Paths become absolute because that is what the graph and the adapters agree
 * on; the store keeps them project-relative because that is what a record can
 * be compared against on another machine.
 *
 * @param projectRoot - Absolute project root the stored paths hang off.
 * @param facts - One read of the store against the current tree.
 * @param exactPaths - Paths the state model reported as `exact`.
 * @returns The references to graph, and the judgements they include.
 */
export function factsDependencyReferences(
  projectRoot: string,
  facts: ProjectFacts,
  exactPaths: ReadonlySet<string>,
): FactsDependencyReferences {
  const references: DependencyReference[] = [];
  const adjudications: AppliedAdjudication[] = [];
  for (const path of facts.scannedPaths) {
    if (!exactPaths.has(path)) continue;
    const sourceFile = portableJoin(projectRoot, path);
    for (const reference of facts.records.get(path)?.record.facts.references ??
      [])
      if ('path' in reference.resolved || 'unresolved' in reference.resolved)
        references.push({
          sourceFile,
          rawSpecifier: reference.specifier,
          resolvedPath:
            'path' in reference.resolved
              ? portableJoin(projectRoot, reference.resolved.path)
              : null,
          kind: reference.kind,
          ...(reference.sourceText === undefined
            ? {}
            : { sourceText: reference.sourceText }),
        });
    for (const item of facts.adjudications.get(path)?.items ?? []) {
      if (item.state !== FACTS_ADJUDICATION_STATES.ADOPTED) continue;
      references.push({
        sourceFile,
        rawSpecifier: item.reference,
        resolvedPath: portableJoin(projectRoot, item.resolvedPath),
        kind: item.kind,
      });
      adjudications.push({
        path,
        reference: item.reference,
        resolvedPath: item.resolvedPath,
        lineDigest: item.lineDigest,
      });
    }
  }
  return { references, adjudications };
}
