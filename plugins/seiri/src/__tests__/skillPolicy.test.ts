import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform/compat';
import { describe, expect, it } from 'vitest';

import { SHIPPED_SKILLS } from '../constants/budgets.js';
import { WORKFLOW_CHAIN_LINE } from '../constants/intervention.js';
import {
  AUTO_CONDITIONAL_ASK_SKILLS,
  AUTO_INVOCABLE_SKILLS,
  AUTO_NO_ASK_SKILLS,
  USER_GATED_SKILLS,
} from '../constants/skillPolicy.js';

/**
 * The invocation contract every skill's frontmatter must honour. A skill
 * that can be auto-invoked mid-work must not interrupt with a question
 * (`disallowed-tools: AskUserQuestion`); a user-only gate must be off the
 * model's reach (`disable-model-invocation: true`); write-plan is the one
 * auto skill allowed to ask when a change's blast radius is large. Nothing
 * outside this file keeps those facts true, so a dropped frontmatter line
 * or a new skill added with the wrong posture would otherwise pass silently.
 */
const skillsDir = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'skills',
);

function readSkill(name: string): { frontmatter: string; body: string } {
  const text = readFileSync(portableJoin(skillsDir, name, 'SKILL.md'), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match === null) throw new Error(`${name}/SKILL.md has no frontmatter`);
  return { frontmatter: match[1], body: match[2] };
}

describe('skill invocation policy', () => {
  it('classifies every shipped skill exactly once', () => {
    const partitioned = [
      ...AUTO_NO_ASK_SKILLS,
      ...AUTO_CONDITIONAL_ASK_SKILLS,
      ...USER_GATED_SKILLS,
    ].sort();
    expect(partitioned).toEqual([...SHIPPED_SKILLS]);
  });

  it('blocks questions in the auto-invocable disciplines', () => {
    for (const name of AUTO_NO_ASK_SKILLS) {
      const { frontmatter, body } = readSkill(name);
      expect(frontmatter).toContain('disallowed-tools: AskUserQuestion');
      expect(frontmatter).not.toContain('disable-model-invocation');
      // Canonical clause — dropping "the user" is the drift this catches.
      expect(body).toContain('Do not ask the user questions.');
    }
  });

  it('lets the conditional-ask planner be invoked and ask', () => {
    for (const name of AUTO_CONDITIONAL_ASK_SKILLS) {
      const { frontmatter } = readSkill(name);
      expect(frontmatter).not.toContain('disallowed-tools: AskUserQuestion');
      expect(frontmatter).not.toContain('disable-model-invocation');
    }
  });

  it('keeps the user-gated skills off the model', () => {
    for (const name of USER_GATED_SKILLS) {
      const { frontmatter } = readSkill(name);
      expect(frontmatter).toContain('disable-model-invocation: true');
    }
  });

  it('names every auto skill in the workflow chain, and no gate', () => {
    for (const name of AUTO_INVOCABLE_SKILLS)
      expect(WORKFLOW_CHAIN_LINE).toContain(name);
    for (const name of USER_GATED_SKILLS)
      expect(WORKFLOW_CHAIN_LINE).not.toContain(name);
  });
});
