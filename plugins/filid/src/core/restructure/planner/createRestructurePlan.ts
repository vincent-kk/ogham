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

import { markOrderConflict } from './markOrderConflict.js';
import { orderPlannedMoves } from './orderPlannedMoves.js';
import { planMoveInstruction } from './planMoveInstruction.js';

function isExecutableMove(move: MoveInstruction): boolean {
  return !move.requiresDecision && !samePath(move.sourcePath, move.targetPath);
}

export function createRestructurePlan(
  snapshot: ProjectSnapshot,
  input: RestructurePlanInput,
): RestructurePlan {
  // Targets never depend on rewrites: the first pass fixes the executable
  // candidates, ordering drops the ones no order can run, and the second pass
  // writes each rewrite against the layout the ordered moves leave.
  const candidates = input.requests
    .map((request, index) => ({
      index,
      move: planMoveInstruction(snapshot, request),
    }))
    .filter(({ move }) => isExecutableMove(move));
  const { order, conflicts } = orderPlannedMoves(
    candidates.map(({ move }) => move),
    snapshot,
  );
  const orderedMoves = order.map((position) => candidates[position].move);
  const conflicted = new Map(
    conflicts.map(({ index, cause, related }) => [
      candidates[index].index,
      {
        cause,
        relatedSources: related.map(
          (position) => candidates[position].move.sourcePath,
        ),
      },
    ]),
  );
  const instructions = input.requests.map((request, index) => {
    const move = planMoveInstruction(snapshot, request, orderedMoves);
    const conflict = conflicted.get(index);
    return conflict
      ? markOrderConflict(move, conflict.cause, conflict.relatedSources)
      : move;
  });
  const unresolved = instructions
    .filter((move) => move.requiresDecision)
    .map((move) => ({
      ...move,
      affectedImports: [],
      delegatedImports: [],
      preservedImports: [],
    }));
  const alreadyPlaced = instructions.filter(
    (move) =>
      !move.requiresDecision && samePath(move.sourcePath, move.targetPath),
  );
  const moves = order.map(
    (position) => instructions[candidates[position].index],
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
      delegatedImportCount: moves.reduce(
        (count, move) => count + move.delegatedImports.length,
        0,
      ),
    },
  };
}
