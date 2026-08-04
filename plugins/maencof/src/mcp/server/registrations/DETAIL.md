# registrations — Contract

## Requirements

- 도메인별 등록 함수만 소유한다. 도구 핸들러 구현은 `mcp/tools/` 가, 등록 순서 오케스트레이션은 부모 `server` 의 `server.ts` 가 갖는다.
- 핸들러는 `mcp/tools/` 의 도구 배럴에서 가져온다. 등록부에 로직을 인라인하지 않는다 — 인라인하면 도구 계약이 두 곳에 흩어지고 핸들러 단위 검증이 불가능해진다.
- 모든 등록은 `middlewares` 의 wrapper 를 경유한다. mutate 는 `registerMutateTool`, read 는 `registerReadTool({ needsFreshness })` 다. 직접 `server.tool(...)` 을 부르면 vault 경로 해석·사용량 통계·stale 기록·에러 처리를 전부 잃는다.
- 도구 이름은 `constants/mcpToolNames.ts` 의 `McpToolName` 에서 가져온다. 문자열 리터럴을 등록부에 적으면 이름이 상수·문서·권한 목록과 갈라진다.
- `needsFreshness` 는 그래프 의존성으로 결정한다. SA·이웃 탐색처럼 그래프를 읽는 도구만 `true` 이고, 그래프와 무관한 도구는 `false` 다 — 무관한 도구에 freshness 를 걸면 매 호출이 인덱스 상태에 묶인다.
- KG 그래프를 건드리지 않는 쓰기 도구는 mutate 가 아니라 plain read 로 등록한다. `companion_edit` 과 `capture_personal_context` 가 그 경우이며, mutate 로 올리면 그래프 캐시를 무효화해 preview 경로까지 부수효과를 갖는다.
- 등록 그룹 경계와 read/mutate 승격은 `INTENT.md` 의 "Ask first" 대상이다. 등록 실패를 조용히 삼키지 않는다 — 서버 기동이 도구 부재를 모르면 안 된다.
- 핸들러가 읽는 입력 필드는 전부 `inputSchema` 에 있어야 한다. Zod 는 스키마에 없는 키를 조용히 버리므로, 누락된 필드는 타입에도 핸들러에도 존재하면서 호출자만 도달하지 못하는 상태가 된다 — 에러 메시지가 실행 불가능한 복구 수단을 안내하는 형태로 드러난다.
- 도메인 모델이 소유한 값 집합은 등록부에서 리터럴로 열거하지 않고 그 모델의 스키마에서 파생한다. `sub_layer` 가 그 경우이며 `types/frontmatter.ts` 의 `SubLayerSchema` 가 정본이다 — 열거를 복제하면 모델이 좁아져도 이 자리는 폐기된 값을 계속 받는다.

## API Contracts

### Entry point (`index.ts`)

여덟 개 등록 함수를 이름으로 재노출한다. 모두 `(server: McpServer): void` 시그니처다.

| Export                         | 등록 도구                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `registerCrudTools`            | mutate 5 (`create` · `capture_insight` · `update` · `delete` · `move`) + plain read 1 (`read`)                                           |
| `registerKgTools`              | fresh read 5 (`kg_search` · `kg_navigate` · `kg_context` · `kg_suggest_links` · `kg_timeline`) + plain read 2 (`kg_status` · `kg_build`) |
| `registerClaudeMdTools`        | mutate 2 (`claudemd_merge` · `claudemd_remove`) + plain read 1 (`claudemd_read`)                                                         |
| `registerCompanionTools`       | plain read 1 (`companion_edit`)                                                                                                          |
| `registerPersonalContextTools` | plain read 1 (`capture_personal_context`)                                                                                                |
| `registerActivityReadTools`    | plain read 1 (`activity_read`)                                                                                                           |
| `registerCacheTools`           | plain read 1 (`context_cache_manage`)                                                                                                    |
| `registerWorkHistoryTools`     | plain read 1 (`work_history`)                                                                                                            |

합계 21개. 이 표가 서버의 도구 표면 목록이다.

### Affected-path 보고 (mutate 전용)

