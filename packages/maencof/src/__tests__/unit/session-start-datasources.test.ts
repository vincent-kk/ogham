/**
 * @file session-start-datasources.test.ts
 * @description session-start hook의 data-sources.json 체크 테스트
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runSessionStart } from '../../hooks/session-start.js';

const CONNECT_MSG =
  '[maencof] No external data sources connected. Run `/maencof:connect` to set up.';

function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-ds-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

describe('session-start data-sources.json 체크', () => {
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

  it('data-sources.json 파일이 없으면 connect 안내 메시지를 출력한다', () => {
    const result = runSessionStart({ cwd: vaultDir });

    expect(result.message).toContain(CONNECT_MSG);
  });

  it('data-sources.json에 sources가 빈 배열이면 connect 안내 메시지를 출력한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'data-sources.json'),
      JSON.stringify({ sources: [], updatedAt: new Date().toISOString() }),
      'utf-8',
    );

    const result = runSessionStart({ cwd: vaultDir });

    expect(result.message).toContain(CONNECT_MSG);
  });

  it('data-sources.json에 sources가 있으면 connect 안내 메시지를 출력하지 않는다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'data-sources.json'),
      JSON.stringify({
        sources: [{ type: 'obsidian', path: '/vault' }],
        updatedAt: new Date().toISOString(),
      }),
      'utf-8',
    );

    const result = runSessionStart({ cwd: vaultDir });

    expect(result.message ?? '').not.toContain(CONNECT_MSG);
  });

  it('data-sources.json에 sources 키가 없으면 connect 안내 메시지를 출력한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'data-sources.json'),
      JSON.stringify({ updatedAt: new Date().toISOString() }),
      'utf-8',
    );

    const result = runSessionStart({ cwd: vaultDir });

    expect(result.message).toContain(CONNECT_MSG);
  });

  it('data-sources.json이 잘못된 JSON이면 connect 안내 메시지를 출력한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'data-sources.json'),
      'NOT_VALID_JSON',
      'utf-8',
    );

    const result = runSessionStart({ cwd: vaultDir });

    expect(result.message).toContain(CONNECT_MSG);
  });
});
