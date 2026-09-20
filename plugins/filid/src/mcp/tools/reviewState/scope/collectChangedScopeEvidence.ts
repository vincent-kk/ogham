import { writeFileAtomicallySync } from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';

import type {
  CollectChangedScopeEvidenceInput,
  CollectedChangedScopeEvidence,
} from './changedScopeEvidenceTypes.js';
import { computeChangedScopeEvidence } from './computeChangedScopeEvidence.js';
import { renderEvidenceMarkdown } from './renderEvidenceMarkdown.js';

/**
 * Collect and persist committed roster and FCA evidence from one shared snapshot.
 * @param input Prepared source identity, effective settings, and evidence metadata.
 * @returns Existing prepare-facing scope facts after canonical evidence is written.
 * @throws When changed-scope computation fails or the evidence path is unwritable.
 */
export async function collectChangedScopeEvidence(
  input: CollectChangedScopeEvidenceInput,
): Promise<CollectedChangedScopeEvidence> {
  const { evidencePath, factsPath, createdAt, ...computationInput } = input;
  const computed = await computeChangedScopeEvidence(computationInput);
  // Written before the evidence it belongs to is: a generation whose facts are
  // missing cannot be compared against, and prepare's completeness check reads
  // both (spec §9).
  const facts = `${JSON.stringify(computed.frozenFacts, null, 2)}\n`;
  writeFileAtomicallySync(factsPath, facts);
  writeFileAtomicallySync(
    evidencePath,
    renderEvidenceMarkdown({
      sourceHash: input.source.sourceHash,
      snapshotHash: computed.snapshotHash,
      ...computed.statuses,
      worktree: computed.worktree,
      createdAt,
      files: computed.files,
      candidates: computed.candidates,
      informational: computed.informational,
      outOfScope: computed.outOfScope,
      diagnostics: computed.evidenceDiagnostics,
      outOfScopeDiagnostics: computed.outOfScopeDiagnostics,
    }),
  );

  return {
    factsDigest: computeReviewArtifactHash(facts),
    evidenceDiagnostics: computed.evidenceDiagnostics,
    outOfScopeDiagnostics: computed.outOfScopeDiagnostics,
    snapshotHash: computed.snapshotHash,
    evidenceComplete: computed.evidenceComplete,
    worktree: computed.worktree,
    dirtyPaths: computed.dirtyPaths,
    dirtyPathsHash: computed.dirtyPathsHash,
    statuses: {
      analysisAxes: computed.statuses.analysisAxes,
      structure: computed.statuses.structure,
      verification: computed.statuses.verification,
    },
    files: computed.files,
    candidates: computed.candidates,
    informational: computed.informational,
    outOfScopeCount: computed.outOfScopeCount,
    infoCount: computed.infoCount,
    diagnostics: computed.diagnostics,
  };
}