`registerMutateTool` 의 마지막 인자는 stale 기록에 쓸 영향 경로를 만든다. 형태는 세 가지다 — 인자에서 바로 얻는 경로(`update` · `delete`), 결과에서 얻는 경로(`create` · `capture_insight`), 그리고 `{ primary, also }` 쌍(`move` — 원본과 대상 둘 다 stale 이다).

`claudemd_merge` / `claudemd_remove` 는 대상 파일이 호스트별로 달라(Claude=`CLAUDE.md` · Codex=`AGENTS.md`) 호출 시점에 `createProjectInstructionManager(getVaultPath()).inspect().target` 을 vault 상대 경로로 환산한다. 상수로 고정할 수 없는 유일한 경우다.

### Fresh read 의 graph 인자

`needsFreshness: true` 로 등록된 도구의 핸들러는 세 번째 인자로 graph reference 를 받는다. 등록부는 그 인자를 그대로 핸들러에 넘기고 rebuild 를 await 하지 않는다.

### 공유 Zod 프래그먼트

`operations/kg.ts` 의 `timeWindowFields`(`since` / `until`, `YYYY-MM-DD`, 양 끝 포함)는 `kg_search` · `kg_context` · `kg_timeline` 세 도구가 공유한다. 시간창 의미를 한 곳에서 정의해 세 도구 설명이 갈라지지 않게 한다.

`sub_layer` 를 받는 네 도구(`create` · `kg_search` · `kg_context` · `kg_timeline`)는 `types/frontmatter.ts` 의 `SubLayerSchema` 를 `.optional().describe(...)` 로 파생해 쓴다. 등록부에 값을 열거하지 않는다 — 설명 문구는 도구마다 달라도 허용값은 레이어 모델 하나에서만 나와야 한다.

## Acceptance Criteria

### AC-handlers-not-inlined — 핸들러 비인라인

- 등록 파일이 도구 로직을 구현하지 않고 `mcp/tools/` 핸들러를 호출만 한다.

### AC-wrapper-only-registration — wrapper 경유 등록

- 모든 도구가 `registerMutateTool` 또는 `registerReadTool` 을 통해 등록된다.

### AC-tool-names-from-constants — 이름 상수 사용

- 등록명이 `McpToolName` 값이고 리터럴 문자열이 아니다.

### AC-graph-free-writes-stay-read — 그래프 무관 쓰기의 read 등록

- `companion_edit` · `capture_personal_context` 가 plain read 로 등록되어 그래프 캐시를 무효화하지 않는다.

### AC-move-reports-both-paths — move 양쪽 경로

- `move` 의 영향 경로가 원본과 대상을 모두 포함한다.

### AC-instruction-target-resolved-per-call — 지침 대상 호출별 해석

- `claudemd_merge` · `claudemd_remove` 의 영향 경로가 호출 시점 호스트 해석 결과에서 나온다.

### AC-handler-fields-reach-schema — 핸들러 필드의 스키마 도달

- 핸들러가 읽는 입력 필드가 등록된 `inputSchema` 를 통과해 핸들러까지 전달된다. `update` 의 `frontmatter.unset` 이 대표 사례다.

## History

- 2026-08-04 — `sub_layer` 열거를 네 자리에서 지우고 `SubLayerSchema` 파생으로 바꿨다. v3 가 L5 서브레이어를 없앴을 때 이 복제본들은 함께 고쳤지만 같은 복제를 한 `@ogham/maencof-lens` 는 빠졌다. 복제가 가능한 한 다음 모델 변경에서도 같은 자리가 남는다.
- 2026-08-03 — `update` 의 `frontmatter.unset` 이 타입·핸들러·에러 메시지에는 있으나 `inputSchema` 에만 없어, 손상된 frontmatter 의 유일한 복구 경로가 호출 불가 상태였다. 스키마에 필드를 올리고 `AC-handler-fields-reach-schema` 로 고정했다.

## Last Updated

2026-08-04 — 도메인 모델 소유 값 집합을 등록부에서 복제하지 않는다는 요구사항을 추가하고, `sub_layer` 공유 스키마를 API Contracts 에 적었다.
