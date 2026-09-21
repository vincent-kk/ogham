import {
  pathForCompare,
  portableResolve,
  samePath,
} from '@ogham/cross-platform';

import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import type { ProjectSnapshot, UnknownFile } from '../../../types/fractal.js';
import type { PlanningDecisionReason } from '../../../types/restructure.js';
import { resolveOwningFractal } from '../../analysis/lcaCalculator/index.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

export interface ConsumerPathResolution {
  paths: string[];
  /** Consumer paths dropped because no fractal of the project owns them. */
  outsidePaths: string[];
  decisionReasons: PlanningDecisionReason[];
}

function dedupePaths(paths: string[]): string[] {
  return [
    ...new Map(paths.map((path) => [pathForCompare(path), path])).values(),
  ].sort((left, right) =>
    pathForCompare(left).localeCompare(pathForCompare(right)),
  );
}

/**
 * Consumers that place a unit: the requested ones, or the graph's.
 * @param snapshot Pre-move snapshot.
 * @param sourcePath Absolute source of the unit.
 * @param relatedUnknownFiles Unknown files related to the unit; any of them may
 *   hide a consumer the graph does not show.
 * @param requestedPaths Caller's consumers, used as given when present.
 * @returns Owned consumer paths, the dropped ones and the decision reasons.
 */
export function resolveConsumerPaths(
  snapshot: ProjectSnapshot,
  sourcePath: string,
  relatedUnknownFiles: readonly UnknownFile[],
  requestedPaths?: string[],
): ConsumerPathResolution {
  const reasons = new Set<PlanningDecisionReason>();
  let paths: string[];
  if (requestedPaths)
    paths = requestedPaths.map((path) =>
      portableResolve(snapshot.projectRoot, path),
    );
  else {
    if (relatedUnknownFiles.length > 0)
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
            (samePath(evidence.resolvedPath, sourcePath) ||
              (sourceIsDirectory &&
                isAtOrWithin(sourcePath, evidence.resolvedPath))) &&
            !isAtOrWithin(sourcePath, evidence.sourceFile),
        )
        .map((evidence) => evidence.sourceFile),
    );
  }

  const normalized = dedupePaths(paths);
  const owned = normalized.filter((path) =>
    resolveOwningFractal(snapshot.tree, path),
  );
  const outsidePaths = normalized.filter((path) => !owned.includes(path));
  if (outsidePaths.length > 0)
    reasons.add(RESTRUCTURE_DECISION_REASONS.CONSUMER_PATH_OUTSIDE_PROJECT);
  if (owned.length === 0)
    reasons.add(RESTRUCTURE_DECISION_REASONS.CONSUMER_OWNER_REQUIRED);
  return { paths: owned, outsidePaths, decisionReasons: [...reasons] };
}
