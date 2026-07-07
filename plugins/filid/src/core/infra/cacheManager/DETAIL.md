# cacheManager — Detail

## Requirements

세션/프롬프트/경계/프랙탈맵/런해시/가이드/모드감사 7종 캐시를 `~/.claude/plugins/filid/{cwdHash}/` 디렉토리에 파일로 저장한다.

## API Contracts

| 함수                  | 출처 파일          | 시그니처                                                                     |
| --------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `cwdHash`             | sessionCache       | `(cwd: string) => string`                                                    |
| `getCacheDir`         | sessionCache       | `(cwd: string) => string`                                                    |
| `sessionIdHash`       | sessionCache       | `(sessionId: string) => string`                                              |
| `isFirstInSession`    | sessionCache       | `(sessionId, cwd) => boolean`                                                |
| `markSessionInjected` | sessionCache       | `(sessionId, cwd) => void`                                                   |
| `pruneOldSessions`    | sessionCache       | `(cwd) => void`                                                              |
| `pruneStaleCacheDirs` | sessionCache       | `() => void`                                                                 |
| `removeSessionFiles`  | sessionCache       | `(sessionId, cwd) => void`                                                   |
| `getPluginRoot`       | sessionCache       | `() => string`                                                               |
| `isPruneDue`          | sessionCache       | `() => boolean`                                                              |
| `markPruneRun`        | sessionCache       | `() => void`                                                                 |
| `isSessionPruneDue`   | sessionCache       | `(cwd: string) => boolean`                                                   |
| `markSessionPruneRun` | sessionCache       | `(cwd: string) => void`                                                      |
| `readPromptContext`   | promptContextCache | `(cwd, sessionId) => string \| null`                                         |
| `writePromptContext`  | promptContextCache | `(cwd, context, sessionId) => void`                                          |
| `hasPromptContext`    | promptContextCache | `(sessionId, cwd) => boolean`                                                |
| `readBoundary`        | boundaryCache      | `(cwd, sessionId, dir) => string \| null`                                    |
| `writeBoundary`       | boundaryCache      | `(cwd, sessionId, dir, boundaryPath) => void`                                |
| `readFractalMap`      | fractalMapCache    | `(cwd, sessionId) => FractalMap`                                             |
| `writeFractalMap`     | fractalMapCache    | `(cwd, sessionId, map) => void` — 디스크본과 union-merge 후 tmp+rename 원자 교체 |
| `removeFractalMap`    | fractalMapCache    | `(cwd, sessionId) => void`                                                   |
| `saveRunHash`         | runHashCache       | `(cwd, skillName, hash) => void`                                             |
| `getLastRunHash`      | runHashCache       | `(cwd, skillName) => string \| null`                                         |
| `hasGuideInjected`    | guideCache         | `(sessionId, cwd) => boolean`                                                |
| `markGuideInjected`   | guideCache         | `(sessionId, cwd) => void`                                                   |
| `appendModeAudit`     | modeAuditCache     | `(cwd, entry: ModeAuditEntry) => void`                                       |
| `ModeAuditEntry`      | modeAuditCache     | (type) `{ timestamp, sessionId, tool, path, mode, decision, rule, reason? }` |

`appendModeAudit`는 spike 모드 게이트의 allow/deny/exempt 판정을 `{cacheDir}/mode-audit.jsonl`에 JSONL로 누적한다 (절대 throw하지 않음). `ModeAuditEntry`: `{ timestamp, sessionId, tool, path, mode: 'spike'|'normal', decision: 'allow'|'deny'|'exempt', rule, reason? }`.

`FractalMap`의 `reads`/`intents`/`details` 원소는 `{boundaryAbsPath}\t{relDir}` 복합 키다 — 모노레포에서 서로 다른 패키지의 동일 상대경로(`src` 등)가 충돌해 방문 판정이 오염되는 것을 막는다. 표시(`[filid:map]`)는 소비자(intentInjector)가 `\t` 뒤 상대경로만 추출해 사용한다. `writeFractalMap`은 병렬 훅 프로세스의 read-modify-write 유실을 막기 위해 유계 파일락(`{file}.lock` mkdir 뮤텍스, 100ms 상한·1s stale 강제 해제·타임아웃 시 lockless 강등) 안에서 디스크본을 재독해 key 단위 union-merge하고 `{file}.{pid}.tmp` → `rename` 원자 교체로 기록한다.

## Intentional Cross-Concern Coupling

`sessionCache.ts`의 `pruneOldSessions`와 `removeSessionFiles`는 다른 캐시 파일의 파일명 규약을 의도적으로 알고 있다 (`prompt-context-{hash}`, `guide-{hash}`, `boundary-{hash}`, `fmap-{hash}.json`). 이는 세션 정리 시 모든 연관 파일을 원자적으로 제거하기 위한 설계이며, 별도 추상화 없이 파일명을 직접 참조하는 것이 의도된 결합이다. 이 패턴을 변경하거나 추상화하려면 Ask-first 경계를 적용한다.

## Last Updated

2026-07-07
