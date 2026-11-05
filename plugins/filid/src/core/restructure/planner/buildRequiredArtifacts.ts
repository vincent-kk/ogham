import {
  pathForCompare,
  portableIsAbsolute,
  portableJoin,
  portableRelative,
} from '@ogham/cross-platform';

import { INTENT_MD } from '../../../constants/documentFiles.js';
import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';
import {
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_NODE_TYPES,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlanningDecisionReason,
  RequiredArtifact,
  RestructureNodeType,
} from '../../../types/restructure.js';

export interface RequiredArtifactResolution {
  artifacts: RequiredArtifact[];
  /** Module entry paths, relative to their fractal, found in the project; sorted, empty unless the target is a fractal. */
  entryForms: string[];
  decisionReasons: PlanningDecisionReason[];
}

function isOwnedRelativePath(path: string): boolean {
  const comparable = pathForCompare(path);
  return (
    comparable !== PORTABLE_PATH_MARKERS.PARENT &&
    !comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX) &&
    !portableIsAbsolute(path)
  );
}

/**
 * Describe mandatory artifacts without inventing an entry-point convention.
 * @param snapshot - Existing module-entry evidence for the selected project.
 * @param targetContainerPath - Absolute directory of the planned target.
 * @param targetNodeType - Only fractals own required boundary artifacts.
 * @returns INTENT and a proven entry form, or an explicit decision requirement.
 */
export function buildRequiredArtifacts(
  snapshot: ProjectSnapshot,
  targetContainerPath: string,
  targetNodeType: RestructureNodeType,
): RequiredArtifactResolution {
  if (targetNodeType !== RESTRUCTURE_NODE_TYPES.FRACTAL)
    return { artifacts: [], entryForms: [], decisionReasons: [] };
  const entryForms = new Map<
    string,
    { relativePath: string; adapterId: string }
  >();
  for (const node of snapshot.tree.nodes.values())
    for (const entryPoint of node.entryPoints) {
      if (entryPoint.kind !== 'module') continue;
      const relativePath = portableRelative(node.path, entryPoint.path);
      if (!isOwnedRelativePath(relativePath)) continue;
      entryForms.set(pathForCompare(relativePath), {
        relativePath,
        adapterId: entryPoint.adapterId,
      });
    }

  const artifacts: RequiredArtifact[] = [
    {
      role: REQUIRED_ARTIFACT_ROLES.INTENT_DOCUMENT,
      path: portableJoin(targetContainerPath, INTENT_MD),
    },
  ];
  const forms = [...entryForms.values()]
    .map(({ relativePath }) => relativePath)
    .sort((left, right) =>
      pathForCompare(left).localeCompare(pathForCompare(right)),
    );
  if (entryForms.size === 1) {
    const entry = entryForms.values().next().value;
    if (entry)
      artifacts.push({
        role: REQUIRED_ARTIFACT_ROLES.ENTRY_POINT,
        path: portableJoin(targetContainerPath, entry.relativePath),
        adapterId: entry.adapterId,
      });
    return { artifacts, entryForms: forms, decisionReasons: [] };
  }
  return {
    artifacts,
    entryForms: forms,
    decisionReasons: [
      RESTRUCTURE_DECISION_REASONS.ENTRY_POINT_EVIDENCE_REQUIRED,
    ],
  };
}
