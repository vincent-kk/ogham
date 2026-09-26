import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

import { SHIPPED_SKILLS } from '../constants/budgets.js';
import {
  AUTO_AUTONOMOUS_SKILLS,
  AUTO_CONDITIONAL_ASK_SKILLS,
  DOCUMENT_WRITING_SKILLS,
  HIDDEN_USER_ONLY_SKILLS,
  VISIBLE_USER_STARTED_SKILLS,
  WORKFLOW_INVOCABLE_SKILLS,
} from '../constants/skillPolicy.js';
import { WORKFLOW_SKILLS } from '../constants/workflowChain.js';

/**
 * The invocation contract every skill must honour. A skill that can be
 * auto-invoked mid-work prefers autonomous judgment and reserves questions
 * for consequential unresolved choices; a
 * visible user-started skill stays outside workflow election without being
 * hidden from the model catalog; a hidden user-only gate uses
 * `disable-model-invocation: true`. Catalog visibility does not activate a
 * workflow or impose an execution sequence.
 */
const skillsDir = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'skills',
);

/**
 * The document-language sentence every document-writing skill carries
 * verbatim. Skill templates are English; without this clause a plan
 * written for a Korean session drifts into the template's language
 * heading by heading. Checked verbatim so the wording cannot fork across
 * the four files.
 */
const CANONICAL_DOCUMENT_LANGUAGE_CLAUSE =
  "Documents follow the session's response language; machine-read tokens, identifiers, paths, code, and commands stay verbatim.";

function readSkill(name: string): { frontmatter: string; body: string } {
  const text = readFileSync(portableJoin(skillsDir, name, 'SKILL.md'), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match === null) throw new Error(`${name}/SKILL.md has no frontmatter`);
  return { frontmatter: match[1], body: match[2] };
}

