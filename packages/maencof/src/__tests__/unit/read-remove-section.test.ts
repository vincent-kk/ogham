/**
 * @file read-remove-section.test.ts
 * @description readMaencofSection, removeMaencofSection, ClaudeMdMerger 클래스 단위 테스트
 */
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ClaudeMdMerger,
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
  readMaencofSection,
  removeMaencofSection,
} from '../../core/claude-md-merger.js';

/** 테스트용 임시 디렉토리 */
let testDir: string;
let claudeMdPath: string;

beforeEach(() => {
  testDir = join(tmpdir(), `maencof-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  claudeMdPath = join(testDir, 'CLAUDE.md');
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

/** 테스트용 maencof 섹션 내용 */
const SAMPLE_MAENCOF_CONTENT = `# maencof Knowledge Space

## Active Configuration
- Knowledge Path: ./knowledge/
- Autonomy Level: 0`;

describe('readMaencofSection', () => {
  it('파일이 없으면 null을 반환해야 한다', () => {
    expect(readMaencofSection(claudeMdPath)).toBeNull();
  });

  it('마커가 없으면 null을 반환해야 한다', () => {
    writeFileSync(claudeMdPath, '# My Project\n', 'utf-8');
    expect(readMaencofSection(claudeMdPath)).toBeNull();
  });

  it('maencof 섹션 내용을 반환해야 한다', () => {
    const content = `# Project\n\n${MAENCOF_START_MARKER}\n${SAMPLE_MAENCOF_CONTENT}\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(claudeMdPath, content, 'utf-8');

    const section = readMaencofSection(claudeMdPath);
    expect(section).not.toBeNull();
    expect(section).toContain('Knowledge Path: ./knowledge/');
  });
});

describe('removeMaencofSection', () => {
  it('파일이 없으면 false를 반환해야 한다', () => {
    expect(removeMaencofSection(claudeMdPath)).toBe(false);
  });

  it('마커가 없으면 false를 반환해야 한다', () => {
    writeFileSync(claudeMdPath, '# My Project\n', 'utf-8');
    expect(removeMaencofSection(claudeMdPath)).toBe(false);
  });

  it('maencof 섹션을 제거하고 나머지 내용을 보존해야 한다', () => {
    const content = `# My Project\n\nSome content.\n\n${MAENCOF_START_MARKER}\n${SAMPLE_MAENCOF_CONTENT}\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(claudeMdPath, content, 'utf-8');

    const result = removeMaencofSection(claudeMdPath);
    expect(result).toBe(true);

    const newContent = readFileSync(claudeMdPath, 'utf-8');
    expect(newContent).toContain('# My Project');
    expect(newContent).toContain('Some content.');
    expect(newContent).not.toContain(MAENCOF_START_MARKER);
    expect(newContent).not.toContain(MAENCOF_END_MARKER);
  });
});

describe('ClaudeMdMerger 클래스', () => {
  it('merge/read/remove가 순서대로 동작해야 한다', () => {
    const merger = new ClaudeMdMerger(claudeMdPath);

    // 초기 상태
    expect(merger.hasSection()).toBe(false);
    expect(merger.read()).toBeNull();

    // 삽입
    const mergeResult = merger.merge(SAMPLE_MAENCOF_CONTENT);
    expect(mergeResult.changed).toBe(true);
    expect(merger.hasSection()).toBe(true);

    // 읽기
    const section = merger.read();
    expect(section).toContain('Knowledge Path: ./knowledge/');

    // 업데이트
    const updateResult = merger.merge('# Updated Section\n- New content');
    expect(updateResult.changed).toBe(true);
    expect(updateResult.hadExistingSection).toBe(true);
    expect(merger.read()).toContain('New content');

    // 제거
    const removed = merger.remove();
    expect(removed).toBe(true);
    expect(merger.hasSection()).toBe(false);
  });
});
