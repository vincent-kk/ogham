import {
  pathForCompare,
  portableDirname,
  portableIsAbsolute,
  portableJoin,
  portableRelative,
  portableResolve,
  samePath,
} from '@ogham/cross-platform/paths';

import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';
import {
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_PLAN_HASH_SEPARATOR,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewrite,
  ImportRewriteBuildResult,
  RestructureDecisionReason,
} from '../../../types/restructure.js';

function isAtOrWithin(parentPath: string, targetPath: string): boolean {
  if (samePath(parentPath, targetPath)) return true;
  const relative = portableRelative(parentPath, targetPath);
  const comparable = pathForCompare(relative);
  return (
    comparable !== PORTABLE_PATH_MARKERS.PARENT &&
    !comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX) &&
    !portableIsAbsolute(relative)
  );
}

function isPathLikeSpecifier(specifier: string): boolean {
  const comparable = pathForCompare(specifier);
  return (
    portableIsAbsolute(specifier) ||
    comparable.startsWith(PORTABLE_PATH_MARKERS.CURRENT_PREFIX) ||
    comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX)
  );
}

export function buildImportRewrites(
  snapshot: ProjectSnapshot,
  sourcePath: string,
  targetPath: string,
  consumerPaths: string[],
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
      const exactPathLike =
        isPathLikeSpecifier(evidence.rawSpecifier) &&
        samePath(
          portableResolve(
            portableDirname(evidence.sourceFile),
            evidence.rawSpecifier,
          ),
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
      let requiredSpecifier = portableRelative(
        portableDirname(evidence.sourceFile),
        relocatedPath,
      );
      const comparableRequired = pathForCompare(requiredSpecifier);
      if (
        pathForCompare(evidence.rawSpecifier).startsWith(
          PORTABLE_PATH_MARKERS.CURRENT_PREFIX,
        ) &&
        !comparableRequired.startsWith(PORTABLE_PATH_MARKERS.CURRENT_PREFIX) &&
        !comparableRequired.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX)
      )
        requiredSpecifier =
          PORTABLE_PATH_MARKERS.CURRENT_PREFIX + requiredSpecifier;
      const rewrite: ImportRewrite = {
        consumerPath: evidence.sourceFile,
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
