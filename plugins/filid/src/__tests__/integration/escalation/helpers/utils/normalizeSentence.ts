/**
 * The form a collected sentence is hashed in.
 *
 * Whitespace runs, line breaks included, become one space and the ends are
 * trimmed, so reflowing a paragraph or a string does not change the entry;
 * every `${…}` interpolation becomes `${}`, because the expression is code and
 * the allowlist fixes wording. Markdown emphasis markers around a word go, so
 * `**abort** with` reads as the sentence it is; code spans, case and
 * punctuation stay: they are wording.
 * @param sentence Sentence as collected.
 * @returns The normalized sentence.
 */
export function normalizeSentence(sentence: string): string {
  return sentence
    .replace(/\$\{[^}]*\}/g, '${}')
    .split(/(`[^`]*`)/)
    .map((part, index) => (index % 2 === 1 ? part : stripEmphasis(part)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Drop Markdown emphasis markers that wrap a run of text.
 * @param text One stretch of sentence outside any code span.
 * @returns The same text with `**`, `__`, `*` and `_` wrappers removed.
 */
function stripEmphasis(text: string): string {
  return text
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/(?<![\w*])([*_])(?=\S)([^*_]*?\S)\1(?![\w*])/g, '$2');
}
