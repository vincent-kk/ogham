import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../../..');

const FORBIDDEN_JOINT_CAP =
  /INTENT\.md\s*\/\s*DETAIL\.md[^()]{0,60}(?:50\s*(?:줄|line)|hard\s*limit|\bcap\b)/;

const FORBIDDEN_APPEND_ONLY_ONLY =
  /(?:append-only\s+(?:only|is\s+the\s+only|growth\s+is\s+the\s+only)|append-only가?\s*유일|only\s+restriction\s+(?:is|on)\s+(?:append-only|DETAIL))/i;

const INTENT_CAP_DESCRIPTION = /INTENT\.md at 50 lines or fewer/;
const DETAIL_APPEND_DESCRIPTION = /append-only DETAIL\.md/;

/** Canonical v7 cross-review Markdown that must remain English. */
const CROSS_REVIEW_ENGLISH_SCOPE = [
  'skills/cross-review/SKILL.md',
  'skills/cross-review/templates.md',
  'skills/cross-review/reviewers/reviewer.md',
  'skills/cross-review/reviewers/verifier.md',
  'skills/cross-review/rules/default.md',
  'skills/cross-review/rules/lang/ecmascript.md',
  'skills/cross-review/rules/lang/workflows.md',
  'skills/cross-review/rules/lang/manifests.md',
  'skills/cross-review/rules/lang/shell.md',
] as const;

/** Guide-like sources checked for obsolete cap-rule wording. */
const GUIDE_SCOPE = [
  ...CROSS_REVIEW_ENGLISH_SCOPE,
  'src/constants/hookContext.ts',
] as const;

/** Korean script ranges excluded from English-only documents. */
const KOREAN_SCRIPT = /[\u3131-\u318e\uac00-\ud7a3]/u;

const SCOPE = [
  'INTENT.md',
  'src/core/DETAIL.md',
  'src/core/rules/documentValidator/INTENT.md',
  'templates/hooks/README.md',
];

describe('docs-language: cap-rule expression hygiene', () => {
  it('keeps the v7 cross-review skill, rule, and brief documents in English', () => {
    for (const rel of CROSS_REVIEW_ENGLISH_SCOPE) {
      const path = resolve(repoRoot, rel);
      const content = readFileSync(path, 'utf-8');
      expect(content, `file=${rel}`).not.toMatch(KOREAN_SCRIPT);
    }
  });

  it('forbids joint INTENT/DETAIL cap expression in cascade-source scope files', () => {
    for (const rel of SCOPE) {
      const path = resolve(repoRoot, rel);
      const content = readFileSync(path, 'utf-8');
      expect(content, `file=${rel}`).not.toMatch(FORBIDDEN_JOINT_CAP);
    }
  });

  it('forbids "append-only only" framing in cap-rule guides (DETAIL.md rules are not solely append-only)', () => {
    for (const rel of GUIDE_SCOPE) {
      const path = resolve(repoRoot, rel);
      const content = readFileSync(path, 'utf-8');
      expect(content, `file=${rel}`).not.toMatch(FORBIDDEN_APPEND_ONLY_ONLY);
    }
  });

  it('cap-applies labels (intent yes, detail no) present in target docs', () => {
    const validator = readFileSync(
      resolve(repoRoot, 'src/core/rules/documentValidator/INTENT.md'),
      'utf-8',
    );
    expect(validator).toMatch(/INTENT\.md\(50줄 제한\)/);
    expect(validator).toMatch(/DETAIL\.md\(append-only/);

    const hooksReadme = readFileSync(
      resolve(repoRoot, 'templates/hooks/README.md'),
      'utf-8',
    );
    expect(hooksReadme).toMatch(INTENT_CAP_DESCRIPTION);
    expect(hooksReadme).toMatch(DETAIL_APPEND_DESCRIPTION);
  });
});
