/**
 * @file archiveExpired.ts
 * @description SessionEnd archiveExpired concern — L4 만료 문서를 archive로 이동하고
 * 원위치에 경량 스텁을 남겨 그래프 연결을 유지한다(고아 방지). 스캔·이동·롤백만 담당하며
 * frontmatter 파싱·스텁 생성 등 세부 로직은 `utils/` organ에 위임한다.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { normalize } from '@ogham/cross-platform/paths';

import { isMaencofVault } from '../../../shared/isMaencofVault.js';

import { buildStubDocument } from './utils/buildStubDocument.js';
import { listMarkdownFiles } from './utils/listMarkdownFiles.js';
import { parseMinimalFrontmatter } from './utils/parseMinimalFrontmatter.js';

/** archiveExpired concern 결과 */
export interface ArchiveExpiredResult {
  continue: boolean;
  /** 아카이빙된 문서의 vault 상대 경로 목록 */
  archived: string[];
}

/**
 * L4 만료 문서를 스캔하여 archive로 이동하고, 원위치에 스텁을 남긴다.
 *
 * - 판정: `04_Action/` 하위 문서 중 `expires < today` 이며 아직 `archived`가 아닌 것.
 * - 원자성: 원본 이동(rename) 후 스텁 write가 실패하면 원본을 되돌린다(롤백).
 * - 견고성: 개별 문서 실패는 skip하고 다음으로 넘어가 세션 종료를 막지 않는다.
 */
export async function runArchiveExpired(
  currentWorkingDirectory: string,
): Promise<ArchiveExpiredResult> {
  if (!isMaencofVault(currentWorkingDirectory))
    return { continue: true, archived: [] };

  const today = new Date().toISOString().slice(0, 10);
  const actionLayerRoot = join(currentWorkingDirectory, '04_Action');
  const archived: string[] = [];

  let markdownFiles: string[];
  try {
    markdownFiles = await listMarkdownFiles(actionLayerRoot);
  } catch {
    return { continue: true, archived: [] }; // 04_Action 없으면 no-op
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

  return { continue: true, archived };
}
