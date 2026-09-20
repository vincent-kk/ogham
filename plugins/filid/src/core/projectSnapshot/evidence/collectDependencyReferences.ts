import { DEPENDENCY_DIAGNOSTIC_CODES } from '../../../constants/dependencyDiagnosticCodes.js';
import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_DIAGNOSTIC_NEXT_ACTIONS,
  FACTS_FILE_STATES,
} from '../../../constants/facts.js';
import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type {
  AdapterResolution,
  DependencyReference,
} from '../../../types/adapters.js';
import type {
  AnalysisCertainty,
  SnapshotDiagnostic,
  UnknownFile,
} from '../../../types/fractal.js';
import {
  damagedJudgementDiagnostics,
  selectUnknownFiles,
} from '../../facts/index.js';
import type { FactsFileState, ProjectFacts } from '../../facts/index.js';

import { compareAdapterReferences } from './compareAdapterReferences.js';
import { factsDependencyReferences } from './factsDependencyReferences.js';
import type { AppliedAdjudication } from './factsDependencyReferences.js';
import { createUnfollowedLinkDiagnostic } from './utils/createUnfollowedLinkDiagnostic.js';
import { unresolvedReferenceDiagnostics } from './utils/unresolvedReferenceDiagnostics.js';

export interface CollectedDependencyReferences {
  /** `unsupported` when the declared facts scope covers nothing, `exact` otherwise; uncertainty lives in `unknownFiles`. */
  certainty: AnalysisCertainty;
  diagnostics: SnapshotDiagnostic[];
  filePaths: string[];
  references: DependencyReference[];
  /** The adjudicated items whose edges are part of `references` (spec §4.5). */
  adjudications: AppliedAdjudication[];
  /**
   * How many scanned files the declared facts scope excludes.
   *
   * A count rather than a diagnostic: excluding a file is a declared decision
   * that changes no conclusion, and a diagnostic every project always carries
   * teaches its reader to skip the list the real ones are in. Reported anyway,
   * because "we did not look at these" and "there was nothing to find" are
   * different answers (spec §3).
   */
  filesOutsideFactsScope: number;
  /** Files whose references filid cannot draw a conclusion from, each carrying its cause. */
  unknownFiles: UnknownFile[];
}

/**
 * Collect the local dependency references the facts store stands behind.
 *
 * The store is the source: only a file the state model calls `exact`
 * contributes edges, and every other in-scope file becomes an `unknownFiles`
 * entry carrying its state as the cause. No adapter fills a file the store
 * does not hold — filling it would hide a missing bootstrap and change
 * behaviour the day the adapter is removed (spec §11-7).
 *
 * Uncertainty the records cannot carry is attributed to its file as well:
 * ownership diagnostics and a symbolic link discovery did not follow.
 *
 * `filePaths` stays on adapter ownership because it is a snapshot-hash input;
 * it moves with the adapter, not before it.
 *
 * @param resolution Adapter ownership of the project's source files.
 * @param projectRoot Root the file paths are made relative to.
 * @param facts One read of the store against the current tree.
 * @param factsStates Each scanned file's state, from that same read.
 * @param compareAdapter Whether to run the adapter beside the store and report
 * where the two disagree; off on every product path, which is what keeps this
 * from parsing every file a second time.
 * @returns References, their diagnostics, the hashed file list, the applied
 * judgements, the attributed files and how many files the scope excludes.
 */
export async function collectDependencyReferences(
  resolution: AdapterResolution,
  projectRoot: string,
  facts: ProjectFacts,
  factsStates: ReadonlyMap<string, FactsFileState>,
  compareAdapter = false,
): Promise<CollectedDependencyReferences> {
  const diagnostics: SnapshotDiagnostic[] = [];
  const filePaths = [...resolution.ownership.keys()].sort();
  const unknownFiles: UnknownFile[] = [
    ...resolution.diagnostics.flatMap(({ code, path }) =>
      path
        ? [{ path: toProjectRelativePath(projectRoot, path), causes: [code] }]
        : [],
    ),
    ...resolution.unfollowedLinks.map((path) => ({
      path: toProjectRelativePath(projectRoot, path),
      causes: [DEPENDENCY_DIAGNOSTIC_CODES.SYMLINK_NOT_FOLLOWED],
    })),
  ];
  diagnostics.push(
    ...resolution.unfollowedLinks.map((path) =>
      createUnfollowedLinkDiagnostic(projectRoot, path),
    ),
  );

  if (!facts.scope.declared) {
    diagnostics.push({
      code: FACTS_DIAGNOSTIC_CODES.UNINITIALIZED,
      message:
        'The facts scope this project declares covers no file, so filid holds no reference facts for it and every reference-based judgement is undefined rather than passing.',
      affects: ['dependencies', 'boundaries'],
      nextAction: FACTS_DIAGNOSTIC_NEXT_ACTIONS.UNINITIALIZED,
    });
    return {
      certainty: 'unsupported',
      diagnostics,
      filePaths,
      references: [],
      adjudications: [],
      unknownFiles,
      filesOutsideFactsScope: 0,
    };
  }

  const exactPaths = new Set(
    [...factsStates]
      .filter(([, state]) => state === FACTS_FILE_STATES.EXACT)
      .map(([path]) => path),
  );
  const { references, adjudications } = factsDependencyReferences(
    projectRoot,
    facts,
    exactPaths,
  );
  unknownFiles.push(...selectUnknownFiles(factsStates));
  diagnostics.push(
    ...damagedJudgementDiagnostics(facts).map((report) => ({
      ...report,
      affects: ['dependencies', 'boundaries'] as const,
    })),
  );
  diagnostics.push(
    ...unresolvedReferenceDiagnostics(projectRoot, facts, exactPaths),
  );
  if (compareAdapter)
    diagnostics.push(
      ...(await compareAdapterReferences(
        resolution,
        projectRoot,
        references,
        exactPaths,
      )),
    );
  return {
    certainty: 'exact',
    diagnostics,
    filePaths,
    references,
    adjudications,
    unknownFiles,
    filesOutsideFactsScope: [...factsStates].filter(
      ([path, state]) =>
        state === FACTS_FILE_STATES.UNSUPPORTED &&
        facts.scope.defaultCovers(path),
    ).length,
  };
}
