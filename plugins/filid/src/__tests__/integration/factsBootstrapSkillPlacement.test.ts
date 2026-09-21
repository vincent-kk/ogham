import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const skillsDir = join(packageRoot, 'skills');

/** Link text every target skill uses to reach the canonical bootstrap. */
const BOOTSTRAP_LINK = '../.shared/facts-bootstrap.md';

/** Each skill whose judgments read dependency references, with the text of its first such call. */
const TARGETS = [
  { skill: 'scan', firstCall: 'action: "scan"' },
  { skill: 'guide', firstCall: 'action: "scan"' },
  { skill: 'restructure', firstCall: 'action: "plan"' },
  { skill: 'cross-review', firstCall: 'action: "prepare"' },
  { skill: 'revalidate', firstCall: 'action: "checkpoint"' },
  { skill: 'pull-request', firstCall: 'action: "handoff"' },
] as const;

/**
 * Read one skill's entry document.
 * @param skill Skill directory name under `skills/`.
 * @returns The SKILL.md text.
 */
function readSkill(skill: string): string {
  return readFileSync(join(skillsDir, skill, 'SKILL.md'), 'utf8');
}

/**
 * List every file under a skill directory, dot-compartments included.
 * @param dir Absolute directory to walk.
 * @returns Absolute file paths.
 */
function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(join(dir, entry.name))
      : [join(dir, entry.name)],
  );
}

describe('each reference-reading skill points at the one bootstrap before it analyses', () => {
  it.each(TARGETS)(
    '$skill links the bootstrap before $firstCall',
    ({ skill, firstCall }) => {
      const text = readSkill(skill);
      const link = text.indexOf(`](${BOOTSTRAP_LINK})`);
      expect(link).toBeGreaterThan(-1);
      expect(text.indexOf(firstCall)).toBeGreaterThan(link);
    },
  );

  it('is linked from exactly the target skills', () => {
    const linking = readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(({ name }) => name)
      .filter((skill) => readSkill(skill).includes(BOOTSTRAP_LINK));
    expect(new Set(linking)).toEqual(
      new Set(TARGETS.map(({ skill }) => skill)),
    );
  });

  it('keeps the bootstrap steps in the canonical document alone', () => {
    const restating = listFiles(skillsDir)
      .filter((file) => !file.endsWith('facts-bootstrap.md'))
      .filter((file) => {
        const text = readFileSync(file, 'utf8');
        return (
          text.includes('filid-facts.mjs') || text.includes('action: "submit"')
        );
      });
    expect(restating).toEqual([]);
  });

  it('bootstraps pull-request after its document sync can add files', () => {
    const text = readSkill('pull-request');
    expect(text.indexOf(BOOTSTRAP_LINK)).toBeGreaterThan(
      text.indexOf('Skill("filid:enrich-docs"'),
    );
  });
});

describe('cross-review names the bootstrap as the only Bash call before prepare', () => {
  it('keeps the prohibition and states one exception', () => {
    const text = readSkill('cross-review');
    expect(text).toContain(
      'Run exactly these two `gh` commands; apart from the facts bootstrap in Step 0 and the base fallback below, make no other Bash call before prepare, and do not run git yourself.',
    );
    expect(text.match(/apart from/g)).toHaveLength(1);
    expect(text.indexOf(BOOTSTRAP_LINK)).toBeLessThan(
      text.indexOf('## Step 1 — Read the PR'),
    );
  });
});
