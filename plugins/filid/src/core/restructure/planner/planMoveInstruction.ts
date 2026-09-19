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
  PlannedMove,
  PlanningDecisionReason,
} from '../../../types/restructure.js';
import {
  findLowestCommonFractal,
  resolveOwningFractal,
} from '../../analysis/lcaCalculator/index.js';
import { buildImportRewrites } from '../imports/buildImportRewrites.js';

import { buildRequiredArtifacts } from './buildRequiredArtifacts.js';
import { buildTargetCandidate } from './buildTargetCandidate.js';
import { describeDecision } from './describeDecision.js';
import { resolveConsumerPaths } from './resolveConsumerPaths.js';
import { resolveContractIntent } from './resolveContractIntent.js';
import { resolveUnitKind } from './resolveUnitKind.js';

/**
 * Plan one placement request against a pre-move snapshot.
 * @param snapshot - Pre-move snapshot supplying tree, consumers and evidence
 * @param request - Source path plus optional consumers, contract intent and organ name
 * @param orderedMoves - Executable moves of the same plan in execution order;
 * used only for the final paths and ownership of rewrites, never to choose the
 * target
 * @returns The normalized instruction, with `requiresDecision` set when evidence
 * cannot fix a name, contract or owner, and one explained decision per reason
 */
export function planMoveInstruction(
  snapshot: ProjectSnapshot,
  request: PlacementRequest,
  orderedMoves: readonly PlannedMove[] = [],
): MoveInstruction {
  const sourcePath = portableResolve(snapshot.projectRoot, request.sourcePath);
  const decisionReasons = new Set<PlanningDecisionReason>();
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
  const rewriteTargetPath =
    contractIntent === CONTRACT_INTENTS.INDEPENDENT && entryArtifact
      ? entryArtifact.path
      : target.targetPath;
  const imports = buildImportRewrites(
    snapshot,
    { sourcePath, targetPath: target.targetPath, rewriteTargetPath },
    orderedMoves,
  );
  const reasons = [...decisionReasons].sort();
  const requiresDecision = reasons.length > 0;
  const decisionContext = {
    projectRoot: snapshot.projectRoot,
    sourcePath,
    placementPath: placementFractal.path,
    graphCertainty: snapshot.dependencyGraph.certainty,
    organNameHint: request.organNameHint,
    outsideConsumerPaths: consumers.outsidePaths,
    entryForms: required.entryForms,
  };

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
    affectedImports: imports.required,
    preservedImports: imports.preserved,
    requiresDecision,
    decisionReasons: reasons,
    decisions: reasons.map((reason) =>
      describeDecision(reason, decisionContext),
    ),
  };
}
