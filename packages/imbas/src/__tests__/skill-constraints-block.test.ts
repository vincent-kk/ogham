/**
 * @file skill-constraints-block.spec.ts
 * @description Verifies that every provider-partitioned SKILL.md contains the
 *   literal `<!-- imbas:constraints-v1 -->` anchor followed by a standard
 *   Workflow + Constraints block with a dispatch table routing jira, github,
 *   and local providers to their respective references/<provider>/workflow.md
 *   files. Covers 3 providers: jira, github, local.
 *
 *   Also asserts that the SKILL.md body (below the frontmatter) does not
 *   contain raw tracker tokens like `createJiraIssue`, `getJiraIssue`,
 *   `Atlassian`, `gh issue create`, `gh issue view`, `gh issue comment`,
 *   `gh issue close`, or `gh label create` — those must live inside
 *   references/<provider>/** only. The anchor block is exempt from this token
 *   check because it names `atlassian__*` / `gh issue *` as part of the
 *   Constraints directive.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..', '..');
const SKILLS_DIR = join(PKG_ROOT, 'skills');

/**
 * Pinned list of skills that were partitioned during the RALPLAN v2
 * local-provider cycle. Phase C1-C5. Keep in sync with
 * .metadata/imbas/specs/SPEC-skills.md.
 */
const PARTITIONED_SKILLS = [
  'manifest',
  'read-issue',
  'digest',
  'devplan',
] as const;

const ANCHOR_LITERAL = '<!-- imbas:constraints-v1 -->';

/**
 * Tokens that must not appear in SKILL.md body. They belong inside
 * references/<provider>/** only. Checked OUTSIDE the anchor block because
 * the anchor block itself references `atlassian__*` as a negative example.
 */
const FORBIDDEN_BODY_TOKENS = [
  'createJiraIssue',
  'getJiraIssue',
  'searchJiraIssuesUsingJql',
  'addCommentToJiraIssue',
  'transitionJiraIssue',
  'gh issue create',
  'gh issue view',
  'gh issue comment',
  'gh issue close',
  'gh label create',
] as const;

function readSkillMd(skill: string): string {
  const path = join(SKILLS_DIR, skill, 'SKILL.md');
  if (!existsSync(path)) {
    throw new Error(`SKILL.md not found for skill: ${skill}`);
  }
  return readFileSync(path, 'utf8');
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  return match ? content.slice(match[0].length) : content;
}

function extractConstraintsBlock(body: string): string | null {
  const idx = body.indexOf(ANCHOR_LITERAL);
  if (idx < 0) return null;
  return body.slice(idx);
}

function stripConstraintsBlock(body: string): string {
  const idx = body.indexOf(ANCHOR_LITERAL);
  return idx < 0 ? body : body.slice(0, idx);
}

describe('skill-constraints-block — provider dispatch anchor in partitioned SKILL.md', () => {
  it.each(PARTITIONED_SKILLS)(
    '%s SKILL.md contains the imbas:constraints-v1 anchor',
    (skill) => {
      const content = readSkillMd(skill);
      expect(content).toContain(ANCHOR_LITERAL);
    }
  );

  it.each(PARTITIONED_SKILLS)(
    '%s anchor block contains a provider dispatch table with jira and local rows',
    (skill) => {
      const content = readSkillMd(skill);
      const block = extractConstraintsBlock(content);
      expect(block, `no anchor block in ${skill}`).not.toBeNull();
      if (!block) return;
      // Dispatch table must mention both providers and their workflow paths.
      expect(block).toMatch(/`jira`/);
      expect(block).toMatch(/`local`/);
      expect(block).toMatch(/references\/jira\/workflow\.md/);
      expect(block).toMatch(/references\/local\/workflow\.md/);
    }
  );

  it.each(PARTITIONED_SKILLS)(
    '%s anchor block contains a provider dispatch table with github row',
    (skill) => {
      const content = readSkillMd(skill);
      const block = extractConstraintsBlock(content);
      expect(block, `no anchor block in ${skill}`).not.toBeNull();
      if (!block) return;
      // Dispatch table must mention github provider and its workflow path.
      expect(block).toMatch(/`github`/);
      expect(block).toMatch(/references\/github\/workflow\.md/);
    }
  );

  it.each(PARTITIONED_SKILLS)(
    '%s anchor block declares a Constraints section',
    (skill) => {
      const content = readSkillMd(skill);
      const block = extractConstraintsBlock(content);
      if (!block) throw new Error(`${skill}: missing anchor block`);
      expect(block).toMatch(/^## Constraints$/m);
    }
  );

  it.each(PARTITIONED_SKILLS)(
    '%s SKILL.md body (outside anchor block) has no raw tracker tool tokens',
    (skill) => {
      const content = readSkillMd(skill);
      const body = stripFrontmatter(content);
      const bodyOutsideAnchor = stripConstraintsBlock(body);
      for (const token of FORBIDDEN_BODY_TOKENS) {
        expect(
          bodyOutsideAnchor,
          `${skill}: SKILL.md body contains forbidden tracker token "${token}" outside the anchor block; move it into references/<provider>/**`
        ).not.toContain(token);
      }
    }
  );
});
