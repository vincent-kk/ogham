/**
 * @file pathContainment.test.ts
 * @description CRUD 핸들러 경로 봉쇄 회귀 테스트.
 *   vault 밖으로 향하는 traversal/절대 경로가 fs 부작용 없이 거부되는지 검증한다.
 *   sentinel 파일을 vault 밖에 두고, 유출(read)·덮어쓰기(update)·삭제(delete/move)가
 *   일어나지 않음을 확인한다.
 */
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleMaencofDelete } from '../../mcp/tools/maencofDelete/maencofDelete.js';
import { handleMaencofMove } from '../../mcp/tools/maencofMove/maencofMove.js';
import { handleMaencofRead } from '../../mcp/tools/maencofRead/maencofRead.js';
import { handleMaencofUpdate } from '../../mcp/tools/maencofUpdate/maencofUpdate.js';

const SECRET = 'TOP SECRET — must never leak or be destroyed';

describe('CRUD 경로 봉쇄 (directory traversal)', () => {
  let base: string;
  let vault: string;
  let secretPath: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'maencof-contain-'));
    vault = join(base, 'vault');
    await mkdir(vault, { recursive: true });
    secretPath = join(base, 'secret.md');
    await writeFile(secretPath, SECRET, 'utf-8');
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it('read: vault 밖 파일 내용을 유출하지 않는다', async () => {
    const result = await handleMaencofRead(vault, { path: '../secret.md' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('escapes vault root');
    expect(result.content).toBe('');
  });

  it('read: 절대 경로도 거부한다', async () => {
    const result = await handleMaencofRead(vault, { path: secretPath });
    expect(result.success).toBe(false);
    expect(result.content).toBe('');
  });

  it('update: vault 밖 파일을 덮어쓰지 않는다', async () => {
    const result = await handleMaencofUpdate(vault, {
      path: '../secret.md',
      content: 'HACKED',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('escapes vault root');
    expect(await readFile(secretPath, 'utf-8')).toBe(SECRET);
  });

  it('delete: vault 밖 파일을 삭제하지 않는다', async () => {
    const result = await handleMaencofDelete(vault, { path: '../secret.md' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('escapes vault root');
    await expect(access(secretPath)).resolves.toBeUndefined();
  });

  it('move: vault 밖 소스 파일을 삭제하지 않는다', async () => {
    const result = await handleMaencofMove(vault, {
      path: '../secret.md',
      target_layer: 2,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('escapes vault root');
    await expect(access(secretPath)).resolves.toBeUndefined();
  });
});
