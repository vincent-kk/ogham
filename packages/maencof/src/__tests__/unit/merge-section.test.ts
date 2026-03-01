/**
 * @file merge-section.test.ts
 * @description mergeMaencofSection 함수 단위 테스트
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
  mergeMaencofSection,
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

describe('mergeMaencofSection — 파일 없음', () => {
  it('파일이 없으면 새로 생성해야 한다', () => {
    const result = mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);

    expect(result.changed).toBe(true);
    expect(result.hadExistingSection).toBe(false);
    expect(existsSync(claudeMdPath)).toBe(true);

    const content = readFileSync(claudeMdPath, 'utf-8');
    expect(content).toContain(MAENCOF_START_MARKER);
    expect(content).toContain(MAENCOF_END_MARKER);
    expect(content).toContain('Knowledge Path: ./knowledge/');
  });

  it('createIfMissing=false이면 파일을 생성하지 않아야 한다', () => {
    const result = mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT, {
      createIfMissing: false,
    });

    expect(result.changed).toBe(false);
    expect(existsSync(claudeMdPath)).toBe(false);
  });

  it('dryRun=true이면 파일을 실제로 생성하지 않아야 한다', () => {
    const result = mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT, {
      dryRun: true,
    });

    expect(result.changed).toBe(true);
    expect(existsSync(claudeMdPath)).toBe(false);
    expect(result.content).toContain(MAENCOF_START_MARKER);
  });
});

describe('mergeMaencofSection — 마커 없는 기존 파일', () => {
  const existingContent = '# My Project\n\nThis is my project CLAUDE.md.\n';

  beforeEach(() => {
    writeFileSync(claudeMdPath, existingContent, 'utf-8');
  });

  it('기존 내용을 보존하고 maencof 섹션을 끝에 추가해야 한다', () => {
    const result = mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);

    expect(result.changed).toBe(true);
    expect(result.hadExistingSection).toBe(false);

    const content = readFileSync(claudeMdPath, 'utf-8');
    expect(content).toContain('# My Project');
    expect(content).toContain('This is my project CLAUDE.md.');
    expect(content).toContain(MAENCOF_START_MARKER);
    expect(content).toContain(MAENCOF_END_MARKER);
    expect(content).toContain('Knowledge Path: ./knowledge/');
  });

  it('백업 파일(.bak)을 생성해야 한다', () => {
    mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);

    const backupPath = claudeMdPath + '.bak';
    expect(existsSync(backupPath)).toBe(true);

    const backupContent = readFileSync(backupPath, 'utf-8');
    expect(backupContent).toBe(existingContent);
  });

  it('maencof 섹션이 기존 내용 뒤에 위치해야 한다', () => {
    mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);

    const content = readFileSync(claudeMdPath, 'utf-8');
    const existingIdx = content.indexOf('# My Project');
    const markerIdx = content.indexOf(MAENCOF_START_MARKER);
    expect(existingIdx).toBeLessThan(markerIdx);
  });
});

describe('mergeMaencofSection — 기존 maencof 섹션 업데이트', () => {
  const oldMaencofContent = `# maencof Knowledge Space\n\n- Knowledge Path: ./old-knowledge/\n- Autonomy Level: 0`;
  const existingContent = `# My Project\n\nSome content.\n\n${MAENCOF_START_MARKER}\n${oldMaencofContent}\n${MAENCOF_END_MARKER}\n`;

  beforeEach(() => {
    writeFileSync(claudeMdPath, existingContent, 'utf-8');
  });

  it('기존 maencof 섹션을 새 내용으로 교체해야 한다', () => {
    const result = mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);

    expect(result.changed).toBe(true);
    expect(result.hadExistingSection).toBe(true);

    const content = readFileSync(claudeMdPath, 'utf-8');
    expect(content).toContain('Knowledge Path: ./knowledge/');
    expect(content).not.toContain('Knowledge Path: ./old-knowledge/');
  });

  it('마커 외부 기존 내용을 보존해야 한다', () => {
    mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);

    const content = readFileSync(claudeMdPath, 'utf-8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Some content.');
  });

  it('마커가 중복 생성되지 않아야 한다', () => {
    mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);

    const content = readFileSync(claudeMdPath, 'utf-8');
    const startCount = (
      content.match(
        new RegExp(MAENCOF_START_MARKER.replace(/[<>!-]/g, '\\$&'), 'g'),
      ) ?? []
    ).length;
    const endCount = (
      content.match(
        new RegExp(MAENCOF_END_MARKER.replace(/[<>!-]/g, '\\$&'), 'g'),
      ) ?? []
    ).length;
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);
  });

  it('내용이 동일하면 changed=false를 반환해야 한다', () => {
    // 먼저 한 번 머지
    mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);
    // 같은 내용으로 다시 머지
    const result = mergeMaencofSection(claudeMdPath, SAMPLE_MAENCOF_CONTENT);

    expect(result.changed).toBe(false);
  });
});
