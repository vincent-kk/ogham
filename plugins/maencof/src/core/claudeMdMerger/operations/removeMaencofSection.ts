/**
 * @file removeMaencofSection.ts
 * @description 전달받은 정확한 지침 파일에서 maencof 섹션 제거.
 */
import { createResolvedInstructionSectionManager } from '@ogham/agent-artifacts/instructions';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../../constants/markers.js';

/**
 * @param filePath - 호출자가 이미 해석한 지침 파일의 절대 경로
 * @param options - 옵션
 * @returns 제거 성공 여부
 */
export function removeMaencofSection(
  filePath: string,
  options: { dryRun?: boolean } = {},
): boolean {
  const { dryRun = false } = options;
  const manager = createResolvedInstructionSectionManager({
    owner: 'maencof',
    targetPath: filePath,
    markers: {
      start: MAENCOF_START_MARKER,
      end: MAENCOF_END_MARKER,
    },
  });
  const plan = manager.plan({
    content: null,
    replaceDrift: false,
    backup: 'sibling',
  });
  if (plan.outcomes[0]?.action !== 'remove') return false;
  if (dryRun) return true;
  return manager.apply(plan).outcomes[0]?.action === 'remove';
}
