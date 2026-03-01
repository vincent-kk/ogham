/**
 * @file mcp-claudemd-merge.test.ts
 * @description claudemd_merge MCP 도구 핸들러 단위 테스트
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../core/claude-md-merger.js';
import { handleClaudeMdMerge } from '../../mcp/tools/claudemd-merge.js';

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `maencof-claudemd-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

const SAMPLE_CONTENT = '# maencof\n\n- vault: /test';

describe('handleClaudeMdMerge', () => {
  it('CLAUDE.md가 없으면 새로 생성한다', () => {
    const result = handleClaudeMdMerge(testDir, { content: SAMPLE_CONTENT });

    expect(result.changed).toBe(true);
    expect(result.had_existing_section).toBe(false);
    expect(existsSync(join(testDir, 'CLAUDE.md'))).toBe(true);

    const content = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain(MAENCOF_START_MARKER);
    expect(content).toContain(MAENCOF_END_MARKER);
    expect(content).toContain('vault: /test');
  });

  it('기존 CLAUDE.md의 마커 외부 내용을 보존한다', () => {
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Project\n\nHello.\n', 'utf-8');

    handleClaudeMdMerge(testDir, { content: SAMPLE_CONTENT });

    const content = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('# Project');
    expect(content).toContain('Hello.');
    expect(content).toContain(MAENCOF_START_MARKER);
  });

  it('기존 maencof 섹션을 업데이트한다', () => {
    const existing = `# Project\n\n${MAENCOF_START_MARKER}\nold content\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(join(testDir, 'CLAUDE.md'), existing, 'utf-8');

    const result = handleClaudeMdMerge(testDir, { content: 'new content' });

    expect(result.changed).toBe(true);
    expect(result.had_existing_section).toBe(true);

    const content = readFileSync(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('new content');
    expect(content).not.toContain('old content');
  });

  it('dry_run=true이면 파일을 변경하지 않는다', () => {
    const result = handleClaudeMdMerge(testDir, {
      content: SAMPLE_CONTENT,
      dry_run: true,
    });

    expect(result.changed).toBe(true);
    expect(existsSync(join(testDir, 'CLAUDE.md'))).toBe(false);
  });

  it('section_content에 트리밍된 내용을 반환한다', () => {
    const result = handleClaudeMdMerge(testDir, {
      content: '  hello world  ',
    });

    expect(result.section_content).toBe('hello world');
  });
});
