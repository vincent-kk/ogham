import { portableResolve } from '@ogham/cross-platform';

import {
  CONTRACT_INTENTS,
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_REASON_BY_BASIS,
  RESTRUCTURE_REASON_TEXT,
} from '../../../constants/restructure.js';
import type { FractalNode, ProjectSnapshot } from '../../../types/fractal.js';
import type {
  MoveInstruction,
  PlacementRequest,
  RestructureDecisionReason,
} from '../../../types/restructure.js';
import {
  findLowestCommonFractal,
  resolveOwningFractal,
} from '../../analysis/lcaCalculator/index.js';
import { buildImportRewrites } from '../imports/buildImportRewrites.js';

import { buildRequiredArtifacts } from './buildRequiredArtifacts.js';
import { buildTargetCandidate } from './buildTargetCandidate.js';
import { resolveConsumerPaths } from './resolveConsumerPaths.js';
import { resolveContractIntent } from './resolveContractIntent.js';
import { resolveUnitKind } from './resolveUnitKind.js';

export function planMoveInstruction(
  snapshot: ProjectSnapshot,
  request: PlacementRequest,
): MoveInstruction {
  const sourcePath = portableResolve(snapshot.projectRoot, request.sourcePath);
  const decisionReasons = new Set<RestructureDecisionReason>();
  const sourceOwner = resolveOwningFractal(snapshot.tree, sourcePath);
  if (!sourceOwner)
    decisionReasons.add(
      RESTRUCTURE_DECISION_REASONS.SOURCE_PATH_OUTSIDE_PROJECT,
    );
  const consumers = resolveConsumerPaths(
    snapshot,
    sourcePath,
    request.consumerPaths,
  );
  consumers.decisionReasons.forEach((reason) => decisionReasons.add(reason));
  const commonFractal = findLowestCommonFractal(snapshot.tree, consumers.paths);
  if (!commonFractal)
    decisionReasons.add(RESTRUCTURE_DECISION_REASONS.CONSUMER_OWNER_REQUIRED);
  const rootNode = snapshot.tree.nodes.get(snapshot.tree.root);
  const placementFractal =
    commonFractal ?? sourceOwner ?? (rootNode as FractalNode);
  const contractIntent = resolveContractIntent(
    snapshot,
    sourcePath,
    request.contractIntent,
  );
  const unitKind = resolveUnitKind(snapshot, sourcePath);
  const target = buildTargetCandidate(
    sourcePath,
    unitKind,
    contractIntent,
    placementFractal,
    consumers.paths.length,
    request.organNameHint,
  );
  target.decisionReasons.forEach((reason) => decisionReasons.add(reason));
  const required = buildRequiredArtifacts(
    snapshot,
    target.targetContainerPath,
    target.targetNodeType,
  );
  required.decisionReasons.forEach((reason) => decisionReasons.add(reason));
  const entryArtifact = required.artifacts.find(
    ({ role }) => role === REQUIRED_ARTIFACT_ROLES.ENTRY_POINT,
  );
  const rewriteTarget =
    contractIntent === CONTRACT_INTENTS.INDEPENDENT && entryArtifact
      ? entryArtifact.path
      : target.targetPath;
  const imports = buildImportRewrites(
    snapshot,
    sourcePath,
    rewriteTarget,
    consumers.paths,
  );
  imports.decisionReasons.forEach((reason) => decisionReasons.add(reason));
  const reasons = [...decisionReasons].sort();
  const requiresDecision = reasons.length > 0;

  return {
    sourcePath,
    targetPath: target.targetPath,
    unitKind,
    targetNodeType: target.targetNodeType,
    basis: target.basis,
    consumerPaths: consumers.paths,
    ...(commonFractal ? { lowestCommonFractalPath: commonFractal.path } : {}),
    reason: requiresDecision
      ? RESTRUCTURE_REASON_TEXT.DECISION_REQUIRED
      : RESTRUCTURE_REASON_BY_BASIS[target.basis],
    requiredArtifacts: required.artifacts,
    affectedImports: imports.rewrites,
    requiresDecision,
    decisionReasons: reasons,
  };
}
