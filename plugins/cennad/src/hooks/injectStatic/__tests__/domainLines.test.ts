import { describe, expect, it } from 'vitest';

import type { Keywords } from '../../shared/configTypes.js';
import { domainLines } from '../utils/domainLines.js';

const KEYWORDS: Keywords = {
  codex: 'code, refactor',
  antigravity: 'research, search',
  claude: 'reasoning',
};

const ALL = ['codex', 'antigravity', 'claude'] as const;

describe('domainLines', () => {
  it('maps each electable provider to its owning skill with no suffix', () => {
    const lines = domainLines(
      KEYWORDS,
      ['codex', 'antigravity'],
      ALL,
      'claude',
    );
    expect(lines[0]).toBe('Domains with owners');
    expect(lines).toContain('- code, refactor → `/cennad:codex`');
    expect(lines).toContain('- research, search → `/cennad:antigravity`');
  });

  it("marks the host own provider as this session's model", () => {
    const lines = domainLines(
      KEYWORDS,
      ALL,
      ['codex', 'antigravity'],
      'claude',
    );
    expect(lines).toContain(
      "- reasoning → `/cennad:claude` (crosscheck only — this session's own model)",
    );
  });

  it('marks a setup-excluded provider differently from the host own', () => {
    const lines = domainLines(KEYWORDS, ALL, ['codex'], 'claude');
    expect(lines).toContain(
      '- research, search → `/cennad:antigravity` (crosscheck only — by setup)',
    );
    expect(lines).toContain(
      "- reasoning → `/cennad:claude` (crosscheck only — this session's own model)",
    );
  });

  it('adds the crosscheck owner only when two or more providers are active', () => {
    expect(
      domainLines(KEYWORDS, ['codex'], ['codex'], 'claude').join('\n'),
    ).not.toContain('crosscheck');
    expect(
      domainLines(KEYWORDS, ['codex', 'claude'], ['codex'], 'claude').join(
        '\n',
      ),
    ).toContain(
      '- a claim worth an independent second opinion → `/cennad:crosscheck`',
    );
  });

  it('falls back to the built-in domain when a keyword string is blank', () => {
    const lines = domainLines(
      { ...KEYWORDS, codex: '   ' },
      ['codex'],
      ['codex'],
      'claude',
    );
    expect(lines).toContain(
      '- heavy code, refactor, sandboxed shell → `/cennad:codex`',
    );
    expect(lines.join('\n')).not.toContain('(none)');
  });

  it('returns no section when no provider is active', () => {
    expect(domainLines(KEYWORDS, [], [], 'claude')).toEqual([]);
  });
});
