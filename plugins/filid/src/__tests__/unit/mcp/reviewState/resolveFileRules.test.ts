import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findRepositoryRulePaths } from '../../../../mcp/tools/reviewState/rules/findRepositoryRulePaths.js';
import { loadRepositoryRules } from '../../../../mcp/tools/reviewState/rules/loadRepositoryRules.js';
import { resolveFileRules } from '../../../../mcp/tools/reviewState/rules/resolveFileRules.js';

/** Ordered built-in rules used to prove always, match, and when selection. */
const BUILT_IN_RULES = [
  { id: 'default', always: true, file: 'default.md' },
  { id: 'tests', when: 'role:verification', file: 'tests.md' },
  { id: 'documents', when: 'role:document', file: 'documents.md' },
  { id: 'fca', when: 'owner', file: 'fca.md' },
  { id: 'ecmascript', match: ['**/*.ts'], file: 'lang/ecmascript.md' },
] as const;

describe('resolveFileRules', () => {
  it('selects always, matching, role, and owner rules in map order', () => {
    expect(
      resolveFileRules({
        file: {
          path: 'src/value.test.ts',
          role: 'verification',
          owner: 'src',
        },
        rules: BUILT_IN_RULES,
        overrides: [],
      }),
    ).toEqual(['default', 'tests', 'fca', 'ecmascript']);
  });

  it('adds matching overrides and removes only replaced built-ins', () => {
    expect(
      resolveFileRules({
        file: {
          path: 'src/value.test.ts',
          role: 'verification',
          owner: 'src',
        },
        rules: BUILT_IN_RULES,
        overrides: [
          {
            id: 'repository-typescript',
            match: ['**/*.ts'],
            file: 'review-rules/typescript.md',
            replaces: ['ecmascript'],
          },
        ],
      }),
    ).toEqual(['default', 'tests', 'fca', 'repository-typescript']);
  });
});

describe('repository rule paths', () => {
  it('finds the nearest CLAUDE and AGENTS files plus every root Claude rule', () => {
    /** Isolated tree for nearest-ancestor discovery. */
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-review-rules-'));

    try {
      mkdirSync(join(projectRoot, 'packages', 'app', 'src'), {
        recursive: true,
      });
      mkdirSync(join(projectRoot, '.claude', 'rules'), { recursive: true });
      writeFileSync(join(projectRoot, 'CLAUDE.md'), 'root claude', 'utf8');
      writeFileSync(join(projectRoot, 'AGENTS.md'), 'root agents', 'utf8');
      writeFileSync(
        join(projectRoot, 'packages', 'AGENTS.md'),
        'package agents',
        'utf8',
      );
      writeFileSync(
        join(projectRoot, 'packages', 'app', 'CLAUDE.md'),
        'app claude',
        'utf8',
      );
      writeFileSync(
        join(projectRoot, '.claude', 'rules', 'a.md'),
        'rule a',
        'utf8',
      );
      writeFileSync(
        join(projectRoot, '.claude', 'rules', 'b.md'),
        'rule b',
        'utf8',
      );
      writeFileSync(
        join(projectRoot, '.claude', 'rules', 'ignored.txt'),
        'ignored',
        'utf8',
      );

      /** Project-relative repository rule paths selected for the changed file. */
      const paths = findRepositoryRulePaths(
        projectRoot,
        'packages/app/src/value.ts',
      );

      expect(paths).toHaveLength(4);
      expect(paths).toEqual(
        expect.arrayContaining([
          'packages/app/CLAUDE.md',
          'packages/AGENTS.md',
          '.claude/rules/a.md',
          '.claude/rules/b.md',
        ]),
      );
      expect(paths).not.toContain('CLAUDE.md');
      expect(paths).not.toContain('AGENTS.md');
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('rejects an override file that resolves outside the project root', () => {
    /** Isolated project containing an escaping repository override. */
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-review-escape-'));

    try {
      mkdirSync(join(projectRoot, '.filid'));
      writeFileSync(
        join(projectRoot, '.filid', 'review-rules.json'),
        JSON.stringify({
          rules: [
            {
              id: 'escape',
              always: true,
              file: '../outside.md',
            },
          ],
        }),
        'utf8',
      );

      expect(() => loadRepositoryRules(projectRoot)).toThrow(
        /project root|escape/i,
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('discovers rules from the directory of a changed symlink', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-review-link-'));
    const externalRoot = mkdtempSync(join(tmpdir(), 'filid-review-target-'));

    try {
      mkdirSync(join(projectRoot, 'src'));
      writeFileSync(join(projectRoot, 'AGENTS.md'), 'root agents', 'utf8');
      writeFileSync(join(externalRoot, 'target.ts'), 'export {}', 'utf8');
      symlinkSync(
        join(externalRoot, 'target.ts'),
        join(projectRoot, 'src', 'linked.ts'),
      );

      expect(findRepositoryRulePaths(projectRoot, 'src/linked.ts')).toContain(
        'AGENTS.md',
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
      rmSync(externalRoot, { recursive: true, force: true });
    }
  });
});
