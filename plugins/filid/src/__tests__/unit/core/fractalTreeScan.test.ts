import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  scanProject,
  shouldExclude,
} from '../../../core/tree/fractalTree/index.js';
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

    it('should apply a **/-prefixed pattern at any depth', () => {
      // The built-in list declares `**/scripts/**`, so a nested scripts/ is
      // already meant to be excluded — the prefix has to reach past the root.
      expect(shouldExclude('plugins/demo/scripts', {})).toBe(true);
      expect(shouldExclude('plugins/demo/scripts/build', {})).toBe(true);
      expect(shouldExclude('plugins/demo/node_modules/pkg', {})).toBe(true);
      expect(shouldExclude('plugins/demo/src', {})).toBe(false);
    });

    it('should keep a pattern without the **/ prefix anchored at the root', () => {
      const options = { exclude: ['only-root/**'] };

      expect(shouldExclude('only-root', options)).toBe(true);
      expect(shouldExclude('only-root/nested', options)).toBe(true);
      expect(shouldExclude('plugins/demo/only-root', options)).toBe(false);
    });

    it('should match a multi-segment pattern as a contiguous run', () => {
      const options = { exclude: ['**/src/generated/**'] };

      expect(shouldExclude('plugins/demo/src/generated', options)).toBe(true);
      expect(shouldExclude('plugins/demo/src/generated/api', options)).toBe(
        true,
      );
      expect(shouldExclude('plugins/demo/src', options)).toBe(false);
      expect(shouldExclude('plugins/demo/generated', options)).toBe(false);
    });

    it('should exclude config-supplied directory names at any depth', () => {
      const options = { additionalExcludedDirectories: ['skills'] };

      expect(shouldExclude('skills', options)).toBe(true);
      expect(shouldExclude('plugins/demo/skills', options)).toBe(true);
      expect(shouldExclude('plugins/demo/skills/craft', options)).toBe(true);
      expect(shouldExclude('plugins/demo/src', options)).toBe(false);
      expect(shouldExclude('plugins/demo/skills', {})).toBe(false);
    });

    it('should keep the built-in patterns when config names are supplied', () => {
      const options = { additionalExcludedDirectories: ['skills'] };

      expect(shouldExclude('node_modules', options)).toBe(true);
      expect(shouldExclude('.metadata', options)).toBe(true);
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
      // A module index makes `skills` a fractal on structure alone; the
      // config-supplied name overrides that, and the override must survive the
      // bottom-up correctNodeTypes pass too. Without the index there would be
      // nothing to override — an undeclared directory is already an organ.
      setup({
        '.': ['INTENT.md'],
        skills: ['index.ts'],
        'skills/preview': ['SKILL.md'],
        // The real shape a nested references/ takes in this repo.
        'skills/preview/references': [],
        'skills/preview/references/api': ['endpoints.md'],
        'leaf-refs': [],
      });

      try {
        const bare = await scanProject(tmpDir);
        expect(bare.nodes.get(join(tmpDir, 'skills'))!.type).toBe('fractal');
        // Markdown-only compartments declare no contract, so they need no
        // config entry to stay organ — a subdirectory does not promote them.
        expect(
          bare.nodes.get(join(tmpDir, 'skills', 'preview', 'references'))!.type,
        ).toBe('organ');
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

    it('should drop additionalExcludedDirectories names from the tree', async () => {
      setup({
        '.': ['INTENT.md'],
        src: ['index.ts'],
        'plugins/demo/skills/craft/scripts': ['probe.mjs'],
      });

      try {
        const bare = await scanProject(tmpDir);
        expect(bare.nodes.has(join(tmpDir, 'plugins', 'demo', 'skills'))).toBe(
          true,
        );

        const tree = await scanProject(tmpDir, {
          additionalExcludedDirectories: ['skills'],
        });
        expect(tree.nodes.has(join(tmpDir, 'plugins', 'demo', 'skills'))).toBe(
          false,
        );
        expect(
          tree.nodes.has(join(tmpDir, 'plugins', 'demo', 'skills', 'craft')),
        ).toBe(false);
        expect(tree.nodes.has(join(tmpDir, 'src'))).toBe(true);
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
