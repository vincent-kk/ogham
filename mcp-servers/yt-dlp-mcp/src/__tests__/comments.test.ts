import { describe, expect, it } from 'vitest';

import { buildThreads } from '../ytdlp/operations/build-threads.js';
import { commentsOperation } from '../ytdlp/operations/comments.js';
import { renderMarkdownTree } from '../ytdlp/operations/render-markdown-tree.js';

import { makeFakeRunner } from './helpers/fake-runner.js';
import { SAMPLE_URL } from './helpers/fixtures.js';
import { makeOpContext } from './helpers/test-context.js';

const INFO = {
  id: 'abc',
  comments: [
    {
      id: 'a',
      text: 'root one',
      author: 'Alice',
      parent: 'root',
      like_count: 5,
      author_is_uploader: true,
    },
    { id: 'b', text: 'a reply', author: 'Bob', parent: 'a', like_count: 1 },
    { id: 'c', text: 'root two', author: 'Carol', parent: 'root' },
    { id: 'd', text: 'orphan', author: 'Dan', parent: 'missing-parent' },
  ],
};

async function load() {
  const { ctx, env } = await makeOpContext(
    makeFakeRunner({ stdout: JSON.stringify(INFO) }),
  );
  const result = await commentsOperation(ctx, {
    url: SAMPLE_URL,
    maxComments: 20,
    sortOrder: 'top',
  });
  await env.cleanup();
  return result;
}

describe('commentsOperation', () => {
  it('counts roots and replies with computed depth', async () => {
    const result = await load();
    expect(result.count).toBe(4);
    expect(result.replyCount).toBe(1);
    expect(result.comments.find((c) => c.id === 'b')?.depth).toBe(1);
  });

  it('treats orphan replies as depth-0 roots', async () => {
    const result = await load();
    expect(result.comments.find((c) => c.id === 'd')?.depth).toBe(0);
  });
});

describe('comment-tree', () => {
  it('nests replies under their parent', async () => {
    const { comments } = await load();
    const roots = buildThreads(comments);
    expect(roots).toHaveLength(3); // a, c, and orphan d
    expect(roots.find((r) => r.id === 'a')?.replies).toHaveLength(1);
  });

  it('renders markdown threads with badges', async () => {
    const { comments } = await load();
    const md = renderMarkdownTree(buildThreads(comments));
    expect(md).toContain('## Thread 1');
    expect(md).toContain('Alice');
    expect(md).toContain('UPLOADER');
  });

  it('prunes replies past maxDepth', async () => {
    const { comments } = await load();
    const roots = buildThreads(comments, 0);
    expect(roots.every((r) => (r.replies ?? []).length === 0)).toBe(true);
  });
});
