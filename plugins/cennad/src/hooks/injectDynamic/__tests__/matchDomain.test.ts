import { describe, expect, it } from 'vitest';

import type { Keywords } from '../../shared/configTypes.js';
import { matchDomain } from '../utils/matchDomain.js';

const keywords = (overrides: Partial<Keywords> = {}): Keywords => ({
  codex: 'code, refactor',
  antigravity: 'research, search',
  claude: 'reasoning, review',
  ...overrides,
});

const ALL = ['codex', 'antigravity', 'claude'] as const;

describe('matchDomain', () => {
  it('matches an ASCII keyword on word boundaries only', () => {
    expect(matchDomain('fix the code', keywords(), ALL)).toEqual({
      provider: 'codex',
      keyword: 'code',
    });
    expect(matchDomain('decode the payload', keywords(), ALL)).toBeNull();
    expect(matchDomain('it is encoded', keywords(), ALL)).toBeNull();
  });

  it('treats punctuation as a boundary', () => {
    expect(matchDomain('(code)', keywords(), ALL)?.keyword).toBe('code');
    expect(matchDomain('code:', keywords(), ALL)?.keyword).toBe('code');
  });

  it('matches a Korean keyword as a substring, through attached particles', () => {
    const kw = keywords({ codex: '코드, 리팩터' });
    expect(matchDomain('코드를 고쳐줘', kw, ALL)).toEqual({
      provider: 'codex',
      keyword: '코드',
    });
    expect(matchDomain('코드리뷰 부탁해', kw, ALL)?.keyword).toBe('코드');
  });

  it('ignores case on both sides', () => {
    expect(matchDomain('REFACTOR this', keywords(), ALL)?.keyword).toBe(
      'refactor',
    );
  });

  it('never returns a provider outside the electable list', () => {
    // claude owns "review" but is not electable here
    const match = matchDomain('review this', keywords(), ['codex']);
    expect(match).toBeNull();
  });

  it('breaks provider ties by electable order', () => {
    const kw = keywords({ codex: 'review', claude: 'review' });
    expect(matchDomain('review this', kw, ['claude', 'codex'])?.provider).toBe(
      'claude',
    );
    expect(matchDomain('review this', kw, ['codex', 'claude'])?.provider).toBe(
      'codex',
    );
  });

  it('returns the first configured keyword when several of one provider match', () => {
    const kw = keywords({ codex: 'refactor, code' });
    expect(matchDomain('refactor the code', kw, ALL)?.keyword).toBe('refactor');
  });

  it('handles keywords that would be regex metacharacters', () => {
    const kw = keywords({ codex: 'c++, node(js), a.b' });
    expect(matchDomain('use C++ here', kw, ALL)?.keyword).toBe('c++');
    expect(matchDomain('run node(js)', kw, ALL)?.keyword).toBe('node(js)');
    // still boundary-checked: xc++ is not a match
    expect(matchDomain('xc++', kw, ALL)).toBeNull();
  });

  it('matches multi-word keywords', () => {
    const kw = keywords({ antigravity: 'large context' });
    expect(matchDomain('needs LARGE CONTEXT, please', kw, ALL)?.keyword).toBe(
      'large context',
    );
  });

  it('skips empty and whitespace-only keyword entries', () => {
    expect(matchDomain('anything at all', keywords({ codex: '' }), ALL)).toBe(
      null,
    );
    expect(
      matchDomain('anything at all', keywords({ codex: '  ,  ' }), ALL),
    ).toBeNull();
  });

  it('returns the keyword as the user wrote it, not folded', () => {
    const kw = keywords({ codex: 'Refactor' });
    expect(matchDomain('please refactor', kw, ALL)?.keyword).toBe('Refactor');
  });

  it('returns null for an empty electable list', () => {
    expect(matchDomain('fix the code', keywords(), [])).toBeNull();
  });
});
