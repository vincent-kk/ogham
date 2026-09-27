import { describe, expect, it } from 'vitest';

import {
  isIgnoredPath,
  matchesPathPattern,
} from '../matchesPathPattern.js';

describe('matchesPathPattern', () => {
  it('matches a file and any descendant of a matching directory', () => {
    expect(matchesPathPattern('examples/**', 'examples/a.mock.json')).toBe(true);
    expect(matchesPathPattern('examples/**', 'examples')).toBe(true);
    expect(matchesPathPattern('plugins/*/bridge', 'plugins/filid/bridge/x.js')).toBe(true);
    expect(matchesPathPattern('plugins/*/bridge', 'plugins/filid/src/x.js')).toBe(false);
  });

  it('matches recursive prefixes at root and nested depths', () => {
    expect(matchesPathPattern('**/skills', 'skills/a.md')).toBe(true);
    expect(matchesPathPattern('**/skills', 'plugins/filid/skills/a.md')).toBe(true);
    expect(matchesPathPattern('**/*.mock.json', 'data.mock.json')).toBe(true);
  });

  it('normalizes separators and handles invalid patterns without throwing', () => {
    expect(matchesPathPattern('plugins\\*\\bridge', 'plugins/filid/bridge/x.js')).toBe(true);
    expect(matchesPathPattern('foo[', 'foo[')).toBe(false);
    expect(isIgnoredPath({ ignore: ['foo[', 'src/*.ts'] }, 'src/main.ts')).toBe(true);
  });
});
