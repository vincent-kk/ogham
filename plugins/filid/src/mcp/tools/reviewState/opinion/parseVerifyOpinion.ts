import { z } from 'zod';

import type {
  OpinionParseResult,
  UncheckedVerifyOpinion,
} from './uncheckedOpinionTypes.js';
import { renderSchemaIssue } from './utils/renderSchemaIssue.js';

/** Structural schema for one untrusted verifier decision. */
const VERIFY_DECISION_SCHEMA = z
  .object({
    findingId: z.string(),
    verdict: z.string(),
    evidence: z.string(),
    reason: z.string(),
  })
  .strict();

/** Structural schema for one verdict-neutral verifier observation. */
const VERIFY_OBSERVATION_SCHEMA = z
  .object({
    path: z.string(),
    detail: z.string(),
  })
  .strict();

/** Strict structural envelope for verifier opinion JSON. */
const VERIFY_OPINION_SCHEMA = z
  .object({
    schema: z.number(),
    group: z.string(),
    state: z.string(),
    sourceHash: z.string(),
    decisions: z.array(VERIFY_DECISION_SCHEMA),
    observations: z.array(VERIFY_OBSERVATION_SCHEMA),
    checked: z.array(z.string()),
  })
  .strict();

/** Maximum JSON parser diagnostic detail retained from an artifact. */
const JSON_PARSE_DETAIL_LIMIT = 240;

/**
 * Parse untrusted verifier JSON without collapsing semantic errors.
 *
 * @param content Exact verifier artifact bytes decoded as UTF-8.
 * @returns Structurally parsed opinion or one bounded parse problem.
 */
export function parseVerifyOpinion(
  content: string,
): OpinionParseResult<UncheckedVerifyOpinion> {
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Invalid JSON.';
    return {
      opinion: null,
      problems: [
        {
          code: 'parse-error',
          detail: detail.slice(0, JSON_PARSE_DETAIL_LIMIT),
        },
      ],
    };
  }

  const parsed = VERIFY_OPINION_SCHEMA.safeParse(value);
  if (!parsed.success)
    return {
      opinion: null,
      problems: [
        {
          code: 'schema-mismatch',
          detail: renderSchemaIssue(parsed.error.issues[0]),
        },
      ],
    };

  return { opinion: parsed.data, problems: [] };
}
