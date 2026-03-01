/**
 * @file session-start-claudemd.test.ts
 * @description session-start hook의 CLAUDE.md 초기화 + version.json 기반 자동 갱신 테스트
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

describe('session-start CLAUDE.md 초기화', () => {
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

  it('vault에 CLAUDE.md가 없으면 maencof 섹션을 포함한 CLAUDE.md를 생성한다', () => {
    runSessionStart({ cwd: vaultDir });

    const claudeMd = join(vaultDir, 'CLAUDE.md');
    expect(existsSync(claudeMd)).toBe(true);

    const content = readFileSync(claudeMd, 'utf-8');
    expect(content).toContain(MAENCOF_START_MARKER);
    expect(content).toContain(MAENCOF_END_MARKER);
    expect(content).toContain('maencof Knowledge Space');
    expect(content).toContain('kg_suggest_links');
    expect(content).toContain('claudemd_merge');
  });

  it('MUST/FORBIDDEN 명령형 지시문이 포함된다', () => {
    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('## Required Rules (MUST)');
    expect(content).toContain('## Forbidden Rules (FORBIDDEN)');
    expect(content).toContain('MUST use `kg_search`');
    expect(content).toContain('MUST use `maencof_read`');
    expect(content).toContain('MUST use `maencof_create`');
    expect(content).toContain('FORBIDDEN:');
  });

  it('도구 매핑 테이블이 포함된다', () => {
    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('## Tool Mapping');
    expect(content).toContain('| Search vault documents |');
    expect(content).toContain('| Read vault documents |');
    expect(content).toContain('kg_search');
    expect(content).toContain('maencof_read');
  });

  it('기존 CLAUDE.md에 maencof 섹션이 없으면 추가한다', () => {
    writeFileSync(
      join(vaultDir, 'CLAUDE.md'),
      '# My Project\n\nExisting content.\n',
      'utf-8',
    );

    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Existing content.');
    expect(content).toContain(MAENCOF_START_MARKER);
    expect(content).toContain('maencof Knowledge Space');
  });

  it('이미 maencof 섹션이 있고 버전이 같으면 변경하지 않는다', () => {
    // version.json을 현재 버전으로 설정
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'version.json'),
      JSON.stringify({
        version: VERSION,
        installedAt: new Date().toISOString(),
        migrationHistory: [],
      }),
      'utf-8',
    );
    const existing = `# Project\n\n${MAENCOF_START_MARKER}\ncustom directive\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(join(vaultDir, 'CLAUDE.md'), existing, 'utf-8');

    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('custom directive');
    // 기본 지시문이 삽입되지 않아야 함
    expect(content).not.toContain('maencof Knowledge Space');
  });

  it('이미 maencof 섹션이 있지만 version.json이 없으면 version.json만 생성한다', () => {
    const existing = `# Project\n\n${MAENCOF_START_MARKER}\ncustom directive\n${MAENCOF_END_MARKER}\n`;
    writeFileSync(join(vaultDir, 'CLAUDE.md'), existing, 'utf-8');

    runSessionStart({ cwd: vaultDir });

    // CLAUDE.md는 변경되지 않음
    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('custom directive');
    expect(content).not.toContain('maencof Knowledge Space');

    // version.json이 생성됨
    const versionPath = join(vaultDir, '.maencof-meta', 'version.json');
    expect(existsSync(versionPath)).toBe(true);
    const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
    expect(versionData.version).toBe(VERSION);
  });

  it('vault가 아닌 경우 CLAUDE.md를 건드리지 않는다', () => {
    const nonVaultDir = join(tmpdir(), `non-vault-claudemd-${Date.now()}`);
    mkdirSync(nonVaultDir, { recursive: true });
    try {
      runSessionStart({ cwd: nonVaultDir });
      expect(existsSync(join(nonVaultDir, 'CLAUDE.md'))).toBe(false);
    } finally {
      rmSync(nonVaultDir, { recursive: true, force: true });
    }
  });

  it('companion identity가 있으면 지시문에 이름이 포함된다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      JSON.stringify({
        schema_version: 1,
        name: 'Mochi',
        greeting: '안녕!',
      }),
    );

    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('maencof Knowledge Space (Mochi)');
  });

  it('초기화 메시지가 반환된다', () => {
    const result = runSessionStart({ cwd: vaultDir });
    expect(result.message).toContain('CLAUDE.md');
    expect(result.message).toContain('initialized');
  });
});

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

  it('스킬 테이블이 지시문에 포함된다', () => {
    runSessionStart({ cwd: vaultDir });

    const content = readFileSync(join(vaultDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('## Skills');
    expect(content).toContain('/maencof:remember');
    expect(content).toContain('/maencof:recall');
    expect(content).toContain('/maencof:explore');
  });
});
