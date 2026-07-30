# hooks — Contract

## Requirements

- 이벤트마다 디렉터리 하나가 그 이벤트의 브리지 entry(`<event>/<event>.entry.ts`) + 얇은 orchestrator(`<event>/<event>.ts`) + `helpers/<concern>/` 를 소유한다. 여러 이벤트가 공유하는 관심사와 디스패치 헬퍼는 `utils/` 아래에, 경로·stdin·vault 판별은 `shared/` 에 둔다.
- 사용하는 이벤트는 넷뿐이다 — SessionStart · UserPromptSubmit · PreToolUse · PostToolUse. Stop 은 매 턴 spawn 비용이라, SessionEnd 는 Claude 전용이라 3-호스트 이식이 불가능해서 두지 않는다. 세션 종료 관심사는 MCP 서버 수명주기(`../mcp/server/lifecycle/`)가 소유하고, 훅은 매 턴 `session-touch` 로 그 재료만 기록한다.
- 훅은 얇은 스크립트로 남는다. 각 브리지는 Node 빌트인만으로 돌아야 하고 zod · fast-glob · MCP SDK · AST 도구 같은 외부 런타임을 번들에 끌어들이지 않는다. 이 격리는 `scripts/buildHooks.mjs` 의 금지 패턴 가드가 빌드 타임에 강제한다.
- 헬퍼·공유 관심사·core 는 배럴(`index.js`)이 아니라 concrete 경로로 가져온다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 이벤트별 크기 상한을 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 공유 패키지도 기능별 direct subpath 를 쓰며, aggregate 재유입은 같은 스크립트의 import-graph 가드가 막는다.
- 각 관심사는 `safeConcern` 으로 격리한다. 하나가 throw 해도 나머지 관심사가 실행되고 훅은 단일 envelope 을 반환한다 — 훅 실패가 세션이나 턴을 막지 않는다.
- entry 와 orchestrator 에 로직을 인라인하지 않는다. entry 는 stdin→orchestrator→stdout 배선이고, orchestrator 는 관심사 호출과 병합만 한다.
- 인덱서 내부 상태(stale-node, freshness)를 훅에서 다루거나 컨텍스트에 노출하지 않는다. 그것은 MCP 서버의 책임이다.
- 새 이벤트나 관심사를 더할 때는 `scripts/buildHooks.mjs` 의 `entryPath` 항목을 함께 갱신한다. 등록하지 않은 entry 는 번들이 만들어지지 않는다.

## API Contracts

### Entry point (`index.ts`)

이벤트별 orchestrator 넷을 이름으로 재노출한다.

- `orchestrateSessionStart` · `orchestrateUserPromptSubmit` · `orchestratePreToolUse` · `orchestratePostToolUse`

각각 `DispatchInput` 을 받아 `MergedHookOutput` 을 돌려준다. 이 배럴은 라이브러리 소비용이며, 실행 경로는 여기를 거치지 않는다.

### 실행 표면 (bridge)

| Event            | 소스 entry                                   | 번들 산출물                     |
| ---------------- | -------------------------------------------- | ------------------------------- |
| SessionStart     | `sessionStart/sessionStart.entry.ts`         | `bridge/session-start.mjs`      |
| UserPromptSubmit | `userPromptSubmit/userPromptSubmit.entry.ts` | `bridge/user-prompt-submit.mjs` |
| PreToolUse       | `preToolUse/preToolUse.entry.ts`             | `bridge/pre-tool-use.mjs`       |
| PostToolUse      | `postToolUse/postToolUse.entry.ts`           | `bridge/post-tool-use.mjs`      |

산출물 basename 은 `hooks.json` 이 참조하므로 안정적으로 유지한다. agy 호스트는 같은 핸들러를 `bridge/run-agy.mjs` 러너를 통해 호출한다.

### 빌드 가드

이벤트별 바이트 상한, 금지 모듈 패턴, SessionStart 전용 import-graph 금지 목록, aggregate 배럴 금지 목록, 메타 스킬 본문 길이 상한 — 다섯 가드의 정본은 모두 `scripts/buildHooks.mjs` 다. 값을 이 문서에 복제하지 않는다. 어느 하나라도 걸리면 빌드가 실패한다.

### 관심사 실행 순서

