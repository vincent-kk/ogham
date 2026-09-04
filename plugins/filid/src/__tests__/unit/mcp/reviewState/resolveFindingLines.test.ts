import { describe, expect, it } from 'vitest';

import { resolveFindingLines } from '../../../../mcp/tools/reviewState/diff/resolveFindingLines.js';

/** Hunk range that covers only line five in the post-change file. */
const LINE_FIVE_HUNK = {
  oldStart: 5,
  oldEnd: 5,
  newStart: 5,
  newEnd: 5,
} as const;

describe('resolveFindingLines', () => {
  it('prefers one hunk-local occurrence over a duplicate outside the hunk', () => {
    const result = resolveFindingLines(
      [
        'const target = true;',
        'const second = false;',
        'const third = false;',
        'const fourth = false;',
        'const target = true;',
      ].join('\n'),
      'const target = true;',
      [LINE_FIVE_HUNK],
    );

    expect(result).toEqual({ lines: '5-5', inDiff: true });
  });

  it('falls back to one whole-file occurrence outside the unit hunks', () => {
    const result = resolveFindingLines(
      [
        'const first = false;',
        'const target = true;',
        'const third = false;',
        'const fourth = false;',
        'const fifth = false;',
      ].join('\n'),
      'const target = true;',
      [LINE_FIVE_HUNK],
    );

    expect(result).toEqual({ lines: '2-2', inDiff: false });
  });

  it('leaves ambiguous hunk-local and whole-file occurrences unresolved', () => {
    const sourceText = [
      'const target = true;',
      'const target = true;',
      'const third = false;',
      'const target = true;',
      'const target = true;',
    ].join('\n');

    expect(
      resolveFindingLines(sourceText, 'const target = true;', [
        { oldStart: 4, oldEnd: 5, newStart: 4, newEnd: 5 },
      ]),
    ).toEqual({ lines: 'unknown', inDiff: false });
    expect(
      resolveFindingLines(sourceText, 'const target = true;', [
        { oldStart: 3, oldEnd: 3, newStart: 3, newEnd: 3 },
      ]),
    ).toEqual({ lines: 'unknown', inDiff: false });
  });

  it('matches trimmed multiline code and derives overlap from inclusive lines', () => {
    const result = resolveFindingLines(
      ['const before = true;', '  if (ready) {', '    run();', '  }'].join(
        '\n',
      ),
      'if (ready) {\n run();',
      [{ oldStart: 3, oldEnd: 3, newStart: 3, newEnd: 3 }],
    );

    expect(result).toEqual({ lines: '2-3', inDiff: true });
  });
});
