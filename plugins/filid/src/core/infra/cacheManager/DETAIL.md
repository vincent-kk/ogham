# cacheManager — Detail

## Requirements

세션/프롬프트/경계/프랙탈맵/런해시/가이드/모드감사 7종 캐시를 `~/.claude/plugins/filid/{cwdHash}/` 디렉토리에 파일로 저장한다.

## API Contracts

| 함수                  | 출처 파일          | 시그니처                                      |
| --------------------- | ------------------ | --------------------------------------------- |
| `cwdHash`             | sessionCache       | `(cwd: string) => string`                     |
| `getCacheDir`         | sessionCache       | `(cwd: string) => string`                     |
| `sessionIdHash`       | sessionCache       | `(sessionId: string) => string`               |
| `isFirstInSession`    | sessionCache       | `(sessionId, cwd) => boolean`                 |
| `markSessionInjected` | sessionCache       | `(sessionId, cwd) => void`                    |
| `pruneOldSessions`    | sessionCache       | `(cwd) => void`                               |
| `pruneStaleCacheDirs` | sessionCache       | `() => void`                                  |
| `removeSessionFiles`  | sessionCache       | `(sessionId, cwd) => void`                    |
| `getPluginRoot`       | sessionCache       | `() => string`                                |
| `isPruneDue`          | sessionCache       | `() => boolean`                               |
| `markPruneRun`        | sessionCache       | `() => void`                                  |
| `isSessionPruneDue`   | sessionCache       | `(cwd: string) => boolean`                    |
| `markSessionPruneRun` | sessionCache       | `(cwd: string) => void`                       |
| `readPromptContext`   | promptContextCache | `(cwd, sessionId) => string \| null`          |
| `writePromptContext`  | promptContextCache | `(cwd, context, sessionId) => void`           |
| `hasPromptContext`    | promptContextCache | `(sessionId, cwd) => boolean`                 |
| `readBoundary`        | boundaryCache      | `(cwd, sessionId, dir) => string \| null`     |
| `writeBoundary`       | boundaryCache      | `(cwd, sessionId, dir, boundaryPath) => void` |
| `readFractalMap`      | fractalMapCache    | `(cwd, sessionId) => FractalMap`              |
| `writeFractalMap`     | fractalMapCache    | `(cwd, sessionId, map) => void`               |
| `removeFractalMap`    | fractalMapCache    | `(cwd, sessionId) => void`                    |
| `saveRunHash`         | runHashCache       | `(cwd, skillName, hash) => void`              |
| `getLastRunHash`      | runHashCache       | `(cwd, skillName) => string \| null`          |
| `hasGuideInjected`    | guideCache         | `(sessionId, cwd) => boolean`                 |
| `markGuideInjected`   | guideCache         | `(sessionId, cwd) => void`                    |
| `appendModeAudit`     | modeAuditCache     | `(cwd, entry: ModeAuditEntry) => void`        |
| `ModeAuditEntry`      | modeAuditCache     | (type) `{ timestamp, sessionId, tool, path, mode, decision, rule, reason? }` |

`appendModeAudit`는 spike 모드 게이트의 allow/deny/exempt 판정을 `{cacheDir}/mode-audit.jsonl`에 JSONL로 누적한다 (절대 throw하지 않음). `ModeAuditEntry`: `{ timestamp, sessionId, tool, path, mode: 'spike'|'normal', decision: 'allow'|'deny'|'exempt', rule, reason? }`.

## Intentional Cross-Concern Coupling

`sessionCache.ts`의 `pruneOldSessions`와 `removeSessionFiles`는 다른 캐시 파일의 파일명 규약을 의도적으로 알고 있다 (`prompt-context-{hash}`, `guide-{hash}`, `boundary-{hash}`, `fmap-{hash}.json`). 이는 세션 정리 시 모든 연관 파일을 원자적으로 제거하기 위한 설계이며, 별도 추상화 없이 파일명을 직접 참조하는 것이 의도된 결합이다. 이 패턴을 변경하거나 추상화하려면 Ask-first 경계를 적용한다.

## Last Updated

2026-06-12
