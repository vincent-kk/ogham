/**
 * @file mergeMaencofSection.ts
 * @description 전달받은 정확한 지침 파일의 maencof 섹션 삽입/업데이트.
 *
 * 마커: <!-- MAENCOF:START --> ... <!-- MAENCOF:END -->
 * - 마커 외부 기존 내용 보존
 * - 마커 내부만 업데이트
 * - 마커 없으면 파일 끝에 추가
 * - 수정 전 .bak 백업 생성
 *
 * 기존 raw filePath API를 공유 instruction manager에 연결하는 호환 래퍼.
 */
import { createResolvedInstructionSectionManager } from '@ogham/agent-artifacts';
import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../../constants/markers.js';
import type { MergeResult } from '../types/types.js';

/**
 * @param filePath - 호출자가 이미 해석한 지침 파일의 절대 경로
 * @param maencofContent - MAENCOF 마커 사이에 삽입할 내용 (마커 제외)
 * @param options - 옵션
 * @returns 머지 결과
 */
export function mergeMaencofSection(
  filePath: string,
  maencofContent: string,
  options: { dryRun?: boolean; createIfMissing?: boolean } = {},
): MergeResult {
  const { dryRun = false, createIfMissing = true } = options;
  const manager = createResolvedInstructionSectionManager({
    owner: 'maencof',
    targetPath: filePath,
    markers: {
      start: MAENCOF_START_MARKER,
      end: MAENCOF_END_MARKER,
    },
  });
  const inspection = manager.inspect();
  const currentContent = readUtf8FileIfExistsSync(filePath);
  const plan = manager.plan({
    content: maencofContent,
    replaceDrift: true,
    backup: 'sibling',
  });
  const plannedAction = plan.outcomes[0]?.action;
  const wouldChange =
    plannedAction === 'copy' ||
    plannedAction === 'update' ||
    plannedAction === 'relocate';
  const plannedContent =
    plan.previews[0]?.content ??
    currentContent ??
    [MAENCOF_START_MARKER, maencofContent.trim(), MAENCOF_END_MARKER].join(
      '\n',
    );

  if (!createIfMissing && currentContent === null)
    return {
      changed: false,
      hadExistingSection: false,
      content: plannedContent.endsWith('\n')
        ? plannedContent.slice(0, -1)
        : plannedContent,
    };

  if (dryRun)
    return {
      changed: wouldChange,
      hadExistingSection: inspection.status === 'present',
      content: plannedContent,
    };

  const applied = manager.apply(plan);
  const appliedAction = applied.outcomes[0]?.action;
  const changed =
    appliedAction === 'copy' ||
    appliedAction === 'update' ||
    appliedAction === 'relocate';
  const finalContent = changed
    ? plannedContent
    : (readUtf8FileIfExistsSync(filePath) ?? plannedContent);
  const backupPath = applied.backupPaths[0];

  return {
    changed,
    hadExistingSection: inspection.status === 'present',
    ...(backupPath === undefined ? {} : { backupPath }),
    content: finalContent,
  };
}
