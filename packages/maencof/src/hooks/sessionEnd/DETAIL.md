# sessionEnd

## Requirements

- 입력: SessionEnd 이벤트 (`session_id`, `cwd`, optional metadata).
- 출력: stdout JSON `{ continue: true, hookSpecificOutput?: { hookEventName, additionalContext } }`.
- 수행 책임:
  - dailynote에 종료 마커 append (dailynoteWriter 위임).
  - `removeSessionFiles(sessionId, cwd)` — 세션 컨텍스트 파일 삭제.
  - `removeTurnContext(cwd)` — turnContext 캐시 삭제. turnContext는 session-scope이므로 세션 종료와 동시에 폐기.
  - `session_recap.enabled === true`이면 recap 메시지를 빌드하여 `additionalContext`로 emit.
- vault-scope 데이터(graph, weights, snapshot, stale-nodes, usageStats 등)는 절대 손대지 않는다.

## API Contracts

- entry: `dist/sessionEnd/index.mjs` (esbuild 산출).
- export: `runSessionEnd(input: SessionEndInput): Promise<HookOutput>`.
- 의존 모듈: `cacheManager` (세션 파일 + turnContext 삭제), `dailynoteWriter` (종료 마커), recap 빌더 (옵션).
- 실패 정책: 모든 I/O 실패는 `appendErrorLogSafe`로 흡수, 항상 `continue: true` 반환.
