import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@ogham/cross-platform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ogham/cross-platform')>();
  return {
    ...actual,
    readUtf8FileIfExistsSync: vi.fn(actual.readUtf8FileIfExistsSync),
  };
});

import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import { findRepositoryRulePaths } from '../../../../mcp/tools/reviewState/rules/findRepositoryRulePaths.js';

describe('findRepositoryRulePaths I/O', () => {
  it('checks instruction-file existence without reading their bodies', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-rule-io-'));
    try {
      mkdirSync(join(projectRoot, 'src'));
      writeFileSync(join(projectRoot, 'CLAUDE.md'), '# instructions\n', 'utf8');

      expect(findRepositoryRulePaths(projectRoot, 'src/value.ts')).toContain(
        'CLAUDE.md',
      );
      expect(readUtf8FileIfExistsSync).not.toHaveBeenCalled();
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
