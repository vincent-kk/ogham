import { describe, expect, it } from 'vitest';

import {
  extractPathTokens,
  validateIntentMd,
} from '../../../core/rules/documentValidator/index.js';

const boundaries = [
  '## Boundaries',
  '### Always do',
  '- Test',
  '### Ask first',
  '- Review',
  '### Never do',
  '- Skip tests',
];

describe('derivable enumeration via validateIntentMd', () => {
  it('warns when one section lists three or more path tokens', () => {
    const content = [
      '# Module',
      '## Structure',
      '| Path | Role |',
      '| --- | --- |',
      '| `src/` | source |',
      '| `skills/` | workflows |',
      '| `hooks/` | mappings |',
      ...boundaries,
    ].join('\n');
    const result = validateIntentMd(content);
    expect(result.valid).toBe(true);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        rule: 'derivable-content',
        severity: 'warning',
        message: expect.stringContaining('Structure'),
      }),
    );
  });

  it('does not flag two path tokens in one section', () => {
    const content = [
      '# Module',
      '## Structure',
      '- `src/index.ts` is the entry; `src/core.ts` implements it.',
      ...boundaries,
    ].join('\n');
    const result = validateIntentMd(content);
    expect(
      result.violations.filter((v) => v.rule === 'derivable-content'),
    ).toHaveLength(0);
  });

  it('ignores path tokens inside fenced code blocks', () => {
    const content = [
      '# Module',
      '## Example',
      '```md',
      '- `a/` x',
      '- `b/` y',
      '- `c/` z',
      '```',
      ...boundaries,
    ].join('\n');
    const result = validateIntentMd(content);
    expect(
      result.violations.filter((v) => v.rule === 'derivable-content'),
    ).toHaveLength(0);
  });

  it('does not count globs or scoped package names as path tokens', () => {
    const content = [
      '# Module',
      '## Conventions',
      '- `**/src/hooks/**` and `packages/*` are globs; `@ogham/cross-platform` is a package.',
      ...boundaries,
    ].join('\n');
    const result = validateIntentMd(content);
    expect(
      result.violations.filter((v) => v.rule === 'derivable-content'),
    ).toHaveLength(0);
  });

  it('treats separator-bearing tokens the same in any ecosystem', () => {
    const content = [
      '# Module',
      '## Structure',
      '- `src/models.py`, `src/views.py` and `migrations/` do the work.',
      ...boundaries,
    ].join('\n');
    const result = validateIntentMd(content);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        rule: 'derivable-content',
        section: 'Structure',
      }),
    );
  });

  it('does not count bare filenames without a separator', () => {
    const content = [
      '# Module',
      '## Conventions',
      '- `version.ts`, `config.json`, `styles.css` and `main.py` are generated.',
      ...boundaries,
    ].join('\n');
    expect(
      validateIntentMd(content).violations.filter(
        (v) => v.rule === 'derivable-content',
      ),
    ).toHaveLength(0);
  });

  it('does not count scheme specifiers, placeholders, or spaced spans', () => {
    const content = [
      '# Module',
      '## Conventions',
      '- `node:fs/promises`, `https://example.com/a`, `plugins/<name>/INTENT.md` and `git diff a/b` are not paths.',
      ...boundaries,
    ].join('\n');
    expect(
      validateIntentMd(content).violations.filter(
        (v) => v.rule === 'derivable-content',
      ),
    ).toHaveLength(0);
  });

  it('collapses tokens that differ only by a trailing slash', () => {
    const content = [
      '# Module',
      '## Structure',
      '- `docs/a/` and `docs/a` and `utils/x.md` are two tokens.',
      ...boundaries,
    ].join('\n');
    expect(
      validateIntentMd(content).violations.filter(
        (v) => v.rule === 'derivable-content',
      ),
    ).toHaveLength(0);
  });

  it('keeps the directory-marked spelling whichever order the two appear in', () => {
    expect(extractPathTokens('`docs/a` then `docs/a/`.')).toEqual(['docs/a/']);
    expect(extractPathTokens('`docs/a/` then `docs/a`.')).toEqual(['docs/a/']);
  });

  it('labels the preamble section with an empty string', () => {
    const content = [
      '# Module',
      '`a/x.md`, `b/y.md`, `c/z.md`.',
      '## Purpose',
      'p',
      ...boundaries,
    ].join('\n');
    expect(validateIntentMd(content).violations).toContainEqual(
      expect.objectContaining({ rule: 'derivable-content', section: '' }),
    );
  });
});
