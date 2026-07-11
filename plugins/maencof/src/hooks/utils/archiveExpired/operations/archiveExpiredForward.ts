/**
 * @file archiveExpiredForward.ts
 * @description 정방향 아카이빙 — 04_Action 만료본을 archive로 이동하고 원위치에 스텁을 남긴다.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { normalize } from '@ogham/cross-platform/paths';

import { buildStubDocument } from '../utils/buildStubDocument.js';
import { listMarkdownFiles } from '../utils/listMarkdownFiles.js';
import { parseMinimalFrontmatter } from '../utils/parseMinimalFrontmatter.js';

/**
 * `04_Action/` 하위 만료 문서(`expires < today`)를 archive로 이동하고 원위치에 스텁을 남긴다.
 * 이동(rename) 후 스텁 write가 실패하면 원본을 되돌린다(롤백). 개별 실패는 skip.
 */
export async function archiveExpiredForward(
  currentWorkingDirectory: string,
  today: string,
): Promise<string[]> {
  const actionLayerRoot = join(currentWorkingDirectory, '04_Action');
  const archived: string[] = [];

  let markdownFiles: string[];
  try {
    markdownFiles = await listMarkdownFiles(actionLayerRoot);
  } catch {
    return archived; // 04_Action 없으면 no-op
  }

  for (const absolutePath of markdownFiles)
    try {
      const content = await readFile(absolutePath, 'utf-8');
      const { frontmatter, body } = parseMinimalFrontmatter(content);
      if (frontmatter.archived) continue; // 이미 스텁 — 멱등
      if (!frontmatter.expires || frontmatter.expires >= today) continue; // 미만료

      const relativePath = normalize(
        absolutePath.slice(actionLayerRoot.length + 1),
      );
      const archiveAbsolutePath = join(
        currentWorkingDirectory,
        '.maencof-meta',
        'archive',
        '04_Action',
        relativePath,
      );
      const archivePathForFrontmatter = `.maencof-meta/archive/04_Action/${relativePath}`;

      // ① 원본 → archive (이동)
      await mkdir(dirname(archiveAbsolutePath), { recursive: true });
      await rename(absolutePath, archiveAbsolutePath);

      // ② 스텁 생성 (실패 시 원본 롤백)
      try {
        const stubDocument = buildStubDocument(
          frontmatter,
          body,
          archivePathForFrontmatter,
          today,
          absolutePath,
        );
        await writeFile(absolutePath, stubDocument, 'utf-8');
      } catch (stubError) {
        await rename(archiveAbsolutePath, absolutePath).catch(() => {
          /* 롤백 실패는 무시 — 정본은 archive에 상존하므로 데이터 손실 없음 */
        });
        throw stubError;
      }

      archived.push(`04_Action/${relativePath}`);
    } catch {
      continue; // 개별 실패는 다음으로
    }

  return archived;
}
