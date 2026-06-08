import { describe, expect, it } from 'vitest';

import { buildCommentExtractorArgs } from '@/ytdlp/operations/comment-extractor-args.js';

describe('buildCommentExtractorArgs', () => {
  it('emits comment_sort and max_comments with only maxComments', () => {
    const args = buildCommentExtractorArgs({
      sortOrder: 'top',
      maxComments: 50,
    });
    expect(args).toEqual([
      '--extractor-args',
      'youtube:comment_sort=top;max_comments=50',
    ]);
  });

  it('uses "new" sort order', () => {
    const args = buildCommentExtractorArgs({
      sortOrder: 'new',
      maxComments: 10,
    });
    expect(args[1]).toContain('comment_sort=new');
  });

  it('trailing undefined fields are stripped from max_comments', () => {
    const args = buildCommentExtractorArgs({
      sortOrder: 'top',
      maxComments: 100,
      maxParents: 20,
    });
    expect(args[1]).toBe('youtube:comment_sort=top;max_comments=100,20');
  });

  it('fills interior undefined slots with "all"', () => {
    const args = buildCommentExtractorArgs({
      sortOrder: 'top',
      maxComments: 100,
      maxParents: undefined,
      maxReplies: undefined,
      maxRepliesPerThread: 5,
    });
    expect(args[1]).toBe('youtube:comment_sort=top;max_comments=100,all,all,5');
  });
});
