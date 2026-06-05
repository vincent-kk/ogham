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

const GUIDE_SCOPE = [
  'agents/qa-reviewer.md',
  'agents/engineering-architect.md',
  'agents/operations-sre.md',
  'skills/review/phases/phase-a-structure.md',
  'skills/review/phases/phase-c2-structure.md',
  'skills/review/templates.md',
  'src/constants/agentContext.ts',
];

const SCOPE = [
  'INTENT.md',
  'src/core/DETAIL.md',
  'src/core/rules/documentValidator/INTENT.md',
  'templates/hooks/README.md',
  'agents/qa-reviewer.md',
  'agents/engineering-architect.md',
  'agents/operations-sre.md',
  'agents/adjudicator.md',
];

const WHITELIST = ['agents/knowledge-manager.md', 'agents/context-manager.md'];

describe('docs-language: cap-rule expression hygiene', () => {
  it('forbids joint INTENT/DETAIL cap expression in cascade-source scope files', () => {
    for (const rel of SCOPE) {
      const path = resolve(repoRoot, rel);
      const content = readFileSync(path, 'utf-8');
      expect(content, `file=${rel}`).not.toMatch(FORBIDDEN_JOINT_CAP);
    }
  });

  it('whitelist references in knowledge-manager/context-manager are unaffected', () => {
    for (const rel of WHITELIST) {
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
    expect(hooksReadme).toMatch(/INTENT\.md\(50-line cap\)/);
    expect(hooksReadme).toMatch(/DETAIL\.md\(append-only\)/);
  });
});
