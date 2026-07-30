# contextInjector

## Requirements

- 첫 prompt: session context (KG 요약, 동반자 identity, 지시문) + turn context를 `\n\n`으로 결합하여 emit.
- 후속 prompt: turn context만 emit.
- session context의 KG 요약에 L5 buffer 인박스 카운트를 포함한다 (`subLayer === 'buffer'` 노드 수). 0이면 라인을 생략한다 — 미분류 항목 triage(`/maencof:organize`)를 유도하는 세션 1회 넛지.
- 인덱서 내부 상태(stale 카운트, freshness 비율, `<kg-stale-advisory>` 분기 등)는 컨텍스트에 절대 포함하지 않는다. 인덱스 신선도는 MCP server가 cache + partial reindex로 처리한다.
- maencof vault가 아닌 디렉터리에서 호출되면 즉시 no-op (`isMaencofVault` 가드).
- session context는 세션 1회만 빌드하고 캐시 (`writePromptContext` + `markSessionInjected`).
- turn context는 매 prompt마다 캐시 hit 우선, miss 시 `core/turnContext` 에서 새로 빌드 후 `writeTurnContext` persist.

## API Contracts

- 독립 bridge 없음 — `userPromptSubmit` orchestrator 가 `injectContext` 를 호출한다.
- export: `injectContext(input: UserPromptSubmitInput): HookOutput`.
- turn 컨텍스트 빌드: `core/turnContext` (`buildTurnContext`, `readIndexMetadata`, `readCompanionIdentity`, `compressMarkdownBody`, `readL1Summary`, `buildCompanionIdentityTag`; mcp 와 공유).
- 캐시 의존: `core/cacheManager` (`readTurnContext` / `writeTurnContext` / `writePromptContext` / `isFirstInSession` / `markSessionInjected`).
- 실패 정책: 모든 I/O 실패는 `appendErrorLogSafe`로 silent 처리, 항상 `continue: true` 반환.

## Acceptance Criteria

### AC-first-prompt-session-context — 첫 프롬프트만 session context

- 첫 프롬프트에만 session context 가 실리고 이후 프롬프트는 turn context 만 싣는다.

### AC-no-indexer-state — 인덱서 상태 비노출

- 주입 문자열에 stale 카운트·freshness 비율·advisory 분기가 없다.

### AC-non-vault-noop — 비볼트 no-op

- 볼트가 아닌 cwd 에서 부수효과 없이 `{ continue: true }` 를 반환한다.

## Boundary Exemptions

### `contextInjector.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. UserPromptSubmit orchestrator 가 이 파일을 직접 가져오는 것이 설계된 형태이고, 배럴 경유는 43008 바이트 캡을 잠식한다 — 같은 번들이 insightInjector·sessionTouch·vaultCommitter 도 싣는다.

## Last Updated

2026-07-30 — acceptance group 을 채우고 훅 직접 import 면책을 선언했다.
