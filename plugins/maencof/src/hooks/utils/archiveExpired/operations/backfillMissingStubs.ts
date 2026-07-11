/**
 * @file backfillMissingStubs.ts
 * @description 역방향 백필 — archive에만 있고 원위치에 없는 04_Action 문서에 스텁을 소급 생성한다.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { normalize } from '@ogham/cross-platform/paths';

import { buildStubDocument } from '../utils/buildStubDocument.js';
import { listMarkdownFiles } from '../utils/listMarkdownFiles.js';
import { parseMinimalFrontmatter } from '../utils/parseMinimalFrontmatter.js';
import { pathExists } from '../utils/pathExists.js';

/**
 * `.maencof-meta/archive/04_Action/**` 를 순회하여 원위치 `04_Action/<path>` 가 없으면
 * 스텁을 소급 생성한다. 원위치가 이미 존재하면(live 또는 스텁) 건너뛴다(멱등, 덮어쓰기 없음).
 * 스텁 기능 도입 이전에 아카이빙된 백로그의 dangling inbound 링크를 복원한다.
 */
export async function backfillMissingStubs(
  currentWorkingDirectory: string,
  today: string,
): Promise<string[]> {
  const archiveActionRoot = join(
    currentWorkingDirectory,
    '.maencof-meta',
    'archive',
    '04_Action',
  );
  const backfilled: string[] = [];

  let archivedFiles: string[];
  try {
    archivedFiles = await listMarkdownFiles(archiveActionRoot);
  } catch {
    return backfilled; // archive/04_Action 없으면 no-op
  }

  for (const archiveAbsolutePath of archivedFiles)
    try {
      const relativePath = normalize(
        archiveAbsolutePath.slice(archiveActionRoot.length + 1),
      );
      const originalAbsolutePath = join(
        currentWorkingDirectory,
        '04_Action',
        relativePath,
      );
      if (await pathExists(originalAbsolutePath)) continue; // 이미 있음 — 멱등

      const content = await readFile(archiveAbsolutePath, 'utf-8');
      const { frontmatter, body } = parseMinimalFrontmatter(content);
      const archivePathForFrontmatter = `.maencof-meta/archive/04_Action/${relativePath}`;

      const stubDocument = buildStubDocument(
        frontmatter,
        body,
        archivePathForFrontmatter,
        today,
        originalAbsolutePath,
      );
      await mkdir(dirname(originalAbsolutePath), { recursive: true });
      await writeFile(originalAbsolutePath, stubDocument, 'utf-8');

      backfilled.push(`04_Action/${relativePath}`);
    } catch {
      continue; // 개별 실패는 다음으로
    }

  return backfilled;
}
