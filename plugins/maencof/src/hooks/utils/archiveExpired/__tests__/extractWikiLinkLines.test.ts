import { describe, expect, it } from 'vitest';

import { extractWikiLinkLines } from '../utils/extractWikiLinkLines.js';

describe('extractWikiLinkLines', () => {
  it('extracts wikilinks as list lines', () => {
    const body = 'Related: [[cve/other-item]] and [[concepts/security]].';

    expect(extractWikiLinkLines(body)).toEqual([
      '- [[cve/other-item]]',
      '- [[concepts/security]]',
    ]);
  });

  it('deduplicates repeated wikilinks', () => {
    const body = '[[a]] then [[b]] then [[a]] again';

    expect(extractWikiLinkLines(body)).toEqual(['- [[a]]', '- [[b]]']);
  });

  it('returns an empty array when there are no wikilinks', () => {
    expect(extractWikiLinkLines('Plain text only.')).toEqual([]);
  });

  it('preserves display and heading syntax verbatim', () => {
    const body = 'See [[path/to/note#heading|alias]] and [[other|Display]].';

    expect(extractWikiLinkLines(body)).toEqual([
      '- [[path/to/note#heading|alias]]',
      '- [[other|Display]]',
    ]);
  });

  it('ignores wikilinks inside inline code spans', () => {
    const body = '`kg_build`가 본문의 `[[wikilink]]`를 파싱하지 않음.';

    expect(extractWikiLinkLines(body)).toEqual([]);
  });

  it('ignores wikilinks inside fenced code blocks', () => {
    const body =
      '```markdown\n- [[path]] 형식의 wikilink\n```\n\nNo real links.';

    expect(extractWikiLinkLines(body)).toEqual([]);
  });

  it('keeps real wikilinks while dropping code-quoted examples', () => {
    const body = [
      'The parser skips `[[wikilink]]` examples.',
      '',
      '```',
      '[[path]] inside a fence',
      '```',
      '',
      'Real reference: [[people/lee-changhoon]].',
    ].join('\n');

    expect(extractWikiLinkLines(body)).toEqual(['- [[people/lee-changhoon]]']);
  });

  it('does not extract standard markdown links', () => {
    const body = '[standard](./path.md) but [[wiki-target]]';

    expect(extractWikiLinkLines(body)).toEqual(['- [[wiki-target]]']);
  });
});
