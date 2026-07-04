/**
 * @file maencofMoveSubdirectory.test.ts
 * @description handleMaencofMove target_subdirectory 유닛 테스트 —
 *   서브디렉토리 배치, 레이어 내 재배치, traversal/깊이 거부, buffer 승격.
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

import { handleMaencofMove } from '../../mcp/tools/maencofMove/maencofMove.js';

const ACTION_NOTE = `---
created: 2026-07-01
updated: 2026-07-01
tags: [alpha, project]
layer: 4
---
# Alpha Note

Working note for project alpha.
`;

const BUFFER_FRAGMENT = `---
created: 2026-06-01
updated: 2026-06-01
tags: [spaced-repetition]
layer: 5
sub_layer: buffer
buffer_type: inbox
promotion_target: 3
---
# Fragment

Unclassified fragment awaiting triage.
`;

describe('move target_subdirectory', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-move-subdir-'));
    await mkdir(join(vault, '04_Action'), { recursive: true });
    await mkdir(join(vault, '05_Context/buffer'), { recursive: true });
    await writeFile(
      join(vault, '04_Action/alpha-note.md'),
      ACTION_NOTE,
      'utf-8',
    );
    await writeFile(
      join(vault, '05_Context/buffer/fragment.md'),
      BUFFER_FRAGMENT,
      'utf-8',
    );
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('레이어 전이 시 서브레이어 아래 서브디렉토리로 배치한다', async () => {
    const result = await handleMaencofMove(vault, {
      path: '04_Action/alpha-note.md',
      target_layer: 3,
      target_sub_layer: 'topical',
      target_subdirectory: 'projects',
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('03_External/topical/projects/alpha-note.md');
    const moved = await readFile(join(vault, result.path), 'utf-8');
    expect(moved).toContain('layer: 3');
    expect(moved).toContain('sub_layer: topical');
  });

  it('같은 레이어 내 서브디렉토리 재배치를 허용한다', async () => {
    const result = await handleMaencofMove(vault, {
      path: '04_Action/alpha-note.md',
      target_layer: 4,
      target_subdirectory: 'projects',
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('04_Action/projects/alpha-note.md');
    await expect(
      access(join(vault, '04_Action/projects/alpha-note.md')),
    ).resolves.toBeUndefined();
  });

  it('같은 레이어 + 서브레이어/서브디렉토리 미지정이면 여전히 거부한다', async () => {
    const result = await handleMaencofMove(vault, {
      path: '04_Action/alpha-note.md',
      target_layer: 4,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Already in Layer 4');
  });

  it('".." 세그먼트는 traversal로 거부하고 소스를 보존한다', async () => {
    const result = await handleMaencofMove(vault, {
      path: '04_Action/alpha-note.md',
      target_layer: 3,
      target_subdirectory: '../escape',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Path traversal detected');
    await expect(
      access(join(vault, '04_Action/alpha-note.md')),
    ).resolves.toBeUndefined();
  });

  it('깊이 제한(2)을 초과하면 거부한다', async () => {
    const result = await handleMaencofMove(vault, {
      path: '04_Action/alpha-note.md',
      target_layer: 3,
      target_subdirectory: 'a/b/c',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Subdirectory depth exceeds limit');
  });

  it('buffer 승격 시 서브디렉토리 배치와 buffer 필드 제거가 함께 동작한다', async () => {
    const result = await handleMaencofMove(vault, {
      path: '05_Context/buffer/fragment.md',
      target_layer: 3,
      target_sub_layer: 'topical',
      target_subdirectory: 'clips',
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe('03_External/topical/clips/fragment.md');
    const moved = await readFile(join(vault, result.path), 'utf-8');
    expect(moved).toContain('layer: 3');
    expect(moved).not.toContain('buffer_type');
    expect(moved).not.toContain('promotion_target');
  });
});