- SessionStart — bootstrap → lifecycle
- UserPromptSubmit — contextInjector → lifecycle → insightInjector → session-touch → vaultCommitter(마지막, 부수효과)
- PreToolUse — `tool_name` 라우팅(`Write|Edit`→layerGuard, `Read|Grep|Glob`→vaultRedirector) + lifecycle
- PostToolUse — `MAENCOF_MCP_TOOLS` allowlist 게이트를 통과한 activityRecorder + lifecycle

## Acceptance Criteria

### AC-four-events-only — 이벤트 넷 한정

- 훅 등록과 번들 목록에 Stop · SessionEnd 항목이 없다.

### AC-thin-bundles — 얇은 번들

- 네 번들이 모두 이벤트별 상한 안에 들고 금지 모듈 패턴에 걸리지 않는다.

### AC-concrete-imports — concrete import

- 훅 도달 코드가 배럴 `index.js` 나 공유 패키지 aggregate 를 거치지 않는다.

### AC-concern-isolation — 관심사 격리

- 한 관심사가 throw 해도 나머지가 실행되고 단일 envelope 이 반환된다.

### AC-entry-registered — entry 등록

- 각 이벤트 entry 가 빌드 스크립트의 `entryPath` 목록에 등록되어 대응 번들을 만든다.

### AC-no-indexer-state — 인덱서 상태 비노출

- 훅 출력에 stale-node·freshness 같은 인덱서 내부 상태가 담기지 않는다.

## Boundary Exemptions

### `sessionStart/sessionStart.entry.ts` — esbuild bundle entry point

- **Consumers**: `scripts/buildHooks.mjs`
- **Direct import**: `allowed`
- **Reason**: 라이브러리 심볼이 아니라 SessionStart 실행 진입점이고, 빌드 스크립트가 이 파일을 독립 번들의 entry 로 지목한다. `index.ts` 를 entry 로 삼으면 네 이벤트의 관심사 그래프가 전부 이 번들에 들어가 이벤트별 크기 상한을 즉시 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다.

### `userPromptSubmit/userPromptSubmit.entry.ts` — esbuild bundle entry point

- **Consumers**: `scripts/buildHooks.mjs`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. UserPromptSubmit 번들은 컨텍스트 주입과 vault 자동 커밋까지 한 상한 안에서 처리해야 해서 여유가 가장 적다.

### `preToolUse/preToolUse.entry.ts` — esbuild bundle entry point

- **Consumers**: `scripts/buildHooks.mjs`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. PreToolUse 는 매 도구 호출마다 spawn 되므로 가장 낮은 상한을 받는다.

### `postToolUse/postToolUse.entry.ts` — esbuild bundle entry point

- **Consumers**: `scripts/buildHooks.mjs`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. PostToolUse 도 매 도구 호출마다 spawn 되므로 가장 낮은 상한을 받는다.

### `utils` — MCP lifecycle reach-in

- **Consumers**: `**/src/mcp/server/lifecycle/**`
- **Direct import**: `allowed`
- **Reason**: SessionEnd 훅을 없앤 뒤 세션 마감 작업(만료 아카이빙 · changelog 스캔 · vault 자동 커밋)의 소유자는 MCP 서버 수명주기다. 그 작업들의 구현은 훅과 공유되므로 lifecycle 이 각 관심사 fractal 의 entry point 를 직접 가져간다. `hooks/index.ts` 는 이벤트 orchestrator 넷만 재노출하므로 여기로는 도달할 수 없고, 도달하게 하려면 훅 orchestrator 를 MCP 에서 실행하는 형태가 되어 이벤트 계약이 깨진다. 반대 방향(훅→mcp) 의존은 금지된 채로 남는다.

### `shared` — MCP lifecycle vault gate

- **Consumers**: `**/src/mcp/server/lifecycle/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같은 경로에서 볼트 판정(`isMaencofVault`)만 필요하다. 훅과 MCP 가 같은 게이트를 써야 볼트가 아닌 디렉터리에서의 동작이 두 경로에서 갈라지지 않는다.

## Last Updated

2026-07-30 — 이벤트 넷 한정·번들 격리 가드·관심사 격리 계약과 번들 entry·MCP lifecycle 직접 도달 면책을 문서화했다.
