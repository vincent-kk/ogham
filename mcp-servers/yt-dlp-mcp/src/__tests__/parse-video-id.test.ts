import { describe, expect, it } from 'vitest';

import { parseVideoId } from '../utils/parse-video-id.js';

describe('parseVideoId', () => {
  it('extracts from watch URLs', () => {
    expect(parseVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtu.be short links', () => {
    expect(parseVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from shorts/embed paths', () => {
    expect(parseVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('accepts a bare 11-char id', () => {
    expect(parseVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube or malformed URLs', () => {
    expect(parseVideoId('https://vimeo.com/12345')).toBeNull();
    expect(parseVideoId('not a url')).toBeNull();
  });
});
