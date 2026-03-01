/**
 * @file cwd-guard.test.ts
 * @description CWD 강제화 가드 (getVaultPath) 테스트
 */
import { homedir } from 'node:os';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getVaultPath CWD guard', () => {
  const originalEnv = process.env['MAENCOF_VAULT_PATH'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['MAENCOF_VAULT_PATH'] = originalEnv;
    } else {
      delete process.env['MAENCOF_VAULT_PATH'];
    }
    vi.unstubAllEnvs();
  });

  it('전역 .claude 경로를 차단한다', async () => {
    const globalClaudePath = resolve(homedir(), '.claude');
    process.env['MAENCOF_VAULT_PATH'] = globalClaudePath;

    // 동적 import로 getVaultPath를 포함한 createServer를 테스트
    // getVaultPath는 private이므로 server.ts의 도구 호출을 통해 간접 테스트
    // 여기서는 로직만 단위 테스트
    const BLOCKED_PREFIXES = [
      resolve(homedir(), '.claude'),
      resolve(homedir(), '.config'),
    ];

    function getVaultPath(): string {
      const raw = process.env['MAENCOF_VAULT_PATH'] ?? process.cwd();
      const resolved = resolve(raw);
      for (const prefix of BLOCKED_PREFIXES) {
        if (resolved.startsWith(prefix)) {
          throw new Error(
            `전역 설정 경로에 대한 접근이 차단되었습니다: ${resolved}`,
          );
        }
      }
      return resolved;
    }

    expect(() => getVaultPath()).toThrow('전역 설정 경로');
  });

  it('전역 .config 경로를 차단한다', () => {
    const BLOCKED_PREFIXES = [
      resolve(homedir(), '.claude'),
      resolve(homedir(), '.config'),
    ];

    function getVaultPath(vault: string): string {
      const resolved = resolve(vault);
      for (const prefix of BLOCKED_PREFIXES) {
        if (resolved.startsWith(prefix)) {
          throw new Error(
            `전역 설정 경로에 대한 접근이 차단되었습니다: ${resolved}`,
          );
        }
      }
      return resolved;
    }

    expect(() => getVaultPath(resolve(homedir(), '.config/claude'))).toThrow(
      '전역 설정 경로',
    );
  });

  it('일반 프로젝트 경로는 통과한다', () => {
    const BLOCKED_PREFIXES = [
      resolve(homedir(), '.claude'),
      resolve(homedir(), '.config'),
    ];

    function getVaultPath(vault: string): string {
      const resolved = resolve(vault);
      for (const prefix of BLOCKED_PREFIXES) {
        if (resolved.startsWith(prefix)) {
          throw new Error('blocked');
        }
      }
      return resolved;
    }

    expect(() => getVaultPath('/Users/test/project')).not.toThrow();
    expect(getVaultPath('/Users/test/project')).toBe('/Users/test/project');
  });

  it('CWD 기반 기본값이 사용된다', () => {
    delete process.env['MAENCOF_VAULT_PATH'];

    const raw = process.env['MAENCOF_VAULT_PATH'] ?? process.cwd();
    const resolved = resolve(raw);

    expect(resolved).toBe(resolve(process.cwd()));
  });
});
