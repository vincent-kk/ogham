import type {
  ReviewBlockerCause,
  ReviewVerdictEvidence,
} from '../../reviewVerdictTypes.js';

/**
 * Preserve global analysis certainty and worktree constraints independently of findings.
 * @param evidence Prepared scope statuses and committed-source identity.
 * @returns Typed global causes with bounded evidence-recovery advice.
 */
export function collectScopeBlockers(
  evidence: ReviewVerdictEvidence,
): ReviewBlockerCause[] {
  const causes: ReviewBlockerCause[] = [];
  const scope = { path: null, groupId: null, findingId: null, rule: null };
  if (!evidence.evidenceComplete)
    causes.push({
      kind: 'analysis-incomplete',
      scope,
      detail: `Analysis is inconclusive: structure=${evidence.structureStatus}; verification=${evidence.verificationStatus}.`,
      sources: [
        { artifactPath: 'review-state.json', pointer: '/scope' },
        { artifactPath: 'evidence.md', anchor: 'diagnostics' },
      ],
      adviceSource: 'deterministic',
      resolution: {
        question: 'Which analysis evidence is still inconclusive?',
        evidenceNeeded: [
          'The incomplete analysis statuses and their diagnostics',
        ],
        nextAction:
          'Inspect the recorded diagnostics and obtain the missing evidence within the permitted review scope.',
        doneWhen:
          'A new evidence collection conclusively evaluates the affected analysis.',
        suggestedOwner: 'agent',
      },
    });
  if (
    evidence.worktree === 'documents-only' ||
    evidence.worktree === 'source-dirty'
  )
    causes.push({
      kind: 'dirty-worktree',
      scope,
      detail: `Prepared worktree is ${evidence.worktree}.`,
      sources: [
        { artifactPath: 'review-state.json', pointer: '/scope/worktree' },
      ],
      adviceSource: 'deterministic',
      resolution: {
        question:
          'Does the committed review target include the intended changes?',
        evidenceNeeded: [
          'The recorded dirty paths and the intended committed review target',
        ],
        nextAction:
          'Confirm the intended target before preparing a fresh review. Do not commit, stash, or discard work without authorization.',
        doneWhen:
          'Fresh preparation observes a reviewable committed target without the blocking worktree disposition.',
        suggestedOwner: 'unknown',
      },
    });
  return causes;
}
