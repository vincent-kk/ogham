/**
 * @file readMaencofSection.ts
 * @description 전달받은 정확한 지침 파일에서 maencof 섹션만 읽기.
 */
import { createResolvedInstructionSectionManager } from '@ogham/agent-artifacts/instructions';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../../constants/markers.js';

/**
 * @param filePath - 호출자가 이미 해석한 지침 파일의 절대 경로
 * @returns maencof 섹션 내용 (마커 제외), 없으면 null
 */
export function readMaencofSection(filePath: string): string | null {
  const manager = createResolvedInstructionSectionManager({
    owner: 'maencof',
    targetPath: filePath,
    markers: {
      start: MAENCOF_START_MARKER,
      end: MAENCOF_END_MARKER,
    },
  });
  const inspection = manager.inspect();
  return inspection.status === 'present' ? inspection.sectionContent : null;
}
