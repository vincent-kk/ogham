# contextInjector

## Requirements

- 첫 prompt: session context (KG 요약, 동반자 identity, 지시문) + turn context를 `\n\n`으로 결합하여 emit.
- 후속 prompt: turn context만 emit.
- 인덱서 내부 상태(stale 카운트, freshness 비율, `<kg-stale-advisory>` 분기 등)는 컨텍스트에 절대 포함하지 않는다. 인덱스 신선도는 MCP server가 cache + partial reindex로 처리한다.
- maencof vault가 아닌 디렉터리에서 호출되면 즉시 no-op (`isMaencofVault` 가드).
- session context는 세션 1회만 빌드하고 캐시 (`writePromptContext` + `markSessionInjected`).
- turn context는 매 prompt마다 캐시 hit 우선, miss 시 organ에서 새로 빌드 후 `writeTurnContext` persist.

## API Contracts

- 독립 bridge 없음 — UserPromptSubmit 디스패처(`eventDispatch`)가 `injectContext` 를 호출한다.
- export: `injectContext(input: UserPromptSubmitInput): HookOutput`.
- 내부 organ: `./turnContext/` — `buildTurnContext`, `readIndexMetadata`, `readCompanionIdentity`, `compressMarkdown`, `readL1Summary`, `buildCompanionIdentityTag` 등.
- 캐시 의존: `cacheManager` (`readTurnContext` / `writeTurnContext` / `writePromptContext` / `isFirstInSession` / `markSessionInjected`).
- 실패 정책: 모든 I/O 실패는 `appendErrorLogSafe`로 silent 처리, 항상 `continue: true` 반환.
