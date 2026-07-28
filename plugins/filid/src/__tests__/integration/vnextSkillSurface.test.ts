import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Skill-surface oracle, deliberately independent of `skills/`.
 *
 * `vnextToolSurface.test.ts` pins the nine tool names; nothing pinned the skill
 * set, so restoring the five merge-track skills left the product contract in
 * `DETAIL.md` claiming eight. This file closes that gap: the surface a document
 * asserts needs an oracle, or it drifts silently.
 */
const EXPECTED_SKILL_NAMES = [
  'setup',
  'scan',
  'context-query',
  'guide',
  'enrich-docs',
  'restructure',
  'migrate',
  'pull-request',
  'cross-review',
  'resolve',
  'revalidate',
  'pipeline',
] as const;

const REMOVED_SKILL_NAMES = [
  'ast-fallback',
  'config-wizard',
  'harvest',
  'promote',
  'structure-review',
  'sync',
  'update',
] as const;

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const skillsDir = join(packageRoot, 'skills');

/**
 * A directory under `skills/` whose name starts with `_` is a shared
 * compartment, not a skill — it ships no `SKILL.md` and is not user-invocable.
 * Everything else counts against the twelve.
 */
const COMPARTMENT_PREFIX = '_';

function skillsDirEntries(): string[] {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function shippedSkillNames(): string[] {
  return skillsDirEntries().filter(
    (name) => !name.startsWith(COMPARTMENT_PREFIX),
  );
}

function compartmentNames(): string[] {
  return skillsDirEntries().filter((name) =>
    name.startsWith(COMPARTMENT_PREFIX),
  );
}

describe('Filid 1.0 skill surface', () => {
  it('ships exactly the twelve independently specified skills', () => {
    const shipped = shippedSkillNames();

    expect(new Set(shipped)).toEqual(new Set(EXPECTED_SKILL_NAMES));
    expect(shipped).toHaveLength(EXPECTED_SKILL_NAMES.length);
    // Guard bites: the oracle is the count the product contract states.
    expect(EXPECTED_SKILL_NAMES).toHaveLength(12);
    expect(new Set(EXPECTED_SKILL_NAMES).size).toBe(12);
  });

  it('ships no skill removed by the 1.0 surface decision', () => {
    const shipped = new Set(shippedSkillNames());

    for (const name of REMOVED_SKILL_NAMES)
      expect(shipped.has(name)).toBe(false);
    // Guard bites: a name that is shipped must not pass the removed check.
    expect(shipped.has(EXPECTED_SKILL_NAMES[0])).toBe(true);
  });

  it('gives every shipped skill an entry document', () => {
    const missing = shippedSkillNames().filter(
      (name) => !readdirSync(join(skillsDir, name)).includes('SKILL.md'),
    );

    expect(missing).toEqual([]);
  });

  it('keeps shared compartments out of the skill surface', () => {
    const compartments = compartmentNames();

    // A compartment holds shared material, never a user-invocable entry point.
    for (const name of compartments)
      expect(readdirSync(join(skillsDir, name))).not.toContain('SKILL.md');

    // Guard bites: the filter must exclude by prefix, not by absence of
    // SKILL.md — otherwise a real skill that lost its entry document would be
    // silently reclassified as a compartment instead of failing the check above.
    for (const name of compartments)
      expect(name.startsWith(COMPARTMENT_PREFIX)).toBe(true);
    expect(
      shippedSkillNames().some((name) => compartments.includes(name)),
    ).toBe(false);
  });
});
