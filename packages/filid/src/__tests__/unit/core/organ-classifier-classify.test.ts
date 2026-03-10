import { describe, expect, it } from 'vitest';

import {
  classifyNode,
} from '../../../core/organ-classifier.js';

describe('organ-classifier — classifyNode (extended)', () => {
  describe('classifyNode', () => {
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
