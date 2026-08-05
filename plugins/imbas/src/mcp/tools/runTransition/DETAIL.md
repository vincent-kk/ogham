# runTransition

## Requirements

`run_transition` 도구는 run state의 phase 전이를 수행한다. phase 는 `refine → estimate(skip 가능) → split` 이며 4가지 action을 지원한다.

- `start_phase`: 필수 필드 `phase` ("refine" | "estimate" | "split"). `estimate` 는 refine 이 PASS 계열로 완료되어야, `split` 은 추가로 estimate 가 completed 또는 skipped 여야 시작된다.
- `complete_phase`: 필수 필드 `phase`. `refine` 완료는 `result` ("PASS" | "PASS_WITH_WARNINGS" | "BLOCKED") 필수, `estimate` 완료는 `estimated_manday`(음이 아닌 수) 필수 — 둘 다 핸들러 계층(`handleCompletePhase`)이 강제한다. 선택: `blocking_issues`, `warning_issues` (refine), `pending_review`, `stories_created` (split). `result="BLOCKED"`면 `current_phase`를 전진시키지 않는다.
- `escape_phase`: 필수 필드 `phase="split"`, `escape_code` ("E2-1" | "E2-2" | "E2-3" | "EC-1" | "EC-2").
- `skip_phases`: 필수 필드 `phases` — `"estimate"` 만 허용 (min 1). skip 된 phase 는 `status: 'skipped'` 로 기록되고 `current_phase` 는 다음 phase 로 전진한다.
- 4개 action 공통 선택 필드 `project_root`: 워크스페이스 절대경로. Claude Code 에서는 생략하고, 플러그인 설치 디렉토리에서 서버를 띄우는 호스트에서는 전달한다.

## API Contracts

MCP `inputSchema`는 flat leaf-primitive only `z.object`다 — 모든 비-core 필드는 `z.string()` / `z.array(z.string())` / `z.number()` / `z.boolean()`이며 `z.enum`/중첩 object/union 사용 금지 (sibling structural dedup으로 `$ref`가 발생하기 때문). 핸들러 `handleRunTransition(input: unknown)`는 첫 줄에서 `RunTransitionSchema.parse(input)`을 호출하여 action별 분기 검증을 수행하며, 잘못된 입력은 throw → `wrapHandler`가 MCP `isError: true`로 변환한다. 반환값은 업데이트된 `RunState` 객체다.

`project_root`는 flat MCP `inputSchema`와 `RunTransitionSchema`의 4개 action 스키마 **양쪽 모두**에 선언해야 한다 — zod object 는 미선언 키를 strip 하므로 한쪽만 선언하면 핸들러가 값을 보지 못한다. 핸들러는 `projectRoot(parsed.project_root)`로 워크스페이스를 해석한다.

## Acceptance Criteria

### AC-ref-free-schema — $ref 없는 스키마

- `run_transition` 의 MCP `inputSchema` 가 방출하는 JSON Schema 에 `$ref` 가 0건이다 — flat leaf-primitive 를 유지하는 이유가 이것이다.

### AC-per-action-validation — action 별 검증

- flat 스키마만으로는 통과하는 잘못된 조합(예: `skip_phases` 에 `phases: ["refine"]`)이 `RunTransitionSchema.parse` 에서 거부되어 MCP `isError: true` 로 나타난다.
- 올바른 payload 는 flat 스키마와 `RunTransitionSchema` 양쪽을 모두 통과한다.

### AC-project-root-reaches-handler — project_root 도달

- `project_root` 를 넘긴 호출에서 핸들러가 그 값으로 워크스페이스를 해석한다 — 두 스키마 중 한쪽에만 선언되면 zod 가 값을 strip 하므로 이 항목이 그 회귀를 잡는다.

### AC-blocked-holds-phase — BLOCKED 는 전진하지 않는다

- `complete_phase` 를 `result="BLOCKED"` 로 호출하면 해당 phase 는 완료로 기록되지만 `current_phase` 는 그대로다.

### AC-estimate-mandatory-stats — estimate 완료 통계 필수

- `complete_phase(estimate)` 는 `estimated_manday` 없이 거부되고, 값이 있으면 `phases.estimate.estimated_manday` 에 기록된다.

## Last Updated

2026-08-05 — v2: phase 집합 refine/estimate/split, skip 대상 estimate 단일화, estimated_manday 계약 추가.
