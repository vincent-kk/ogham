import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  scanProject,
  shouldExclude,
} from '../../../core/tree/fractalTree/fractalTree.js';
import type { StructureAdapter } from '../../../types/adapters.js';

const arbitraryEntryAdapter: StructureAdapter = {
  id: 'arbitrary-entry',
  async detect() {
    return { confidence: 1, evidence: ['test fixture'] };
  },
  async discoverSourceFiles() {
    return [];
  },
  async findEntryPoints(directoryPath) {
    const path = join(directoryPath, 'module.entry');
    return existsSync(path)
      ? [
          {
            path,
            kind: 'module',
            adapterId: this.id,
            surface: 'enumerated',
          },
        ]
      : [];
  },
  async inspectEntryPoint(entryPointPath) {
    return {
      entryPoint: {
        path: entryPointPath,
        kind: 'module',
        adapterId: this.id,
        surface: 'enumerated',
      },
      exportedNames: [],
      hasDirectDeclarations: false,
      certainty: 'exact',
    };
  },
  async extractDependencies() {
    return [];
  },
  async isFrameworkOwnedPeer() {
    return false;
  },
  async suggestEntryPointPath(directoryPath) {
    return join(directoryPath, 'module.entry');
  },
};

describe('fractal-tree', () => {
  describe('shouldExclude', () => {
    it('should exclude node_modules paths', () => {
      expect(shouldExclude('node_modules', {})).toBe(true);
      expect(shouldExclude('node_modules/lodash', {})).toBe(true);
    });

    it('should exclude .git paths', () => {
      expect(shouldExclude('.git', {})).toBe(true);
    });

    it('should exclude dist paths', () => {
      expect(shouldExclude('dist', {})).toBe(true);
      expect(shouldExclude('dist/cjs', {})).toBe(true);
    });

    it('should not exclude regular source dirs', () => {
      expect(shouldExclude('src', {})).toBe(false);
      expect(shouldExclude('src/core', {})).toBe(false);
    });

    it('should respect custom exclude patterns', () => {
      expect(
        shouldExclude('custom-dir', { exclude: ['**/custom-dir/**'] }),
      ).toBe(true);
      expect(
        shouldExclude('other-dir', { exclude: ['**/custom-dir/**'] }),
      ).toBe(false);
    });
  });

  describe('scanProject', () => {
    let tmpDir: string;

    const setup = (structure: Record<string, string[]>) => {
      tmpDir = join(tmpdir(), `filid-test-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      for (const [dir, files] of Object.entries(structure)) {
        const absDir = join(tmpDir, dir);
        mkdirSync(absDir, { recursive: true });
        for (const file of files) writeFileSync(join(absDir, file), '');
      }
    };

    const teardown = () => {
      if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    };

    it('should build a tree from a real directory structure', async () => {
      setup({
        '.': ['INTENT.md', 'index.ts'],
        auth: ['INTENT.md', 'index.ts'],
        'auth/components': [],
      });

      try {
        const tree = await scanProject(tmpDir);

        expect(tree.root).toBe(tmpDir);
        expect(tree.nodes.size).toBeGreaterThan(0);
        expect(tree.totalNodes).toBeGreaterThan(0);
      } finally {
        teardown();
      }
    });

    it('should classify additionalOrganNames dirs as organ end-to-end', async () => {
      // A nesting content compartment defaults to fractal on structure alone;
      // the config-supplied name is what makes it an organ, and it must
      // survive the bottom-up correctNodeTypes pass too.
      setup({
        '.': ['INTENT.md'],
        skills: [],
        'skills/preview': ['SKILL.md'],
        // The real shape a nested references/ takes in this repo.
        'skills/preview/references': [],
        'skills/preview/references/api': ['endpoints.md'],
        'leaf-refs': [],
      });

      try {
        const bare = await scanProject(tmpDir);
        expect(bare.nodes.get(join(tmpDir, 'skills'))!.type).toBe('fractal');
        expect(
          bare.nodes.get(join(tmpDir, 'skills', 'preview', 'references'))!.type,
        ).toBe('fractal');
        // A leaf compartment needs no name entry — priority 6 covers it.
        expect(bare.nodes.get(join(tmpDir, 'leaf-refs'))!.type).toBe('organ');

        const tree = await scanProject(tmpDir, {
          additionalOrganNames: ['skills', 'references'],
        });
        expect(tree.nodes.get(join(tmpDir, 'skills'))!.type).toBe('organ');
        expect(
          tree.nodes.get(join(tmpDir, 'skills', 'preview', 'references'))!.type,
        ).toBe('organ');
      } finally {
        teardown();
      }
    });

    it('should detect INTENT.md and classify as fractal', async () => {
      setup({
        '.': ['INTENT.md'],
        auth: ['INTENT.md'],
      });

      try {
        const tree = await scanProject(tmpDir);
        const root = tree.nodes.get(tmpDir);

        expect(root).toBeDefined();
        expect(root!.hasIntentMd).toBe(true);
        expect(root!.type).toBe('fractal');
      } finally {
        teardown();
      }
    });

    it('should classify leaf dir without INTENT.md as organ', async () => {
      setup({
        '.': ['INTENT.md'],
        utils: ['helper.ts'],
      });

      try {
        const tree = await scanProject(tmpDir);
        const utils = tree.nodes.get(join(tmpDir, 'utils'));

        expect(utils).toBeDefined();
        expect(utils!.type).toBe('organ');
      } finally {
        teardown();
      }
    });

    it('uses adapter-reported entry points without assuming a filename', async () => {
      setup({
        '.': ['module.entry'],
      });

      try {
        const tree = await scanProject(tmpDir, {
          structureAdapters: [arbitraryEntryAdapter],
        });
        const root = tree.nodes.get(tmpDir);

        expect(root?.type).toBe('fractal');
        expect(root?.entryPoints).toEqual([
          expect.objectContaining({
            path: join(tmpDir, 'module.entry'),
            adapterId: 'arbitrary-entry',
          }),
        ]);
      } finally {
        teardown();
      }
    });

    it('should respect maxDepth option', async () => {
      setup({
        '.': ['INTENT.md'],
        level1: [],
        'level1/level2': [],
        'level1/level2/level3': [],
      });

      try {
        const tree = await scanProject(tmpDir, { maxDepth: 1 });

        // Should include root and level1, but not deeper
        expect(tree.nodes.has(join(tmpDir, 'level1/level2'))).toBe(false);
      } finally {
        teardown();
      }
    });

    it('should exclude node_modules by default', async () => {
      setup({
        '.': ['INTENT.md'],
        'node_modules/some-package': [],
      });

      try {
        const tree = await scanProject(tmpDir);

        const hasNodeModules = [...tree.nodes.keys()].some((k) =>
          k.includes('node_modules'),
        );
        expect(hasNodeModules).toBe(false);
      } finally {
        teardown();
      }
    });

    it('should return correct totalNodes and depth', async () => {
      setup({
        '.': ['INTENT.md'],
        auth: ['INTENT.md'],
        'auth/login': [],
      });

      try {
        const tree = await scanProject(tmpDir);

        expect(tree.totalNodes).toBeGreaterThan(0);
        expect(tree.depth).toBeGreaterThanOrEqual(0);
      } finally {
        teardown();
      }
    });
  });
});
