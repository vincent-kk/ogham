import {
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_VALIDATE_KINDS,
} from '../../../../../constants/reviewState.js';
import type { ReviewValidatePayload } from '../../state/reviewStateTypes.js';

import type { CreateValidatePayloadInput } from './validationHandlerTypes.js';

/** Shared immutable diagnostics default for successful opinion validation. */
const EMPTY_VALIDATE_DIAGNOSTICS: readonly never[] = Object.freeze([]);

/**
 * Enrich the common lifecycle envelope with validate-specific facts.
 *
 * @param input State, paths, problems, outputs, and bounded summary fields.
 * @returns One consistent review_state validate payload.
 */
export function createValidatePayload(
  input: CreateValidatePayloadInput,
): ReviewValidatePayload {
  const diagnostics = [...(input.diagnostics ?? EMPTY_VALIDATE_DIAGNOSTICS)];
  if (input.kind === REVIEW_VALIDATE_KINDS.REVIEW)
    return {
      projectRoot: input.paths.projectRoot,
      status: input.status,
      summary: {
        action: input.action,
        disposition: REVIEW_STATE_DISPOSITIONS.VALIDATED,
        kind: input.kind,
        group: input.group,
        round: input.round,
        ok: input.ok,
        problemCount: input.problemCount,
        findings: input.findings,
        newFindings: input.newFindings,
        nextRound: input.nextRound,
      },
      data: {
        problems: [...input.problems],
        opinionPath: input.opinionPath,
        verifyBriefPath: input.verifyBriefPath,
      },
      diagnostics,
    };
  return {
    projectRoot: input.paths.projectRoot,
    status: input.status,
    summary: {
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.VALIDATED,
      kind: input.kind,
      group: input.group,
      ok: input.ok,
      problemCount: input.problemCount,
      confirmed: input.confirmed,
      refuted: input.refuted,
      indeterminate: input.indeterminate,
    },
    data: {
      problems: [...input.problems],
      verifyPath: input.verifyPath,
    },
    diagnostics,
  };
}
