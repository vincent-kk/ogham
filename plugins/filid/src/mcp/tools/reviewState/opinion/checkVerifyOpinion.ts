import type { ReviewValidationProblem } from '../state/reviewStateTypes.js';

import type {
  CheckVerifyOpinionOptions,
  UncheckedVerifyOpinion,
} from './uncheckedOpinionTypes.js';
import type { VerifyOpinion } from './verifyOpinionTypes.js';

/** Verifier completion states admitted by schema seven. */
const VERIFY_OPINION_STATES = new Set<string>(['COMPLETE', 'INDETERMINATE']);

/** Verifier decision verdicts admitted by schema seven. */
const VERIFY_DECISION_VERDICTS = new Set<string>([
  'CONFIRMED',
  'REFUTED',
  'INDETERMINATE',
]);

/**
 * Check a structurally parsed verifier opinion against its required decisions.
 *
 * @param opinion Structurally valid but semantically untrusted opinion.
 * @param options Authoritative group, source, and decision identities.
 * @param problems Mutable sink receiving contract problems in traversal order.
 * @returns True when semantic checks narrow the opinion to its trusted type.
 */
export function checkVerifyOpinion(
  opinion: UncheckedVerifyOpinion,
  options: CheckVerifyOpinionOptions,
  problems: ReviewValidationProblem[],
): opinion is VerifyOpinion {
  if (opinion.schema !== 7)
    problems.push({ code: 'schema-mismatch', detail: 'Expected schema 7.' });
  if (opinion.group !== options.group)
    problems.push({
      code: 'schema-mismatch',
      detail: 'Group does not match prepared state.',
    });
  if (opinion.sourceHash !== options.sourceHash)
    problems.push({
      code: 'source-hash-mismatch',
      detail: 'Source hash does not match prepared state.',
    });
  if (!VERIFY_OPINION_STATES.has(opinion.state))
    problems.push({
      code: 'enum-invalid',
      detail: 'Verifier state is not recognized.',
    });

  const requiredCounts = new Map<string, number>();
  for (const findingId of options.decisionIds)
    requiredCounts.set(findingId, (requiredCounts.get(findingId) ?? 0) + 1);
  const matchedCounts = new Map<string, number>();
  for (const decision of opinion.decisions) {
    const required = requiredCounts.get(decision.findingId) ?? 0;
    const matched = matchedCounts.get(decision.findingId) ?? 0;
    if (matched >= required)
      problems.push({
        code: 'decision-unknown',
        findingId: decision.findingId,
        detail: 'Decision is unassigned or appears more than once.',
      });
    else matchedCounts.set(decision.findingId, matched + 1);

    if (!VERIFY_DECISION_VERDICTS.has(decision.verdict))
      problems.push({
        code: 'enum-invalid',
        findingId: decision.findingId,
        detail: 'Decision verdict is not recognized.',
      });

    if (decision.evidence.trim() === '')
      problems.push({
        code: 'field-empty',
        findingId: decision.findingId,
        detail: 'Decision evidence must not be blank.',
      });

    if (decision.reason.trim() === '')
      problems.push({
        code: 'field-empty',
        findingId: decision.findingId,
        detail: 'Decision reason must not be blank.',
      });
  }
  for (const [findingId, count] of requiredCounts) {
    const missing = count - (matchedCounts.get(findingId) ?? 0);
    for (let index = 0; index < missing; index += 1)
      problems.push({
        code: 'decision-missing',
        findingId,
        detail: 'Required decision is absent from the verifier opinion.',
      });
  }

  for (const observation of opinion.observations) {
    if (observation.path.trim() === '')
      problems.push({
        code: 'field-empty',
        detail: 'Observation path must not be blank.',
      });

    if (observation.detail.trim() === '')
      problems.push({
        code: 'field-empty',
        path: observation.path || undefined,
        detail: 'Observation detail must not be blank.',
      });
  }
  return problems.length === 0;
}
