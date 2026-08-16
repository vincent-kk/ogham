/** A markdown code span: matching backtick runs around the value the author meant. */
const CODE_SPAN = /^(`+)(.+)\1$/;

/**
 * Read the value an author wrote inside a markdown code span.
 *
 * A document value a markdown formatter would rewrite has one defence: a code
 * span. Prettier reads a bare `__tests__` in a heading as strong emphasis and
 * writes it back as `**tests**`, so wrapping is the only way to keep the name in
 * the document — which leaves the parser to see through the wrapper.
 *
 * @param value One heading capture or field value, code-spanned or bare.
 * @returns The trimmed value with one matching pair of backtick runs removed, or
 *   the trimmed value unchanged when no span surrounds it.
 */
export function unwrapCodeSpan(value: string): string {
  const trimmed = value.trim();
  const span = CODE_SPAN.exec(trimmed);
  return span ? span[2].trim() : trimmed;
}
