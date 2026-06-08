import { describe, expect, it } from 'vitest';

import { normalizeComments } from '@/ytdlp/operations/normalize-comments.js';

describe('normalizeComments', () => {
  it('maps raw fields onto CommentNode', () => {
    const [node] = normalizeComments([
      {
        id: 'a',
        text: 'hello',
        author: 'Alice',
        author_id: 'uid1',
        like_count: 7,
        is_pinned: true,
        author_is_uploader: false,
        is_favorited: false,
        timestamp: 1700000000,
        _time_text: '2 days ago',
        parent: 'root',
      },
    ]);
    expect(node.id).toBe('a');
    expect(node.text).toBe('hello');
    expect(node.author).toBe('Alice');
    expect(node.authorId).toBe('uid1');
    expect(node.likeCount).toBe(7);
    expect(node.isPinned).toBe(true);
    expect(node.isUploader).toBe(false);
    expect(node.timestamp).toBe(1700000000);
    expect(node.timeText).toBe('2 days ago');
    expect(node.parent).toBeUndefined();
    expect(node.depth).toBe(0);
  });

  it('treats "root" parent as a top-level comment (parent undefined)', () => {
    const [node] = normalizeComments([{ id: 'x', parent: 'root' }]);
    expect(node.parent).toBeUndefined();
    expect(node.depth).toBe(0);
  });

  it('computes depth=1 for a direct reply', () => {
    const nodes = normalizeComments([
      { id: 'p', parent: 'root' },
      { id: 'c', parent: 'p' },
    ]);
    const child = nodes.find((n) => n.id === 'c')!;
    expect(child.depth).toBe(1);
  });

  it('computes depth=2 for a nested reply chain', () => {
    const nodes = normalizeComments([
      { id: 'a', parent: 'root' },
      { id: 'b', parent: 'a' },
      { id: 'c', parent: 'b' },
    ]);
    expect(nodes.find((n) => n.id === 'c')!.depth).toBe(2);
  });

  it('treats orphan replies (missing parent id) as depth-0', () => {
    const nodes = normalizeComments([{ id: 'x', parent: 'missing' }]);
    expect(nodes[0].depth).toBe(0);
  });

  it('skips entries with no id', () => {
    const nodes = normalizeComments([{ text: 'no id here' }, { id: 'y' }]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('y');
  });

  it('falls back to time_text when _time_text is absent', () => {
    const [node] = normalizeComments([{ id: 'z', time_text: '1 hour ago' }]);
    expect(node.timeText).toBe('1 hour ago');
  });
});
