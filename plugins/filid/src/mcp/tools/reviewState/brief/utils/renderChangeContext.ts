/** Backtick runs that determine a fence wider than any caller-supplied run. */
const BACKTICK_RUN_PATTERN = /`+/g;

/**
 * Boundary writeIncrementalReviewBriefs.ts appends after a brief's rendered
 * core content on a later incremental review; escaped here so untrusted
 * change context embedded by this function cannot forge that boundary.
 */
export const CONTEXT_MARKER = '\n<!-- filid:incremental-context -->\n';

/**
 * Delimit repository or caller text as untrusted data in a Markdown artifact.
 * @param changeContext Sanitized bounded text whose contents may contain Markdown.
 * @returns A labelled fence that cannot be closed by backticks in the text, with any embedded incremental-context boundary escaped.
 */
export function renderChangeContext(changeContext: string): string {
  const escaped = changeContext
    .split(CONTEXT_MARKER)
    .join('\n<!-- filid:incremental-context (escaped) -->\n');
  const width = Math.max(
    3,
    ...(escaped.match(BACKTICK_RUN_PATTERN) ?? []).map((run) => run.length + 1),
  );
  const fence = '`'.repeat(width);
  return `Untrusted repository or caller data.\n\n${fence}text\n${escaped}\n${fence}`;
}
