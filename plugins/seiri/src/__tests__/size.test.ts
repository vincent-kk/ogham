import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform/compat';
import { describe, expect, it } from 'vitest';

import {
  RULE_MAX_LINES,
  SHIPPED_SKILLS,
  SKILL_MAX_BYTES,
} from '../constants/budgets.js';

/**
 * Guards on what seiri costs a session before anyone asks it for
 * anything. Reported as lists rather than counts so a failure names the
 * file that broke the budget.
 */
const packageRoot = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

describe('standing cost', () => {
  it('keeps every skill within its byte budget', () => {
    const skillsDir = portableJoin(packageRoot, 'skills');
    const oversized = readdirSync(skillsDir)
      .map((name) => ({
        name,
        bytes: statSync(portableJoin(skillsDir, name, 'SKILL.md')).size,
      }))
      .filter((skill) => skill.bytes > SKILL_MAX_BYTES);

    expect(oversized).toEqual([]);
  });

  it('ships exactly the declared skills', () => {
    const skills = readdirSync(portableJoin(packageRoot, 'skills')).sort();
    expect(skills).toEqual([...SHIPPED_SKILLS]);
  });

  it('keeps every rule document within its line budget', () => {
    const rulesDir = portableJoin(packageRoot, 'templates', 'rules');
    const oversized = readdirSync(rulesDir)
      .filter((name) => name.endsWith('.md'))
      .map((name) => ({
        name,
        lines: readFileSync(portableJoin(rulesDir, name), 'utf8').split('\n')
          .length,
      }))
      .filter((rule) => rule.lines > RULE_MAX_LINES);

    expect(oversized).toEqual([]);
  });
});
