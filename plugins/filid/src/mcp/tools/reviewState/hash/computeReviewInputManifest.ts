import type {
  ReviewInputManifest,
  ReviewInputSnapshot,
} from '../state/reviewIncrementalTypes.js';

import { computeReviewArtifactHash } from './computeReviewArtifactHash.js';

/**
 * Canonicalize an observed assignment and hash its semantic input sections.
 * @param input Complete digests supplied by the input observer, never an actor.
 * @returns Stable composition identity and supplied-input digest.
 * @throws When assignments repeat or a purported SHA-256 digest is malformed.
 */
export function computeReviewInputManifest(
  input: ReviewInputSnapshot,
): ReviewInputManifest {
  const assignment = [...input.assignment].sort((left, right) =>
    left.path < right.path
      ? -1
      : left.path > right.path
        ? 1
        : (left.chunk?.index ?? 0) - (right.chunk?.index ?? 0),
  );
  if (
    assignment.some(
      (unit, index) =>
        index > 0 &&
        unit.path === assignment[index - 1].path &&
        (unit.chunk?.index ?? 0) === (assignment[index - 1].chunk?.index ?? 0),
    )
  )
    throw new Error('duplicate review input assignment');
  const sections = [
    input.sourceHash,
    input.rulesHash,
    input.evidenceHash,
    input.contextHash,
    input.policyHash,
  ];
  if (
    sections.some(
      (digest, index) =>
        !(index === 3 && digest === null) &&
        (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)),
    )
  )
    throw new Error('invalid review input digest');
  const groupKey = computeReviewArtifactHash(
    JSON.stringify(
      assignment.map((unit) => [
        unit.path,
        unit.change,
        unit.chunk?.index ?? null,
        unit.chunk?.total ?? null,
        unit.owner,
      ]),
    ),
  );
  return {
    schemaVersion: 1,
    assignment,
    sourceHash: input.sourceHash,
    rulesHash: input.rulesHash,
    evidenceHash: input.evidenceHash,
    contextHash: input.contextHash,
    policyHash: input.policyHash,
    groupKey,
    preparedInputHash: computeReviewArtifactHash(
      JSON.stringify([1, groupKey, ...sections]),
    ),
  };
}
