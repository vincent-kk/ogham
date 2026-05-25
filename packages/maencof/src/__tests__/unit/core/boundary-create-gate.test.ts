/**
 * @file boundary-create-gate.test.ts
 * @description handleBoundaryCreate frontmatter 게이트 회귀 방어.
 *
 * boundary_create는 입력이 정적으로 안전(layer:5 + sub_layer:'boundary' 하드코딩).
 * write-path 일관성을 위해 게이트를 통과시키며, 정적 안전 입력이 회귀로 거부되지 않음을 보증한다.
 */
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleBoundaryCreate } from '../../../mcp/tools/boundary-create/boundary-create.js';

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'boundary-create-gate-'));
}

describe('handleBoundaryCreate — validation gate', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('정적 안전 입력은 게이트를 통과하고 파일이 디스크에 기록된다', async () => {
    const result = await handleBoundaryCreate(vault, {
      title: 'Test Boundary',
      boundary_type: 'project_moc',
      connected_layers: [1, 3],
      tags: ['test'],
    });

    expect(result.success).toBe(true);
    expect(result.path).toMatch(/^05_Context\/boundary\//);
    await expect(access(join(vault, result.path))).resolves.toBeUndefined();

    const content = await readFile(join(vault, result.path), 'utf-8');
    expect(content).toContain('layer: 5');
    expect(content).toContain('sub_layer: boundary');
    expect(content).toContain('boundary_type: project_moc');
  });
});
