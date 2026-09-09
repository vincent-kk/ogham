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
  const diagnostics = evidence.diagnostics ?? [];
  for (const [index, diagnostic] of diagnostics.entries())
    causes.push({
      causeId: diagnostic.causeId,
      kind: 'analysis-incomplete',
      scope: { ...scope, path: diagnostic.path ?? null, rule: diagnostic.code },
      detail: diagnostic.message,
      sources: [
        {
          artifactPath: 'review-state.json',
          pointer: `/scope/diagnostics/${index}`,
        },
        { artifactPath: 'evidence.md', anchor: 'diagnostics' },
      ],
      adviceSource: 'deterministic',
      resolution: {
        question: diagnostic.specifier
          ? `Can ${diagnostic.path} resolve ${diagnostic.specifier}?`
          : `Can ${diagnostic.code} be evaluated conclusively?`,
        evidenceNeeded: [
          diagnostic.message,
          `Affected analysis: ${diagnostic.affects?.join(', ') || 'unknown; establish diagnostic impact before claiming completeness'}`,
        ],
        nextAction: diagnostic.specifier
          ? `Restore the intended import target ${diagnostic.specifier} consumed by ${diagnostic.path}; rerun dependencies and boundaries analysis on the corrected source.`
          : `Inspect ${diagnostic.path ?? 'the project'} for ${diagnostic.code}; obtain the missing observation and rerun ${diagnostic.affects?.join(', ') || 'the affected analysis'}. If unsupported, record the missing capability and its limitation.`,
        doneWhen:
          'A fresh snapshot resolves this diagnostic and conclusively evaluates its affected analysis axes.',
        suggestedOwner: 'agent',
      },
    });
  const unexplainedVerification =
    !['ok', 'violations'].includes(evidence.verificationStatus) &&
    !diagnostics.some(
      (diagnostic) =>
        !diagnostic.affects?.length ||
        diagnostic.affects.includes('verification'),
    );
  if (
    !evidence.evidenceComplete &&
    (diagnostics.length === 0 || unexplainedVerification)
  )
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
        question: unexplainedVerification
          ? 'Which verification evidence is still inconclusive?'
          : 'Which analysis evidence is still inconclusive?',
        evidenceNeeded: [
          'The incomplete analysis statuses and their diagnostics',
        ],
        nextAction: unexplainedVerification
          ? 'Inspect verification file counting and contract-link evidence; identify unsupported adapter capabilities and rerun verification independently of dependency recovery.'
          : 'Inspect the recorded diagnostics and obtain the missing evidence within the permitted review scope.',
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
