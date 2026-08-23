/**
 * @file hostConfigurationSkills.test.ts
 * @description Generated host configuration reference is the five canonical skills' shared source.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderHostConfigurationReference } from '../../core/hostConfigurationSurfaces/index.js';

const pluginRoot = fileURLToPath(new URL('../../../', import.meta.url));
const skillNames = [
  'instruct',
  'rule',
  'configure',
  'craft-agent',
  'changelog',
];
const sharedReferencePath = join(
  pluginRoot,
  'skills',
  '.shared',
  'host-configuration.md',
);

describe('canonical host configuration skill reference', () => {
  it('matches the registry renderer byte-for-byte', () => {
    expect(readFileSync(sharedReferencePath, 'utf8')).toBe(
      renderHostConfigurationReference(),
    );
  });

  it('is loaded explicitly by all five configuration skills', () => {
    for (const skillName of skillNames) {
      const skill = readFileSync(
        join(pluginRoot, 'skills', skillName, 'SKILL.md'),
        'utf8',
      );
      expect(skill, skillName).toContain('../.shared/host-configuration.md');
    }
  });
});
