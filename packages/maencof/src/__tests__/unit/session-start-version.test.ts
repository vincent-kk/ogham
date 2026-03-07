/**
 * @file session-start-version.test.ts
 * @description session-start hook의 version.json 관리 및 마이그레이션 테스트
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
import { runSessionStart } from '../../hooks/session-start.js';
import { VERSION } from '../../version.js';

/** 테스트용 임시 vault 디렉토리 생성 */
function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-claudemd-init-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('session-start version.json 관리', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  });

  it('CLAUDE.md 초기화 시 version.json이 생성된다', () => {
    runSessionStart({ cwd: vaultDir });

    const versionPath = join(vaultDir, '.maencof-meta', 'version.json');
    expect(existsSync(versionPath)).toBe(true);

    const data = JSON.parse(readFileSync(versionPath, 'utf-8'));
    expect(data.version).toBe(VERSION);
    expect(data.installedAt).toBeTruthy();
    expect(data.migrationHistory).toEqual([]);
  });

  it('버전 불일치 시 CLAUDE.md가 업데이트되고 마이그레이션 이력이 기록된다', () => {
    // 구버전 version.json 설정
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'version.json'),
      JSON.stringify({
        version: '0.0.0-old',
        installedAt: '2025-01-01T00:00:00.000Z',
        migrationHistory: [],
      }),
      'utf-8',
    );
    // 구버전 CLAUDE.md 설정 (마커 있음)
    const oldContent = `# My Project\n\n${MAENCOF_START_MARKER}\nold directive\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(join(vaultDir, 'CLAUDE.md'), oldContent, 'utf-8');

    const result = runSessionStart({ cwd: vaultDir });

    // CLAUDE.md가 업데이트됨
    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('maencof Knowledge Space');
    expect(content).toContain('MUST use');
    expect(content).not.toContain('old directive');
    // 마커 외부는 보존
    expect(content).toContain('# My Project');

    // version.json이 업데이트됨
    const data = JSON.parse(
      readFileSync(join(vaultDir, '.maencof-meta', 'version.json'), 'utf-8'),
    );
    expect(data.version).toBe(VERSION);
    expect(data.migrationHistory).toContain('0.0.0-old -> ' + VERSION);
    expect(data.lastMigratedAt).toBeTruthy();

    // 업데이트 메시지 포함
    expect(result.message).toContain('updated');
  });

  it('동일 버전이면 CLAUDE.md를 건드리지 않는다 (idempotent)', () => {
    // 현재 버전 version.json
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'version.json'),
      JSON.stringify({
        version: VERSION,
        installedAt: new Date().toISOString(),
        migrationHistory: [],
      }),
      'utf-8',
    );
    const customContent = `${MAENCOF_START_MARKER}\ncustom content\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(join(vaultDir, 'CLAUDE.md'), customContent, 'utf-8');

    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('custom content');
    expect(content).not.toContain('maencof Knowledge Space');
  });

  it('Memory Routing 디렉티브가 포함된다', () => {
    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('## Memory Routing');
    expect(content).toContain('기억해줘');
    expect(content).toContain('기억해');
    expect(content).toContain('/maencof:remember');
    expect(content).toMatch(
      /FORBIDDEN.*built-in memory.*<remember>.*MEMORY\.md/s,
    );
  });

  it('mentioned_persons 안내 디렉티브가 포함된다', () => {
    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('mentioned_persons');
    expect(content).toContain('person_ref');
    expect(content).toContain('L3A-only');
  });

  it('Concept Document Lifecycle 디렉티브가 포함된다', () => {
    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('## Concept Document Lifecycle');
    expect(content).toContain('Layer 3C');
    expect(content).toContain('kg_search');
    expect(content).toContain('Do NOT auto-create');
  });

  it('스킬 테이블이 지시문에 포함된다', () => {
    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('## Skills');
    expect(content).toContain('/maencof:remember');
    expect(content).toContain('/maencof:recall');
    expect(content).toContain('/maencof:explore');
  });
});
