# runTransition

## Requirements

`run_transition` 도구는 run state의 phase 전이를 수행한다. 4가지 action을 지원한다.

- `start_phase`: 필수 필드 `phase` ("validate" | "split" | "devplan").
- `complete_phase`: 필수 필드 `phase`. `result` ("PASS" | "PASS_WITH_WARNINGS" | "BLOCKED")는 스키마상 optional — validate phase 완료 시에는 스킬 관례상 필수로 전달. 선택: `blocking_issues`, `warning_issues`, `pending_review`, `stories_created` (phase="split" 시). `result="BLOCKED"`면 `current_phase`를 전진시키지 않는다.
- `escape_phase`: 필수 필드 `phase="split"`, `escape_code` ("E2-1" | "E2-2" | "E2-3" | "EC-1" | "EC-2").
- `skip_phases`: 필수 필드 `phases` — "validate" | "split" 만 허용 (min 1; devplan은 skip 불가).
- 4개 action 공통 선택 필드 `project_root`: 워크스페이스 절대경로. Claude Code 에서는 생략하고, 플러그인 설치 디렉토리에서 서버를 띄우는 호스트에서는 전달한다.

## API Contracts

MCP `inputSchema`는 flat leaf-primitive only `z.object`다 — 모든 비-core 필드는 `z.string()` / `z.array(z.string())` / `z.number()` / `z.boolean()`이며 `z.enum`/중첩 object/union 사용 금지 (sibling structural dedup으로 `$ref`가 발생하기 때문). 핸들러 `handleRunTransition(input: unknown)`는 첫 줄에서 `RunTransitionSchema.parse(input)`을 호출하여 action별 분기 검증을 수행하며, 잘못된 입력은 throw → `wrapHandler`가 MCP `isError: true`로 변환한다. 반환값은 업데이트된 `RunState` 객체다.

`project_root`는 flat MCP `inputSchema`와 `RunTransitionSchema`의 4개 action 스키마 **양쪽 모두**에 선언해야 한다 — zod object 는 미선언 키를 strip 하므로 한쪽만 선언하면 핸들러가 값을 보지 못한다. 핸들러는 `projectRoot(parsed.project_root)`로 워크스페이스를 해석한다.

## Acceptance Criteria

### AC-ref-free-schema — $ref 없는 스키마

- `run_transition` 의 MCP `inputSchema` 가 방출하는 JSON Schema 에 `$ref` 가 0건이다 — flat leaf-primitive 를 유지하는 이유가 이것이다.

### AC-per-action-validation — action 별 검증

- flat 스키마만으로는 통과하는 잘못된 조합(예: `escape_phase` 에 `escape_code` 누락)이 `RunTransitionSchema.parse` 에서 거부되어 MCP `isError: true` 로 나타난다.
- 올바른 payload 는 flat 스키마와 `RunTransitionSchema` 양쪽을 모두 통과한다.

### AC-project-root-reaches-handler — project_root 도달

- `project_root` 를 넘긴 호출에서 핸들러가 그 값으로 워크스페이스를 해석한다 — 두 스키마 중 한쪽에만 선언되면 zod 가 값을 strip 하므로 이 항목이 그 회귀를 잡는다.

### AC-blocked-holds-phase — BLOCKED 는 전진하지 않는다

- `complete_phase` 를 `result="BLOCKED"` 로 호출하면 해당 phase 는 완료로 기록되지만 `current_phase` 는 그대로다.

## Last Updated

2026-07-30 — 수락 기준을 `### AC-*` 그룹으로 추가했다(계약 내용 변경 없음).
