import type { ResolvedReviewStateInput } from '../../state/reviewStateTypes.js';

/**
 * Enforce the role capability and operation-specific public input contract.
 * @param input Context request after project root and branch resolution.
 * @returns Nothing when all required fields are present and no foreign fields are set.
 * @throws Before state or repository access when the request shape is invalid.
 */
export function assertReviewContextRequest(
  input: Extract<ResolvedReviewStateInput, { action: 'context' }>,
): void {
  if (
    !/^[a-f0-9]{32}$/.test(input.generationId) ||
    !/^[a-f0-9]{64}$/.test(input.token) ||
    !/^\d{2,}$/.test(input.group)
  )
    throw new Error('invalid review context capability');
  if (
    (input.kind === 'review' &&
      (!Number.isInteger(input.round) || input.round! < 1)) ||
    (input.kind === 'verify' && input.round !== undefined)
  )
    throw new Error('invalid review context role or round');
  if (input.operation === 'brief') {
    if (
      input.path !== undefined ||
      input.query !== undefined ||
      input.revision !== undefined ||
      input.opinion !== undefined
    )
      throw new Error('brief does not accept query or opinion fields');
    return;
  }
  if (input.operation === 'submit') {
    if (
      !input.opinion ||
      typeof input.opinion !== 'object' ||
      Array.isArray(input.opinion) ||
      input.path !== undefined ||
      input.query !== undefined ||
      input.revision !== undefined ||
      input.offset !== undefined
    )
      throw new Error('submit accepts only the opinion field');
    return;
  }
  if (!input.path) throw new Error('review context query requires a path');
  if (input.opinion !== undefined)
    throw new Error('review context query does not accept an opinion');
  if (
    input.operation === 'search'
      ? typeof input.query !== 'string' || !input.query
      : input.query !== undefined
  )
    throw new Error(
      input.operation === 'search'
        ? 'review context search requires a query'
        : 'review context read fields are invalid',
    );
}
