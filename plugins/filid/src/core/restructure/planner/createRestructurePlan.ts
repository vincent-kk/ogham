import { createHash } from 'node:crypto';

import { samePath } from '@ogham/cross-platform';

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
  MoveInstruction,
  RestructurePlan,
  RestructurePlanInput,
} from '../../../types/restructure.js';

import { planMoveInstruction } from './planMoveInstruction.js';

function isExecutableMove(move: MoveInstruction): boolean {
  return !move.requiresDecision && !samePath(move.sourcePath, move.targetPath);
}

export function createRestructurePlan(
  snapshot: ProjectSnapshot,
  input: RestructurePlanInput,
): RestructurePlan {
  // Targets never depend on rewrites: the first pass fixes every executable
  // move, the second rewrites each consumer where the whole plan leaves it.
  const plannedMoves = input.requests
    .map((request) => planMoveInstruction(snapshot, request))
    .filter(isExecutableMove);
  const instructions = input.requests.map((request) =>
    planMoveInstruction(snapshot, request, plannedMoves),
  );
  const unresolved = instructions.filter((move) => move.requiresDecision);
  const alreadyPlaced = instructions.filter(
    (move) =>
      !move.requiresDecision && samePath(move.sourcePath, move.targetPath),
  );
  const moves = instructions.filter(isExecutableMove);
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
