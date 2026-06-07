export interface CommentExtractorOptions {
  sortOrder: 'top' | 'new';
  maxComments: number;
  maxParents?: number;
  maxReplies?: number;
  maxRepliesPerThread?: number;
}

/** Builds the `--extractor-args youtube:...` flag controlling comment fetch/sort. */
export function buildCommentExtractorArgs(
  options: CommentExtractorOptions,
): string[] {
  const parts = [`comment_sort=${options.sortOrder}`];
  const counts: Array<number | undefined> = [
    options.maxComments,
    options.maxParents,
    options.maxReplies,
    options.maxRepliesPerThread,
  ];
  while (counts.length > 0 && counts[counts.length - 1] === undefined)
    counts.pop();
  if (counts.length > 0)
    parts.push(`max_comments=${counts.map((c) => c ?? 'all').join(',')}`);
  return ['--extractor-args', `youtube:${parts.join(';')}`];
}
