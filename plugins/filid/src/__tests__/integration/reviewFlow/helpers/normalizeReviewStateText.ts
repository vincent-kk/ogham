import type { ReviewStateRecord } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * Serialize a state with only the four designed nondeterministic values normalized:
 * generation id, creation time, seal time and absolute roots.
 * @param state Persisted review state.
 * @param roots Absolute roots (project, plugin) replaced by `<ROOT0>`, `<ROOT1>`, ….
 * @returns Pretty JSON whose remaining differences are real behavior differences.
 */
export function normalizeReviewStateText(
  state: ReviewStateRecord,
  roots: readonly string[],
): string {
  let text = JSON.stringify(
    {
      ...state,
      generationId: '<GENERATION>',
      preparedAt: '<CREATED_AT>',
      ...('sealedAt' in state ? { sealedAt: '<SEALED_AT>' } : {}),
    },
    null,
    2,
  );
  roots.forEach((root, index) => {
    text = text.replaceAll(root, `<ROOT${index}>`);
  });
  return text;
}
