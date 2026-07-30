import {
  pathForCompare,
  portableIsAbsolute,
  portableJoin,
  portableRelative,
} from '@ogham/cross-platform';

import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';
import {
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_NODE_TYPES,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  RequiredArtifact,
  RestructureDecisionReason,
  RestructureNodeType,
} from '../../../types/restructure.js';

export interface RequiredArtifactResolution {
  artifacts: RequiredArtifact[];
  decisionReasons: RestructureDecisionReason[];
}

function isOwnedRelativePath(path: string): boolean {
  const comparable = pathForCompare(path);
  return (
    comparable !== PORTABLE_PATH_MARKERS.PARENT &&
    !comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX) &&
    !portableIsAbsolute(path)
  );
}

export function buildRequiredArtifacts(
  snapshot: ProjectSnapshot,
  targetContainerPath: string,
  targetNodeType: RestructureNodeType,
): RequiredArtifactResolution {
  if (targetNodeType !== RESTRUCTURE_NODE_TYPES.FRACTAL)
    return { artifacts: [], decisionReasons: [] };
  const entryForms = new Map<
    string,
    { relativePath: string; adapterId: string }
  >();
  for (const node of snapshot.tree.nodes.values())
    for (const entryPoint of node.entryPoints) {
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
    {
      role: REQUIRED_ARTIFACT_ROLES.DETAIL_DOCUMENT,
      path: portableJoin(targetContainerPath, DETAIL_MD),
    },
  ];
  if (entryForms.size === 1) {
    const entry = entryForms.values().next().value;
    if (entry)
      artifacts.push({
        role: REQUIRED_ARTIFACT_ROLES.ENTRY_POINT,
        path: portableJoin(targetContainerPath, entry.relativePath),
        adapterId: entry.adapterId,
      });
    return { artifacts, decisionReasons: [] };
  }
  return {
    artifacts,
    decisionReasons: [
      RESTRUCTURE_DECISION_REASONS.ENTRY_POINT_EVIDENCE_REQUIRED,
    ],
  };
}
