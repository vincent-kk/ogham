import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defaultPersonalContext } from '../defaultPersonalContext.js';
import { personalContextPath } from '../personalContextPath.js';
import { readPersonalContext } from '../readPersonalContext.js';
import { writePersonalContext } from '../writePersonalContext.js';

describe('readPersonalContext', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-personal-read-'));
    mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => rmSync(vaultDir, { recursive: true, force: true }));

  it('파일이 없으면 default를 반환하고 아무것도 만들지 않는다', () => {
    expect(readPersonalContext(vaultDir)).toEqual(defaultPersonalContext());
    expect(existsSync(personalContextPath(vaultDir))).toBe(false);
  });

  it('손상된 JSON은 default를 반환하고 원본을 .corrupt로 보존한다', () => {
    const path = personalContextPath(vaultDir);
    const corrupt = '{ "config": { "enabled": false }, <<<<<<< HEAD';
    writeFileSync(path, corrupt, 'utf-8');

    expect(readPersonalContext(vaultDir)).toEqual(defaultPersonalContext());
    expect(existsSync(path)).toBe(false); // 손상본이 후속 write에 덮이지 않도록 옆으로 치움
    expect(existsSync(`${path}.corrupt`)).toBe(true);
    expect(readFileSync(`${path}.corrupt`, 'utf-8')).toBe(corrupt); // 바이트 보존(복구 가능)
  });

  it('원자적 쓰기는 .tmp 산출물을 남기지 않고 왕복 동작한다', () => {
    const model = defaultPersonalContext();
    model.config.enabled = false;
    writePersonalContext(vaultDir, model);

    expect(existsSync(`${personalContextPath(vaultDir)}.tmp`)).toBe(false);
    expect(readPersonalContext(vaultDir).config.enabled).toBe(false);
  });
});
