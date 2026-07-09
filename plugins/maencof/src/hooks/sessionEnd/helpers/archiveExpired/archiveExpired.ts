/**
 * @file archiveExpired.ts
 * @description SessionEnd archiveExpired concern — L4 04_Action 아카이브 불변식을 집행한다.
 * 정방향(만료본 이동+스텁)과 역방향(누락 스텁 백필)을 순차 실행하며, 스캔·I/O 세부는
 * `operations/` organ에, 파싱·스텁 생성은 `utils/` organ에 위임한다.
 */
import { isMaencofVault } from '../../../shared/isMaencofVault.js';

import { archiveExpiredForward } from './operations/archiveExpiredForward.js';
import { backfillMissingStubs } from './operations/backfillMissingStubs.js';

/** archiveExpired concern 결과 */
export interface ArchiveExpiredResult {
  continue: boolean;
  /** 이번에 아카이빙된 문서의 vault 상대 경로 목록 */
  archived: string[];
  /** 스텁이 소급 복구된 문서의 vault 상대 경로 목록 */
  backfilled: string[];
}

/**
 * L4 `04_Action` 아카이브 불변식을 집행한다: archive에 정본이 있으면 원위치에 스텁(또는 live)이 있다.
 *
 * - 정방향: `04_Action/` 만료본(`expires < today`)을 archive로 이동하고 원위치에 스텁을 남긴다.
 * - 역방향: archive에만 있고 원위치에 없는 문서에 스텁을 소급 생성한다(고아 방지).
 * - 게이트: maencof vault가 아니면 no-op. 항상 `continue: true`.
 */
export async function runArchiveExpired(
  currentWorkingDirectory: string,
): Promise<ArchiveExpiredResult> {
  if (!isMaencofVault(currentWorkingDirectory))
    return { continue: true, archived: [], backfilled: [] };

  const today = new Date().toISOString().slice(0, 10);
  const archived = await archiveExpiredForward(currentWorkingDirectory, today);
  const backfilled = await backfillMissingStubs(currentWorkingDirectory, today);

  return { continue: true, archived, backfilled };
}
