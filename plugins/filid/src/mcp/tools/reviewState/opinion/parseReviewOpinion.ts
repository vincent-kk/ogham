import { z } from 'zod';

import type {
  OpinionParseResult,
  UncheckedReviewOpinion,
} from './uncheckedOpinionTypes.js';
import { renderSchemaIssue } from './utils/renderSchemaIssue.js';

/** Structural schema for one reported review unit. */
const REVIEW_FILE_SCHEMA = z
  .object({
    path: z.string(),
    change: z.string(),
    chunk: z.string().nullable(),
    result: z.string(),
    reason: z.string().nullable(),
  })
  .strict();

/** Structural schema for one untrusted reviewer finding. */
const REVIEW_FINDING_SCHEMA = z
  .object({
    id: z.string(),
    severity: z.string(),
    category: z.string(),
    path: z.string(),
    existingCode: z.string(),
    lines: z.string().optional().default('unknown'),
    inDiff: z.boolean().optional().default(false),
    rule: z.string(),
    message: z.string(),
    evidence: z.string(),
    consequence: z.string(),
    recommendedAction: z.string(),
  })
  .strict();

/** Structural schema for one reviewer evidence gap. */
const REVIEW_GAP_SCHEMA = z
  .object({
    path: z.string(),
    rule: z.string(),
    detail: z.string(),
  })
  .strict();

/** Strict structural envelope for reviewer opinion JSON. */
const REVIEW_OPINION_SCHEMA = z
  .object({
    schema: z.number(),
    group: z.string(),
    round: z.number(),
    state: z.string(),
    sourceHash: z.string(),
    files: z.array(REVIEW_FILE_SCHEMA),
    findings: z.array(REVIEW_FINDING_SCHEMA),
    checked: z.array(z.string()),
    gaps: z.array(REVIEW_GAP_SCHEMA),
    riskPlan: z.string().nullable(),
  })
  .strict();

/** Maximum JSON parser diagnostic detail retained from an artifact. */
const JSON_PARSE_DETAIL_LIMIT = 240;

/**
 * Parse untrusted reviewer JSON without collapsing semantic errors.
 *
 * @param content Exact reviewer artifact bytes decoded as UTF-8.
 * @returns Structurally parsed opinion or one bounded parse problem.
 */
export function parseReviewOpinion(
  content: string,
): OpinionParseResult<UncheckedReviewOpinion> {
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

  const parsed = REVIEW_OPINION_SCHEMA.safeParse(value);
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
