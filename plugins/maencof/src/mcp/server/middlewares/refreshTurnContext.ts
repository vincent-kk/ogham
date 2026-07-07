/**
 * @file refreshTurnContext.ts
 * @description 인덱스 (재)빌드 성공 직후 훅 주입용 turn-context 스냅샷을 재빌드한다.
 *
 * invalidateCache()가 MCP read 경로를 새 그래프로 이끄는 것과 같은 원리로,
 * 매 턴 주입되는 <kg-core> 요약(노드 수·레이어 분포·L1 gist)도 자신이 요약하는
 * 디스크 인덱스를 따라간다.
 */
import { writeTurnContext } from '../../../core/cacheManager/index.js';
import { appendErrorLogSafe } from '../../../core/errorLog/index.js';
import { buildTurnContext } from '../../../core/turnContext/index.js';

/** Best-effort: 실패는 error-log로만 흘리고 빌드 흐름을 막지 않는다. */
export function refreshTurnContextSafe(vaultPath: string): void {
  try {
    writeTurnContext(vaultPath, buildTurnContext(vaultPath));
  } catch (err) {
    appendErrorLogSafe(vaultPath, {
      hook: 'refresh-turn-context',
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
