import { describe, expect, it } from 'vitest';

import {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
  isInfraOrgDirectoryByPattern,
} from '../../../core/tree/organ-classifier.js';

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
      for (const name of expected) {
        expect(KNOWN_ORGAN_DIR_NAMES).toContain(name);
      }
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
      for (const name of nonPatternTestDirs) {
        expect(KNOWN_ORGAN_DIR_NAMES).toContain(name);
      }
    });

    it('should not include __*__ names (covered by isInfraOrgDirectoryByPattern)', () => {
      expect(KNOWN_ORGAN_DIR_NAMES).not.toContain('__tests__');
      expect(KNOWN_ORGAN_DIR_NAMES).not.toContain('__mocks__');
      expect(KNOWN_ORGAN_DIR_NAMES).not.toContain('__fixtures__');
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
  });
});
