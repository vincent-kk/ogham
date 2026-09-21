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
import type { RelevanceTarget } from '../../analysis/dependencyGraph/index.js';

import { collectPlanBaseline } from './collectPlanBaseline.js';
import { collectPlanProbePaths } from './collectPlanProbePaths.js';
import { collectPlanReadPaths } from './collectPlanReadPaths.js';
import { collectRelevanceUnits } from './collectRelevanceUnits.js';
import { computePlanReadHash } from './computePlanReadHash.js';
import { markOrderConflict } from './markOrderConflict.js';
import { orderPlannedMoves } from './orderPlannedMoves.js';
import { partitionPlanUnknownFiles } from './partitionPlanUnknownFiles.js';
import { planMoveInstruction } from './planMoveInstruction.js';
import { readUnknownFileText } from './readUnknownFileText.js';

function isExecutableMove(move: MoveInstruction): boolean {
  return !move.requiresDecision && !samePath(move.sourcePath, move.targetPath);
}

/**
 * Build a read-only placement plan from one snapshot.
 * @param snapshot Pre-move snapshot.
 * @param input Placement requests.
 * @param readFileText Text of an unknown file for the relevance filter, by
 *   project-relative path; null when it cannot be read.
 * @returns The plan, with the unknown files split by relevance, the baseline
 *   postcondition compares against, and the read set precondition hashes.
 */
export function createRestructurePlan(
  snapshot: ProjectSnapshot,
  input: RestructurePlanInput,
  readFileText: (relativePath: string) => string | null = (relativePath) =>
    readUnknownFileText(snapshot.projectRoot, relativePath),
): RestructurePlan {
  const texts = new Map<string, string | null>();
  const readText = (relativePath: string): string | null => {
    if (!texts.has(relativePath))
      texts.set(relativePath, readFileText(relativePath));
    return texts.get(relativePath) ?? null;
  };
  const unknownFilesFor = (target: RelevanceTarget) =>
    partitionPlanUnknownFiles(snapshot, [target], [], readText).relevant;
  // Targets never depend on rewrites: the first pass fixes the executable
  // candidates, ordering drops the ones no order can run, and the second pass
  // writes each rewrite against the layout the ordered moves leave.
  const candidates = input.requests
    .map((request, index) => ({
      index,
      move: planMoveInstruction(snapshot, request, unknownFilesFor),
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
    const move = planMoveInstruction(
      snapshot,
      request,
      unknownFilesFor,
      orderedMoves,
    );
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
      preservedImports: [],
    }));
  const alreadyPlaced = instructions.filter(
    (move) =>
      !move.requiresDecision && samePath(move.sourcePath, move.targetPath),
  );
  const moves = order.map(
    (position) => instructions[candidates[position].index],
  );
  const relevance = collectRelevanceUnits(snapshot.tree, [
    ...moves,
    ...alreadyPlaced,
    ...unresolved,
  ]);
  const unknownFiles = partitionPlanUnknownFiles(
    snapshot,
    relevance.targets,
    relevance.consumerPaths,
    readText,
  );
  const readPaths = collectPlanReadPaths(
    snapshot,
    moves,
    unknownFiles.readPaths,
  );
  const probePaths = collectPlanProbePaths(
    snapshot.projectRoot,
    moves,
    readPaths,
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
    readPaths,
    probePaths,
    readHash: computePlanReadHash(snapshot.projectRoot, readPaths, probePaths),
    createdAt: snapshot.createdAt,
    moves,
    alreadyPlaced,
    unresolved,
    unknownFiles: {
      relevant: unknownFiles.relevant,
      other: unknownFiles.other,
    },
    baseline: collectPlanBaseline(snapshot),
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
      affectedImportCount: moves.reduce(
        (count, move) => count + move.affectedImports.length,
        0,
      ),
    },
  };
}
