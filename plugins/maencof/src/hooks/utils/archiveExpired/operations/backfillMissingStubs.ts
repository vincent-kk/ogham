/**
 * @file backfillMissingStubs.ts
 * @description 역방향 백필 — 서고(99_Archive/actions)·legacy archive에만 있고 원위치에 없는
 * 04_Action 문서에 스텁을 소급 생성한다.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { normalize } from '@ogham/cross-platform';

import { buildStubDocument } from '../utils/buildStubDocument.js';
import { listMarkdownFiles } from '../utils/listMarkdownFiles.js';
import { parseMinimalFrontmatter } from '../utils/parseMinimalFrontmatter.js';
import { pathExists } from '../utils/pathExists.js';

/**
 * 신규 루트 `99_Archive/actions/**` 를 먼저, legacy 루트 `.maencof-meta/archive/04_Action/**`
 * 를 이어서 순회하여 원위치 `04_Action/<path>` 가 없으면 스텁을 소급 생성한다. 스텁의
 * `archive_path` 는 정본이 실제로 있는 루트를 기록한다. 원위치가 이미 존재하면(live 또는
 * 스텁) 건너뛴다(멱등, 덮어쓰기 없음 — 같은 상대 경로가 양 루트에 있으면 신규 루트가 이긴다).
 */
export async function backfillMissingStubs(
  currentWorkingDirectory: string,
  today: string,
): Promise<string[]> {
  const archiveRoots = [
    {
      absoluteRoot: join(currentWorkingDirectory, '99_Archive', 'actions'),
      frontmatterPrefix: '99_Archive/actions',
    },
    {
      absoluteRoot: join(
        currentWorkingDirectory,
        '.maencof-meta',
        'archive',
        '04_Action',
      ),
      frontmatterPrefix: '.maencof-meta/archive/04_Action',
    },
  ];
  const backfilled: string[] = [];

  for (const { absoluteRoot, frontmatterPrefix } of archiveRoots) {
    let archivedFiles: string[];
    try {
      archivedFiles = await listMarkdownFiles(absoluteRoot);
    } catch {
      continue; // 해당 루트 부재 — 다음 루트로
    }

    for (const archiveAbsolutePath of archivedFiles)
      try {
        const relativePath = normalize(
          archiveAbsolutePath.slice(absoluteRoot.length + 1),
        );
        const originalAbsolutePath = join(
          currentWorkingDirectory,
          '04_Action',
          relativePath,
        );
        if (await pathExists(originalAbsolutePath)) continue; // 이미 있음 — 멱등

        const content = await readFile(archiveAbsolutePath, 'utf-8');
        const { frontmatter, body } = parseMinimalFrontmatter(content);
        const archivePathForFrontmatter = `${frontmatterPrefix}/${relativePath}`;

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
  }

  return backfilled;
}
