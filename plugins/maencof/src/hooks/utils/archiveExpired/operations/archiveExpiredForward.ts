/**
 * @file archiveExpiredForward.ts
 * @description 정방향 아카이빙 — 04_Action 만료본을 서고(99_Archive/actions)로 이동하고 원위치에 스텁을 남긴다.
 */
import {
  link,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { normalize } from '@ogham/cross-platform';

import { buildStubDocument } from '../utils/buildStubDocument.js';
import { listMarkdownFiles } from '../utils/listMarkdownFiles.js';
import { parseMinimalFrontmatter } from '../utils/parseMinimalFrontmatter.js';
import { pathExists } from '../utils/pathExists.js';

/** 하드링크 미지원 파일시스템이 내는 코드 — rename 폴백으로 넘어간다. */
const LINK_UNSUPPORTED_CODES = new Set(['EXDEV', 'EPERM', 'ENOSYS', 'ENOTSUP']);

/**
 * `04_Action/` 하위 만료 문서(`expires < today`)를 서고 `99_Archive/actions/` 로 이동하고
 * 원위치에 스텁을 남긴다. 이동 후 스텁 write가 실패하면 원본을 되돌린다(롤백).
 * 개별 실패는 skip.
 *
 * 이동은 **덮어쓰지 않는 이동**이다 — 서고에 같은 경로가 이미 있으면 파괴 대신 skip 한다.
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
        '99_Archive',
        'actions',
        relativePath,
      );
      const archivePathForFrontmatter = `99_Archive/actions/${relativePath}`;

      // ① 원본 → archive (덮어쓰지 않는 이동)
      //
      //    rename(2)은 목적지를 말없이 덮어쓴다. 멱등 가드(37행)는 *읽기 시점*의 상태만
      //    보므로, 두 스윕이 같은 정본을 읽고 가드를 통과하면 뒤늦은 rename이 앞선 스윕이
      //    옮겨둔 정본을 스텁으로 덮어쓴다 (2026-08-19 실제 데이터 손실 — 5건 중 1건).
      //    link(2)는 목적지가 있으면 EEXIST로 *원자적* 실패하므로 그 창을 닫는다.
      //    최악의 결과가 '데이터 파괴'에서 '작업 누락'으로 내려앉는다.
      await mkdir(dirname(archiveAbsolutePath), { recursive: true });
      let movedByLink = false;
      try {
        await link(absolutePath, archiveAbsolutePath);
        movedByLink = true;
      } catch (linkError) {
        const errorCode = (linkError as NodeJS.ErrnoException).code;
        if (errorCode === 'EEXIST') continue; // 서고에 이미 정본 — 덮어쓰지 않는다
        if (!errorCode || !LINK_UNSUPPORTED_CODES.has(errorCode))
          throw linkError;
        // 하드링크 미지원 파일시스템 — 존재 확인 후 rename 폴백 (창은 좁아지되 남는다)
        if (await pathExists(archiveAbsolutePath)) continue;
        await rename(absolutePath, archiveAbsolutePath);
      }
      // link 성공분은 원본 링크를 끊어야 이동이 완성된다. unlink 실패 시 던져서 ②를
      // 건너뛴다 — 양쪽이 같은 inode인 채로 writeFile 하면 서고본까지 truncate 된다.
      if (movedByLink) await unlink(absolutePath);

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
