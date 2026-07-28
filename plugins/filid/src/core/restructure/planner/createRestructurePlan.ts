import { createHash } from 'node:crypto';

import { samePath } from '@ogham/cross-platform/paths';

import {
  RESTRUCTURE_HASH_ALGORITHM,
  RESTRUCTURE_HASH_ENCODING,
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_PLAN_HASH_SEPARATOR,
  RESTRUCTURE_PLAN_ID_PREFIX,
  RESTRUCTURE_SCHEMA_VERSION,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  RestructurePlan,
  RestructurePlanInput,
} from '../../../types/restructure.js';

import { planMoveInstruction } from './planMoveInstruction.js';

export function createRestructurePlan(
  snapshot: ProjectSnapshot,
  input: RestructurePlanInput,
): RestructurePlan {
  const instructions = input.requests.map((request) =>
    planMoveInstruction(snapshot, request),
  );
  const unresolved = instructions.filter((move) => move.requiresDecision);
  const resolved = instructions.filter((move) => !move.requiresDecision);
  const alreadyPlaced = resolved.filter((move) =>
    samePath(move.sourcePath, move.targetPath),
  );
  const moves = resolved.filter(
    (move) => !samePath(move.sourcePath, move.targetPath),
  );
  const planHash = createHash(RESTRUCTURE_HASH_ALGORITHM)
    .update(snapshot.snapshotHash)
    .update(RESTRUCTURE_PLAN_HASH_SEPARATOR)
    .update(JSON.stringify(input.requests))
    .digest(RESTRUCTURE_HASH_ENCODING);
  return {
    schemaVersion: RESTRUCTURE_SCHEMA_VERSION,
    planId: `${RESTRUCTURE_PLAN_ID_PREFIX}-${planHash}`,
    projectRoot: snapshot.projectRoot,
    snapshotHash: snapshot.snapshotHash,
    createdAt: snapshot.createdAt,
    moves,
    alreadyPlaced,
    unresolved,
    summary: {
      moveCount: moves.length,
      fractalsCreated: moves.filter(
        (move) => move.targetNodeType === RESTRUCTURE_NODE_TYPES.FRACTAL,
      ).length,
      organsCreated: moves.filter(
        (move) => move.targetNodeType === RESTRUCTURE_NODE_TYPES.ORGAN,
      ).length,
      alreadyPlacedCount: alreadyPlaced.length,
      decisionsRequired: unresolved.length,
    },
  };
}
