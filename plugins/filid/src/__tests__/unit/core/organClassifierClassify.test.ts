import { describe, expect, it } from 'vitest';

import { classifyNode } from '../../../core/tree/organClassifier/index.js';

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
        'hasFractalChildren=true → organ (holding fractals is not a declaration)',
        {
          dirName: 'payments',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: true,
          isLeafDirectory: false,
          hasSideEffects: true,
        },
        'organ',
      ],
      [
        'non-leaf + hasSideEffects=true → organ',
        {
          dirName: 'checkout',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
          hasSideEffects: true,
        },
        'organ',
      ],
      [
        'non-leaf + hasSideEffects=undefined → organ (default)',
        {
          dirName: 'checkout',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
        },
        'organ',
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
      for (const dirName of testDirs)
        expect(
          classifyNode({
            dirName,
            hasIntentMd: false,
            hasDetailMd: false,
            hasFractalChildren: false,
            isLeafDirectory: false,
          }),
        ).toBe('organ');
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
      for (const dirName of dotDirs)
        expect(
          classifyNode({
            dirName,
            hasIntentMd: false,
            hasDetailMd: false,
            hasFractalChildren: false,
            isLeafDirectory: false,
          }),
        ).toBe('organ');
    });
  });

  describe('classifyNode — adapter entry-point rule', () => {
    const entryPoint = {
      path: '/project/login/module.entry',
      kind: 'module' as const,
      adapterId: 'arbitrary-entry',
      surface: 'enumerated' as const,
    };

    it.each([
      [
        'non-organ name + arbitrary entry point → fractal',
        {
          dirName: 'login',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
          entryPoints: [entryPoint],
        },
        'fractal',
      ],
      [
        'known-organ name + entry point → organ (name wins)',
        {
          dirName: 'helpers',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
          entryPoints: [entryPoint],
        },
        'organ',
      ],
      [
        'infra pattern __tests__ + entry point → organ (pattern wins)',
        {
          dirName: '__tests__',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
          entryPoints: [entryPoint],
        },
        'organ',
      ],
      [
        'empty entry point list + leaf → organ',
        {
          dirName: 'login',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: true,
          entryPoints: [],
        },
        'organ',
      ],
      [
        'entry points undefined + leaf → organ (fallback)',
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

  describe('classifyNode — describes, never prescribes', () => {
    const at = (kind: 'module' | 'executable' | 'framework') => ({
      path: `/project/skills/setup/entry.${kind}`,
      kind,
      adapterId: 'ecmascript',
      surface: 'enumerated' as const,
    });

    it.each([
      [
        'no document, no index, non-leaf → organ (never a default fractal)',
        {
          dirName: 'setup',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
        },
        'organ',
      ],
      [
        'executable entry only → organ (not a module index)',
        {
          dirName: 'setup',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
          entryPoints: [at('executable')],
        },
        'organ',
      ],
      [
        'framework entry only → organ (not a module index)',
        {
          dirName: 'setup',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
          entryPoints: [at('framework')],
        },
        'organ',
      ],
      [
        'module index → fractal (the one classifying signal)',
        {
          dirName: 'setup',
          hasIntentMd: false,
          hasDetailMd: false,
          hasFractalChildren: false,
          isLeafDirectory: false,
          entryPoints: [at('module')],
        },
        'fractal',
      ],
    ])('%s', (_desc, input, expected) => {
      expect(classifyNode(input)).toBe(expected);
    });
  });
});
