import type {
  ReviewStatePaths,
  ReviewStatePayload,
  ReviewValidationProblem,
} from '../../state/reviewStateTypes.js';

/**
 * Bound actor-visible context so the MCP envelope never spills its body to a file.
 * @param paths Active generation paths, excluding all state contents and capabilities.
 * @param text Complete query text to paginate by UTF-16 offset.
 * @param offset Nonnegative start offset supplied by the actor.
 * @param receiptDigest Optional digest identifying the complete observed query scope.
 * @param validation Optional opinion-submission result, with bounded problem detail.
 * @returns A context payload containing no other actor assignments or state records.
 */
export function createReviewContextPayload(
  paths: ReviewStatePaths,
  text: string,
  offset: number,
  receiptDigest?: string,
  validation?: { ok: boolean; problems: ReviewValidationProblem[] },
): ReviewStatePayload {
  let part = text.slice(offset, offset + 8000);
  while (Buffer.byteLength(JSON.stringify(part), 'utf8') > 8000)
    part = part.slice(0, Math.floor(part.length * 0.8));
  const end = offset + part.length;
  return {
    projectRoot: paths.projectRoot,
    status: validation?.ok === false ? 'indeterminate' : 'ok',
    summary: {
      action: 'context',
      ...(validation
        ? { ok: validation.ok, problemCount: validation.problems.length }
        : {}),
    },
    data: {
      reviewDirectory: paths.reviewDirectory,
      statePath: paths.statePath,
      context: {
        text: part,
        offset,
        total: text.length,
        nextOffset: end < text.length ? end : null,
        ...(receiptDigest ? { receiptDigest } : {}),
      },
      ...(validation ? { problems: validation.problems.slice(0, 8) } : {}),
    },
    diagnostics: [],
  };
}