describe('skill invocation policy', () => {
  // filid:contract AC-skill-visibility
  it('classifies every shipped skill exactly once', () => {
    const partitioned = [
      ...AUTO_AUTONOMOUS_SKILLS,
      ...AUTO_CONDITIONAL_ASK_SKILLS,
      ...VISIBLE_USER_STARTED_SKILLS,
      ...HIDDEN_USER_ONLY_SKILLS,
    ].sort();
    expect(partitioned).toEqual([...SHIPPED_SKILLS]);
  });

  // WORKFLOW_SKILLS is a literal copy of the auto-invocable set — kept out
  // of skillPolicy.ts so hook bundles stay light. `satisfies` rejects a
  // stranger; this test is the completeness direction it cannot express.
  it('workflow chain membership mirrors the auto-invocable set', () => {
    expect([...WORKFLOW_SKILLS].sort()).toEqual(
      [...WORKFLOW_INVOCABLE_SKILLS].sort(),
    );
  });

  it('keeps the auto-invocable disciplines autonomous by default', () => {
    for (const name of AUTO_AUTONOMOUS_SKILLS) {
      const { frontmatter, body } = readSkill(name);
      expect(frontmatter).not.toContain('AskUserQuestion');
      expect(frontmatter).not.toContain('disable-model-invocation');
      // A complete line, not a substring — substring checks stay green
      // when an edit corrupts the YAML by merging adjacent lines.
      expect(frontmatter).toMatch(/^user-invocable: true$/m);
      expect(body).toMatch(/autonomous judgment/i);
      expect(body).toMatch(/routine checkpoint does not/i);
    }
  });

  it('keeps planning skills discoverable without a turn-scoped question ban', () => {
    for (const name of AUTO_CONDITIONAL_ASK_SKILLS) {
      const { frontmatter, body } = readSkill(name);
      expect(frontmatter).not.toContain('AskUserQuestion');
      expect(frontmatter).not.toContain('disable-model-invocation');
      expect(frontmatter).toMatch(/^user-invocable: true$/m);
      expect(body).toMatch(
        /ask only (?:when a|about) consequential(?: choice is unresolved| unresolved choices?)/i,
      );
    }
  });

  it('keeps user-started skills visible to the model', () => {
    for (const name of VISIBLE_USER_STARTED_SKILLS) {
      const { frontmatter } = readSkill(name);
      expect(frontmatter).not.toContain('disable-model-invocation');
      expect(frontmatter).toMatch(/^user-invocable: true$/m);
    }
  });

  it('keeps hidden user-only gates off the model', () => {
    for (const name of HIDDEN_USER_ONLY_SKILLS) {
      const { frontmatter } = readSkill(name);
      expect(frontmatter).toContain('disable-model-invocation: true');
    }
  });

  // filid:contract AC-check-expect-pair
  it('requires deterministic EXPECT markers before a plan can execute', () => {
    const writePlan = readSkill('write-plan').body;
    const reviewPlan = readSkill('review-plan').body;
    expect
      .soft(writePlan)
      .toContain(
        'CHECK tests the actual result condition and emits a fixed literal EXPECT marker only on success',
      );
    expect
      .soft(reviewPlan)
      .toContain(
        'CHECK tests the actual result condition and emits its literal EXPECT marker only on success',
      );
    expect
      .soft(reviewPlan)
      .toContain(
        'A command that only reports data needs an assertion before its success marker.',
      );
    expect
      .soft(reviewPlan)
      .toContain('A runnable gate without EXPECT is rework.');
  });

  // filid:contract AC-workflow-entry-validity
  it('keeps real workflow entry paths valid', () => {
    expect(readSkill('scaffold-pr').body).toContain(
      'Options alone are not a purpose.',
    );
    expect(readSkill('implement').body).toContain(
      "a new symbol's absence is the expected pre-change failure",
    );
    expect(readSkill('trace-cause').body).toContain(
      "Use the reported symptom's reproduction command",
    );
  });

  // filid:contract AC-planning-method-selection
  it('selects a planning method before falling back and preserves its shape', () => {
    const writePlan = readSkill('write-plan').body;
    const methodPrecedence = [
      'A planning method explicitly named by the user.',
      'Repository planning instructions or templates.',
      "Another planning skill selected under the host's skill-selection rules.",
      'The default method below.',
    ];
    let previous = -1;
    for (const source of methodPrecedence) {
      const current = writePlan.indexOf(source);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
    expect(writePlan).toContain(
      "Follow the selected method's native structure; do not merge it with the default method.",
    );
    expect(writePlan).toContain(
      'A skill is not selected merely because it is installed.',
    );
    expect(writePlan).toContain('Execution does not require a ledger.');
    expect(writePlan).toContain(
      'A structural decision chooses module boundaries, dependency direction, public ownership or contracts, or durable code placement.',
    );
    expect(writePlan).toContain(
      'When one occurs while planning, write `adr.md` beside the plan. Otherwise do not create it.',
    );
    expect(writePlan).toContain(
      'Make the ADR readable without the plan: state the context, decision, reasons, rejected alternatives, and consequences.',
    );

    const reviewPlan = readSkill('review-plan').body;
    expect(reviewPlan).toContain(
      'Review the plan against its selected planning method and the common invariants.',
    );
    expect(reviewPlan).toContain(
      'Apply the default method only when no other method was selected.',
    );
    expect(reviewPlan).toContain(
      "Do not impose the default method's structure on a selected method.",
    );
  });

  // filid:contract AC-document-language
  it('lists only shipped skills as document writers', () => {
    for (const name of DOCUMENT_WRITING_SKILLS)
      expect(SHIPPED_SKILLS).toContain(name);
  });

  it('makes every document-writing skill follow the session response language', () => {
    for (const name of DOCUMENT_WRITING_SKILLS)
      expect(readSkill(name).body).toContain(
        CANONICAL_DOCUMENT_LANGUAGE_CLAUSE,
      );
  });
});
