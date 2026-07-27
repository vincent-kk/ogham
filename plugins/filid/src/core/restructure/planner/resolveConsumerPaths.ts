import {
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
  portableResolve,
  samePath,
} from '@ogham/cross-platform/paths';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';
import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { RestructureDecisionReason } from '../../../types/restructure.js';
import { resolveOwningFractal } from '../../analysis/lcaCalculator/lcaCalculator.js';

export interface ConsumerPathResolution {
  paths: string[];
  decisionReasons: RestructureDecisionReason[];
}

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

function dedupePaths(paths: string[]): string[] {
  return [
    ...new Map(paths.map((path) => [pathForCompare(path), path])).values(),
  ].sort((left, right) =>
    pathForCompare(left).localeCompare(pathForCompare(right)),
  );
}

export function resolveConsumerPaths(
  snapshot: ProjectSnapshot,
  sourcePath: string,
  requestedPaths?: string[],
): ConsumerPathResolution {
  const reasons = new Set<RestructureDecisionReason>();
  let paths: string[];
  if (requestedPaths) {
    paths = requestedPaths.map((path) =>
      portableResolve(snapshot.projectRoot, path),
    );
  } else {
    if (snapshot.dependencyGraph.certainty !== ANALYSIS_CERTAINTIES.EXACT)
      reasons.add(
        RESTRUCTURE_DECISION_REASONS.DEPENDENCY_EVIDENCE_INDETERMINATE,
      );
    const sourceIsDirectory = [...snapshot.tree.nodes.values()].some((node) =>
      samePath(node.path, sourcePath),
    );
    paths = snapshot.dependencyGraph.edges.flatMap((edge) =>
      edge.evidence
        .filter(
          (evidence) =>
            samePath(evidence.resolvedPath, sourcePath) ||
            (sourceIsDirectory &&
              isAtOrWithin(sourcePath, evidence.resolvedPath)),
        )
        .map((evidence) => evidence.sourceFile),
    );
  }

  const normalized = dedupePaths(paths);
  const owned = normalized.filter((path) => {
    if (resolveOwningFractal(snapshot.tree, path)) return true;
    reasons.add(RESTRUCTURE_DECISION_REASONS.CONSUMER_PATH_OUTSIDE_PROJECT);
    return false;
  });
  if (owned.length === 0)
    reasons.add(RESTRUCTURE_DECISION_REASONS.CONSUMER_OWNER_REQUIRED);
  return { paths: owned, decisionReasons: [...reasons] };
}
