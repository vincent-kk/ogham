import { describe, expect, it } from 'vitest';

import {
  KNOWN_ORGAN_DIR_NAMES,
  classifyNode,
  isInfraOrgDirectoryByPattern,
} from '../../../core/organ-classifier.js';

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
        'hasClaudeMd=true → fractal (deprecated field compat)',
        {
          dirName: 'auth',
          hasClaudeMd: true,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'fractal',
      ],
      [
        'hasSpecMd=true → fractal (deprecated field compat)',
        {
          dirName: 'auth',
          hasSpecMd: true,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'fractal',
      ],
    ])('deprecated field compat: %s', (_desc, input, expected) => {
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

    it.each([
      [
        'hasSideEffects=false → pure-function',
        {
          dirName: 'math-helpers',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
          hasSideEffects: false,
        },
        'pure-function',
      ],
      [
        'hasFractalChildren=true → fractal',
        {
          dirName: 'payments',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: true,
          isLeafDirectory: false,
          hasSideEffects: true,
        },
        'fractal',
      ],
      [
        'non-leaf + hasSideEffects=true → fractal',
        {
          dirName: 'checkout',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
          hasSideEffects: true,
        },
        'fractal',
      ],
      [
        'non-leaf + hasSideEffects=undefined → fractal (default)',
        {
          dirName: 'checkout',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
        },
        'fractal',
      ],
    ])('non-leaf: %s', (_desc, input, expected) => {
      expect(classifyNode(input)).toBe(expected);
    });

    it('should classify test infrastructure dirs as organ regardless of structure', () => {
      const testDirs = [
        '__tests__',
        '__mocks__',
        '__fixtures__',
        'test',
        'tests',
        'spec',
        'specs',
        'fixtures',
        'e2e',
      ];
      for (const dirName of testDirs) {
        expect(
          classifyNode({
            dirName,
            hasIntentMd: false,
            hasDetailMd: false,
            hasFractalChildren: false,
            isLeafDirectory: false,
          }),
        ).toBe('organ');
      }
    });

    it.each([
      [
        '__tests__+INTENT.md → fractal (explicit override)',
        {
          dirName: '__tests__',
          hasIntentMd: true,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
        },
        'fractal',
      ],
      [
        '__custom__ non-leaf → organ',
        {
          dirName: '__custom__',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
        },
        'organ',
      ],
      [
        '.claude+INTENT.md → fractal (explicit override)',
        {
          dirName: '.claude',
          hasIntentMd: true,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
        },
        'fractal',
      ],
    ])('infra-pattern INTENT.md override: %s', (_desc, input, expected) => {
      expect(classifyNode(input)).toBe(expected);
    });

    it('should classify dot-prefixed dirs as organ via pattern', () => {
      const dotDirs = ['.git', '.github', '.vscode', '.claude'];
      for (const dirName of dotDirs) {
        expect(
          classifyNode({
            dirName,
            hasIntentMd: false,
            hasDetailMd: false,
            hasFractalChildren: false,
            isLeafDirectory: false,
          }),
        ).toBe('organ');
      }
    });
  });

  describe('classifyNode — hasIndex rule', () => {
    it.each([
      [
        'non-organ name + hasIndex=true → fractal',
        {
          dirName: 'login',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
          hasIndex: true,
        },
        'fractal',
      ],
      [
        'known-organ name + hasIndex=true → organ (name wins)',
        {
          dirName: 'helpers',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
          hasIndex: true,
        },
        'organ',
      ],
      [
        'infra pattern __tests__ + hasIndex=true → organ (pattern wins)',
        {
          dirName: '__tests__',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
          hasIndex: true,
        },
        'organ',
      ],
      [
        'hasIndex=false + leaf → organ',
        {
          dirName: 'login',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
          hasIndex: false,
        },
        'organ',
      ],
      [
        'hasIndex=undefined + leaf → organ (fallback)',
        {
          dirName: 'login',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
        },
        'organ',
      ],
    ])('%s', (_desc, input, expected) => {
      expect(classifyNode(input)).toBe(expected);
    });
  });
});
