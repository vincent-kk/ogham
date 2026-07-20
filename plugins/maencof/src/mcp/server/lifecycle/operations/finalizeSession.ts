/**
 * @file finalizeSession.ts
 * @description Detached `--finalize` 자식이 실행하는 종료 태스크 — bootSweep 완결 후 인덱스 재빌드 1회.
 *
 * 정상 부팅은 startServer 가 bootSweep 뒤에 vaultWalk → triggerBootRebuildIfStale 로
 * 실행 중 서버의 인메모리 캐시까지 갱신하지만, shutdown 의 detached `--finalize` 자식은
 * 서버가 없어 그 경로를 탈 수 없다. bootSweep 의 archiveExpired 가 L4 문서를 옮기면
 * 인덱스가 stale 로 남아 다음 부팅까지 방치되므로(read-only lens 가 표면화하는 지점),
 * 자식이 bootSweep 직후 handleKgBuild(증분)를 1회 돌려 최종 문서 상태를 인덱스에 반영한다.
 * handleKgBuild 는 스냅샷 diff 로 변경을 자체 감지하므로 stale 마킹·서버 캐시가 필요 없다.
 * bootSweep·handleKgBuild 둘 다 내부에서 실패를 흡수하므로 이 함수는 throw 하지 않는다.
 */
import { handleKgBuild } from '../../../tools/kgBuild/index.js';

import { bootSweep } from './bootSweep.js';

export async function finalizeSession(vaultPath: string): Promise<void> {
  await bootSweep(vaultPath);
  await handleKgBuild(vaultPath, {});
}
