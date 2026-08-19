/**
 * @file archiveExclusion.test.ts
 * @description 수용 기준 1·2 — 유효 frontmatter 문서를 99_Archive 에 두어도 그래프에
 * 진입하지 않고(R1·R2), 서고발 파싱 실패 노이즈가 0건이다(R1).
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fullBuild } from '../../mcp/tools/kgBuild/operations/fullBuild.js';
import type { NodeId } from '../../types/common.js';

let vaultRoot: string;

const VALID_DOC = `---
created: 2026-08-19
updated: 2026-08-19
tags: [newsletter]
layer: 3
---
# Stored newsletter
`;

const NO_FRONTMATTER_DOC = '# raw clipping without frontmatter\n';

async function addFile(relativePath: string, content: string): Promise<void> {
  const absolutePath = join(vaultRoot, relativePath);
  await mkdir(join(absolutePath, '..'), { recursive: true });
  await writeFile(absolutePath, content, 'utf-8');
}

beforeAll(async () => {
  vaultRoot = await mkdtemp(join(tmpdir(), 'maencof-archive-'));
  await addFile('03_External/topical/live.md', VALID_DOC);
  await addFile('99_Archive/valid-frontmatter.md', VALID_DOC);
  await addFile('99_Archive/broken.md', NO_FRONTMATTER_DOC);
});

afterAll(async () => {
  await rm(vaultRoot, { recursive: true, force: true });
});

describe('archive vault exclusion (R1·R2)', () => {
  it('유효 frontmatter 라도 99_Archive 문서는 그래프에 진입하지 않는다', async () => {
    const output = await fullBuild(vaultRoot);

    expect(
      output.graph.nodes.has('99_Archive/valid-frontmatter.md' as NodeId),
    ).toBe(false);
    expect(output.graph.nodes.has('03_External/topical/live.md' as NodeId)).toBe(
      true,
    );
  });

  it('99_Archive 발 파싱 실패 노이즈가 0건이다', async () => {
    const output = await fullBuild(vaultRoot);

    const archiveFailures = output.parseFailures.filter((f) =>
      f.path.startsWith('99_Archive/'),
    );
    expect(archiveFailures).toHaveLength(0);
  });
});
