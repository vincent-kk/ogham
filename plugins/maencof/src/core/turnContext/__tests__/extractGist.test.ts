import { describe, expect, it } from 'vitest';

import { capGist, extractGist } from '../extractGist.js';

function doc(frontmatter: string, body = 'body text'): string {
  return `---\n${frontmatter}\n---\n${body}`;
}

describe('extractGist', () => {
  it('reads a plain gist scalar', () => {
    const content = doc('layer: 1\ngist: definition-first, density-focused');
    expect(extractGist(content, 128)).toBe('definition-first, density-focused');
  });

  it('reads a double-quoted gist containing a colon', () => {
    const content = doc('layer: 1\ngist: "principle: clarity over cleverness"');
    expect(extractGist(content, 128)).toBe(
      'principle: clarity over cleverness',
    );
  });

  it('caps a long gist to maxChars', () => {
    const content = doc('layer: 1\ngist: ' + 'a'.repeat(200));
    const result = extractGist(content, 128);
    expect(result).toBe('a'.repeat(128));
    expect([...(result ?? '')].length).toBe(128);
  });

  it('caps by code point, never splitting a surrogate pair', () => {
    const content = doc('layer: 1\ngist: ' + '😀'.repeat(10));
    const result = extractGist(content, 4);
    expect(result).toBe('😀😀😀😀');
    expect([...(result ?? '')].length).toBe(4);
  });

  it('returns null when there is no frontmatter block', () => {
    expect(extractGist('# Just a heading\n\nbody only', 128)).toBeNull();
  });

  it('returns null when frontmatter has no gist key', () => {
    expect(extractGist(doc('layer: 1\ntitle: Identity'), 128)).toBeNull();
  });

  it('returns null for an empty or whitespace-only gist', () => {
    expect(extractGist(doc('layer: 1\ngist: "   "'), 128)).toBeNull();
  });

  it('returns null when gist parses to a non-string scalar', () => {
    expect(extractGist(doc('layer: 1\ngist: 42'), 128)).toBeNull();
  });
});

describe('capGist', () => {
  it('trims and caps a raw gist string by code points', () => {
    expect(capGist('  hello  ', 128)).toBe('hello');
    expect(capGist('a'.repeat(200), 128)).toBe('a'.repeat(128));
  });

  it('returns null for a whitespace-only string', () => {
    expect(capGist('   ', 128)).toBeNull();
  });
});
