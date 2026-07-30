import {
  portableBasename,
  portableIsAbsolute,
  portableJoin,
} from '@ogham/cross-platform';

import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';
import {
  CONTRACT_INTENTS,
  FINAL_FILE_SUFFIX_PATTERN,
  PLACEMENT_BASES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_UNIT_KINDS,
} from '../../../constants/restructure.js';
import type { FractalNode } from '../../../types/fractal.js';
import type {
  ContractIntent,
  PlacementBasis,
  RestructureDecisionReason,
  RestructureNodeType,
  RestructureUnitKind,
} from '../../../types/restructure.js';

export interface TargetCandidate {
  basis: PlacementBasis;
  targetContainerPath: string;
  targetPath: string;
  targetNodeType: RestructureNodeType;
  decisionReasons: RestructureDecisionReason[];
}

function isValidNameHint(name: string): boolean {
  return (
    !portableIsAbsolute(name) &&
    portableBasename(name) === name &&
    name !== PORTABLE_PATH_MARKERS.PARENT &&
    name !== PORTABLE_PATH_MARKERS.EMPTY
  );
}

export function buildTargetCandidate(
  sourcePath: string,
  unitKind: RestructureUnitKind,
  contractIntent: ContractIntent,
  commonFractal: FractalNode,
  consumerCount: number,
  nameHint?: string,
): TargetCandidate {
  const decisionReasons: RestructureDecisionReason[] = [];
  const sourceName = portableBasename(sourcePath);
  const fallbackName =
    sourceName.replace(
      FINAL_FILE_SUFFIX_PATTERN,
      PORTABLE_PATH_MARKERS.EMPTY,
    ) || sourceName;
  const validHint = nameHint && isValidNameHint(nameHint) ? nameHint : null;
  if (nameHint && !validHint)
    decisionReasons.push(RESTRUCTURE_DECISION_REASONS.INVALID_NAME_HINT);

  let targetNodeType: RestructureNodeType;
  let basis: PlacementBasis;
  if (contractIntent === CONTRACT_INTENTS.INDEPENDENT) {
    targetNodeType = RESTRUCTURE_NODE_TYPES.FRACTAL;
    basis = PLACEMENT_BASES.PUBLIC_CONTRACT;
  } else if (contractIntent === CONTRACT_INTENTS.INTERNAL) {
    targetNodeType = RESTRUCTURE_NODE_TYPES.ORGAN;
    basis =
      consumerCount === 1
        ? PLACEMENT_BASES.SINGLE_OWNER
        : PLACEMENT_BASES.LOWEST_COMMON_FRACTAL;
    if (!validHint)
      decisionReasons.push(RESTRUCTURE_DECISION_REASONS.ORGAN_NAME_REQUIRED);
  } else {
    targetNodeType = RESTRUCTURE_NODE_TYPES.UNDETERMINED;
    basis =
      consumerCount === 1
        ? PLACEMENT_BASES.SINGLE_OWNER
        : PLACEMENT_BASES.LOWEST_COMMON_FRACTAL;
    decisionReasons.push(RESTRUCTURE_DECISION_REASONS.CONTRACT_INTENT_UNKNOWN);
  }

  const targetContainerPath = portableJoin(
    commonFractal.path,
    validHint ?? fallbackName,
  );
  return {
    basis,
    targetContainerPath,
    targetPath:
      unitKind === RESTRUCTURE_UNIT_KINDS.FILE
        ? portableJoin(targetContainerPath, sourceName)
        : targetContainerPath,
    targetNodeType,
    decisionReasons,
  };
}
