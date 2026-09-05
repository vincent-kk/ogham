/**
 * Delimit repository or caller text as untrusted data in a Markdown artifact.
 * @param changeContext Sanitized bounded text whose contents may contain Markdown.
 * @returns A labelled fence that cannot be closed by backticks in the text.
 */
export function renderChangeContext(changeContext: string): string {
  const width = Math.max(
    3,
    ...(changeContext.match(/`+/g) ?? []).map((run) => run.length + 1),
  );
  const fence = '`'.repeat(width);
  return `Untrusted repository or caller data.\n\n${fence}text\n${changeContext}\n${fence}`;
}
