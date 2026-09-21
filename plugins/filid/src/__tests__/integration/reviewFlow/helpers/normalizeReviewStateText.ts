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
    // A Windows root reaches the text with every backslash escaped, so its raw
    // spelling never occurs there; on POSIX the two spellings are one.
    for (const spelling of new Set([root, JSON.stringify(root).slice(1, -1)]))
      text = text.replaceAll(spelling, `<ROOT${index}>`);
  });
  return text;
}
