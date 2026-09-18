import {
  pathForCompare,
  portableDirname,
  portableJoin,
  portableRelative,
  samePath,
} from '@ogham/cross-platform';

import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';
import {
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_PLAN_HASH_SEPARATOR,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewrite,
  ImportRewriteBuildResult,
  PlannedMove,
  RestructureDecisionReason,
} from '../../../types/restructure.js';
import { applySpecifierExtension } from '../specifiers/applySpecifierExtension.js';
import { specifierDenotesPath } from '../specifiers/specifierDenotesPath.js';

import { isAtOrWithin } from './isAtOrWithin.js';
import { relocateConsumerPath } from './relocateConsumerPath.js';

/**
 * Derive the import edits that keep every consumer of `sourcePath` pointing at
 * it once it sits at `targetPath`.
 * @param snapshot - Pre-move snapshot whose dependency evidence names the consumers
 * @param sourcePath - Absolute path of the unit being moved
 * @param targetPath - Absolute path consumers must reference afterwards
 * @param consumerPaths - Consumer files whose evidence is rewritten
 * @param plannedMoves - Executable moves of the same plan; a consumer they
 * relocate is rewritten at, and relative to, its post-plan path
 * @returns Path-like rewrites, plus a decision reason for any consumer
 * reference that is not an exact path-like specifier
 */
export function buildImportRewrites(
  snapshot: ProjectSnapshot,
  sourcePath: string,
  targetPath: string,
  consumerPaths: string[],
  plannedMoves: readonly PlannedMove[] = [],
): ImportRewriteBuildResult {
  const consumerIdentities = new Set(consumerPaths.map(pathForCompare));
  const sourceIsDirectory = [...snapshot.tree.nodes.values()].some((node) =>
    samePath(node.path, sourcePath),
  );
  const rewrites = new Map<string, ImportRewrite>();
  const reasons = new Set<RestructureDecisionReason>();

  for (const edge of snapshot.dependencyGraph.edges)
    for (const evidence of edge.evidence) {
      if (!consumerIdentities.has(pathForCompare(evidence.sourceFile)))
        continue;
      const referencesSource =
        samePath(evidence.resolvedPath, sourcePath) ||
        (sourceIsDirectory && isAtOrWithin(sourcePath, evidence.resolvedPath));
      if (!referencesSource) continue;
      const exactPathLike = specifierDenotesPath(
        evidence.sourceFile,
        evidence.rawSpecifier,
        evidence.resolvedPath,
      );
      if (!exactPathLike) {
        reasons.add(RESTRUCTURE_DECISION_REASONS.IMPORT_REWRITE_UNSUPPORTED);
        continue;
      }

      const relocatedPath = samePath(evidence.resolvedPath, sourcePath)
        ? targetPath
        : portableJoin(
            targetPath,
            portableRelative(sourcePath, evidence.resolvedPath),
          );
      const consumerPath = relocateConsumerPath(
        evidence.sourceFile,
        plannedMoves,
      );
      let requiredSpecifier = applySpecifierExtension(
        portableRelative(portableDirname(consumerPath), relocatedPath),
        evidence.rawSpecifier,
      );
      if (
        !pathForCompare(requiredSpecifier).startsWith(
          PORTABLE_PATH_MARKERS.PARENT_PREFIX,
        )
      )
        requiredSpecifier =
          PORTABLE_PATH_MARKERS.CURRENT_PREFIX + requiredSpecifier;
      const rewrite: ImportRewrite = {
        consumerPath,
        currentSpecifier: evidence.rawSpecifier,
        requiredSpecifier,
      };
      rewrites.set(
        [
          pathForCompare(rewrite.consumerPath),
          rewrite.currentSpecifier,
          rewrite.requiredSpecifier,
        ].join(RESTRUCTURE_PLAN_HASH_SEPARATOR),
        rewrite,
      );
    }

  return {
    rewrites: [...rewrites.values()].sort(
      (left, right) =>
        pathForCompare(left.consumerPath).localeCompare(
          pathForCompare(right.consumerPath),
        ) || left.currentSpecifier.localeCompare(right.currentSpecifier),
    ),
    decisionReasons: [...reasons],
  };
}
