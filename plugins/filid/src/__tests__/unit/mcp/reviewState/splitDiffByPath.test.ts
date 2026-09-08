import { describe, expect, it } from 'vitest';

import { splitDiffByPath } from '../../../../mcp/tools/reviewState/handlers/utils/splitDiffByPath.js';

const section = (path: string, body: string) =>
  [
    `diff --git a/${path} b/${path}`,
    'index 1111111..2222222 100644',
    `--- a/${path}`,
    `+++ b/${path}`,
    '@@ -1 +1 @@',
    `-${body}`,
    `+${body}!`,
    '',
  ].join('\n');

describe('splitDiffByPath', () => {
  it('attributes each unquoted section verbatim to its path', () => {
    const a = section('src/a.ts', 'a');
    const b = section('src/b c.ts', 'b');
    const split = splitDiffByPath(a + b, ['src/b c.ts', 'src/a.ts']);
    expect(split.matched.get('src/a.ts')).toBe(a);
    expect(split.matched.get('src/b c.ts')).toBe(b);
    expect(split.unmatchedSections).toBe(0);
  });

  it('counts a quoted header instead of attributing it', () => {
    const quoted = section('"src/\\355\\225\\234.ts"', 'k');
    const plain = section('src/a.ts', 'a');
    const split = splitDiffByPath(quoted + plain, ['src/한.ts', 'src/a.ts']);
    expect([...split.matched.keys()]).toEqual(['src/a.ts']);
    expect(split.unmatchedSections).toBe(1);
  });

  it('does not treat a patch body line as a header', () => {
    const body = section('src/a.ts', 'diff --git a/x b/x');
    const split = splitDiffByPath(body, ['src/a.ts', 'x']);
    expect(split.matched.get('src/a.ts')).toBe(body);
    expect(split.matched.has('x')).toBe(false);
    expect(split.unmatchedSections).toBe(0);
  });

  it('counts leading non-header output so the caller falls back', () => {
    const colored = `\u001b[1m${section('src/a.ts', 'a')}`;
    const split = splitDiffByPath(colored, ['src/a.ts']);
    expect(split.matched.size).toBe(0);
    expect(split.unmatchedSections).toBe(1);
  });

  it('returns nothing for empty output', () => {
    const split = splitDiffByPath('', ['src/a.ts']);
    expect(split.matched.size).toBe(0);
    expect(split.unmatchedSections).toBe(0);
  });
});
