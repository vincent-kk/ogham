import {
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REVIEW_CHANGE_CONTEXT_FILE_LIMIT } from '../../../../constants/reviewState.js';
import { readChangeContextFile } from '../../../../mcp/tools/reviewState/scope/readChangeContextFile.js';

/** Isolated directory containing change-context file fixtures. */
let testDirectory: string;

beforeEach(() => {
  testDirectory = mkdtempSync(join(tmpdir(), 'filid-change-context-'));
});

afterEach(() => {
  rmSync(testDirectory, { recursive: true, force: true });
});

describe('readChangeContextFile', () => {
  it('rejects a relative path', () => {
    expect(() => readChangeContextFile('pr-body.md')).toThrow(
      'changeContextPath must be an absolute path to a readable regular file',
    );
  });

  it('rejects a symlink at the final path', () => {
    const targetPath = join(testDirectory, 'target.md');
    const symlinkPath = join(testDirectory, 'symlink.md');
    writeFileSync(targetPath, '## Summary\nTarget body\n', 'utf8');
    symlinkSync(targetPath, symlinkPath);

    expect(() => readChangeContextFile(symlinkPath)).toThrow(
      'changeContextPath must be an absolute path to a readable regular file',
    );
  });

  it('rejects a regular file larger than the file limit', () => {
    const path = join(testDirectory, 'oversized.md');
    writeFileSync(path, 'x'.repeat(REVIEW_CHANGE_CONTEXT_FILE_LIMIT + 1), 'utf8');

    expect(() => readChangeContextFile(path)).toThrow(
      'changeContextPath file exceeds the change context file limit',
    );
  });

  it('reads a regular UTF-8 file within the file limit', () => {
    const path = join(testDirectory, 'pr-body.md');
    const body = '## Summary\nReadable body\n';
    writeFileSync(path, body, 'utf8');

    expect(readChangeContextFile(path)).toBe(body);
  });
});
