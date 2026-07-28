import { describe, expect, it } from 'vitest';

import {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
  isInfraOrgDirectoryByPattern,
} from '../../../core/tree/organClassifier/organClassifier.js';

describe('organ-classifier', () => {
  describe('isInfraOrgDirectoryByPattern', () => {
    it('should match double-underscore wrapped names', () => {
      expect(isInfraOrgDirectoryByPattern('__tests__')).toBe(true);
      expect(isInfraOrgDirectoryByPattern('__mocks__')).toBe(true);
      expect(isInfraOrgDirectoryByPattern('__fixtures__')).toBe(true);
      expect(isInfraOrgDirectoryByPattern('__custom__')).toBe(true);
    });

    it('should match dot-prefixed names', () => {
      expect(isInfraOrgDirectoryByPattern('.git')).toBe(true);
      expect(isInfraOrgDirectoryByPattern('.github')).toBe(true);
      expect(isInfraOrgDirectoryByPattern('.vscode')).toBe(true);
      expect(isInfraOrgDirectoryByPattern('.claude')).toBe(true);
    });

    it('should not match single-underscore or non-wrapped names', () => {
      expect(isInfraOrgDirectoryByPattern('_helpers_')).toBe(false);
      expect(isInfraOrgDirectoryByPattern('__')).toBe(false);
      expect(isInfraOrgDirectoryByPattern('tests')).toBe(false);
      expect(isInfraOrgDirectoryByPattern('auth')).toBe(false);
    });
  });

  describe('KNOWN_ORGAN_DIR_NAMES', () => {
    it('should include standard UI/shared organ directory names', () => {
      const expected = [
        'components',
        'utils',
        'types',
        'hooks',
        'helpers',
        'lib',
        'styles',
        'assets',
        'constants',
      ];
      for (const name of expected)
        expect(KNOWN_ORGAN_DIR_NAMES).toContain(name);
    });

    it('should include test infrastructure directory names not covered by pattern', () => {
      const nonPatternTestDirs = [
        'test',
        'tests',
        'spec',
        'specs',
        'fixtures',
        'e2e',
      ];
      for (const name of nonPatternTestDirs)
        expect(KNOWN_ORGAN_DIR_NAMES).toContain(name);
    });

    it('should not include __*__ names (covered by isInfraOrgDirectoryByPattern)', () => {
      expect(KNOWN_ORGAN_DIR_NAMES).not.toContain('__tests__');
      expect(KNOWN_ORGAN_DIR_NAMES).not.toContain('__mocks__');
      expect(KNOWN_ORGAN_DIR_NAMES).not.toContain('__fixtures__');
    });

    it('should stay small — repo-specific compartment names live in config', () => {
      // The open-ended set is not enumerable in a shipped constant;
      // `additional-organ-names` in .filid/config.json carries it instead.
      // `references` belongs here too: it is a docs-as-code convention, and
      // shipping it silently reclassifies a real src/references/ module as an
      // organ, muting the rules that would otherwise apply to it.
      for (const name of [
        'docs',
        'documents',
        'plan',
        'plans',
        'skills',
        'agents',
        'references',
      ])
        expect(KNOWN_ORGAN_DIR_NAMES).not.toContain(name);
    });
  });

  describe('classifyNode', () => {
    it.each([
      [
        'hasIntentMd=true → fractal',
        {
          dirName: 'auth',
          hasIntentMd: true,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'fractal',
      ],
      [
        'hasDetailMd=true → fractal',
        {
          dirName: 'auth',
          hasIntentMd: false,
          hasDetailMd: true,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'fractal',
      ],
      [
        'hasIntentMd overrides known-organ name → fractal',
        {
          dirName: 'utils',
          hasIntentMd: true,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'fractal',
      ],
      [
        'INTENT.md+DETAIL.md both present → fractal (INTENT.md priority)',
        {
          dirName: 'auth',
          hasIntentMd: true,
          hasDetailMd: true,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'fractal',
      ],
    ])('document flags: %s', (_desc, input, expected) => {
      expect(classifyNode(input)).toBe(expected);
    });

    it.each([
      [
        'known-organ name components → organ',
        {
          dirName: 'components',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'organ',
      ],
      [
        'known-organ name utils → organ',
        {
          dirName: 'utils',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'organ',
      ],
      [
        'non-standard name, leaf, no markers → organ',
        {
          dirName: 'my-custom-dir',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'organ',
      ],
    ])('leaf/no-markers: %s', (_desc, input, expected) => {
      expect(classifyNode(input)).toBe(expected);
    });

    it('a leaf compartment is an organ by structure, with no name match', () => {
      // Most references/ dirs are leaves, so dropping the built-in name
      // changes nothing for them — priority 6 already classifies them.
      expect(
        classifyNode({
          dirName: 'references',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
        }),
      ).toBe('organ');
    });

    it.each([['skills'], ['agents'], ['docs'], ['plans'], ['references']])(
      'additionalOrganNames makes %s an organ despite child directories',
      (dirName) => {
        // Repo-specific content compartments nest (skills/<name>/SKILL.md),
        // so the name match must beat the non-leaf structure fallback that
        // would otherwise default them to fractal.
        expect(
          classifyNode({
            dirName,
            hasIntentMd: false,
            hasDetailMd: false,
            hasFractalChildren: false,
            isLeafDirectory: false,
            additionalOrganNames: [dirName],
          }),
        ).toBe('organ');
      },
    );

    it('additionalOrganNames does not override a self-documenting directory', () => {
      // Priority 1 (INTENT.md → fractal) outranks every name-based match,
      // config-supplied ones included.
      expect(
        classifyNode({
          dirName: 'plans',
          hasIntentMd: true,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
          additionalOrganNames: ['plans'],
        }),
      ).toBe('fractal');
    });

    it('an unlisted name is unaffected by additionalOrganNames', () => {
      // The module index is what makes `payments` a fractal; listing an
      // unrelated name must not take that away. Without the index there would
      // be nothing to preserve — an undeclared directory is already an organ.
      expect(
        classifyNode({
          dirName: 'payments',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
          entryPoints: [
            {
              path: '/project/payments/index.ts',
              kind: 'module',
              adapterId: 'ecmascript',
              surface: 'enumerated',
            },
          ],
          additionalOrganNames: ['plans'],
        }),
      ).toBe('fractal');
    });
  });
});
