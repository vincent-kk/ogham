/**
 * @file mcp-claudemd-read-remove.test.ts
 * @description claudemd_read, claudemd_remove MCP 도구 핸들러 단위 테스트
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../core/claude-md-merger.js';
import { handleClaudeMdRead } from '../../mcp/tools/claudemd-read.js';
import { handleClaudeMdRemove } from '../../mcp/tools/claudemd-remove.js';

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `maencof-claudemd-rr-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('handleClaudeMdRead', () => {
  it('CLAUDE.md가 없으면 file_exists=false를 반환한다', () => {
    const result = handleClaudeMdRead(testDir);

    expect(result.file_exists).toBe(false);
    expect(result.exists).toBe(false);
    expect(result.content).toBeNull();
  });

  it('CLAUDE.md는 있지만 maencof 섹션이 없으면 exists=false', () => {
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Project\n', 'utf-8');

    const result = handleClaudeMdRead(testDir);

    expect(result.file_exists).toBe(true);
    expect(result.exists).toBe(false);
    expect(result.content).toBeNull();
  });

  it('maencof 섹션이 있으면 내용을 반환한다', () => {
    const content = `# Project\n\n${MAENCOF_START_MARKER}\ntest content\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(join(testDir, 'CLAUDE.md'), content, 'utf-8');

    const result = handleClaudeMdRead(testDir);

    expect(result.file_exists).toBe(true);
    expect(result.exists).toBe(true);
    expect(result.content).toBe('test content');
  });
});

describe('handleClaudeMdRemove', () => {
  it('maencof 섹션이 없으면 removed=false를 반환한다', () => {
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Project\n', 'utf-8');

    const result = handleClaudeMdRemove(testDir, {});

    expect(result.removed).toBe(false);
  });

  it('CLAUDE.md가 없으면 removed=false를 반환한다', () => {
    const result = handleClaudeMdRemove(testDir, {});

    expect(result.removed).toBe(false);
  });

  it('maencof 섹션을 제거하고 나머지를 보존한다', () => {
    const content = `# Project\n\nSome text.\n\n${MAENCOF_START_MARKER}\nmaencof stuff\n${MAENCOF_END_MARKER}\n\nMore text.\n`;
    writeFileSync(join(testDir, 'CLAUDE.md'), content, 'utf-8');

    const result = handleClaudeMdRemove(testDir, {});

    expect(result.removed).toBe(true);
    expect(result.backup_path).toBeDefined();

    const remaining = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(remaining).toContain('# Project');
    expect(remaining).toContain('More text.');
    expect(remaining).not.toContain('maencof stuff');
  });

  it('dry_run=true이면 파일을 변경하지 않는다', () => {
    const content = `${MAENCOF_START_MARKER}\nstuff\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(join(testDir, 'CLAUDE.md'), content, 'utf-8');

    const result = handleClaudeMdRemove(testDir, { dry_run: true });

    expect(result.removed).toBe(true);
    const remaining = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(remaining).toContain('stuff');
  });
});
