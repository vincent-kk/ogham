# run-transition

## Requirements

`run_transition` 도구는 run state의 phase 전이를 수행한다. 4가지 action을 지원한다.

- `start_phase`: 필수 필드 `phase` ("validate" | "split" | "devplan").
- `complete_phase`: 필수 필드 `phase`, `result` ("PASS" | "PASS_WITH_WARNINGS" | "BLOCKED"). 선택: `blocking_issues`, `warning_issues`, `pending_review`, `stories_created` (phase="split" 시).
- `escape_phase`: 필수 필드 `phase="split"`, `escape_code` ("E2-1" | "E2-2" | "E2-3" | "EC-1" | "EC-2").
- `skip_phases`: 필수 필드 `phases` (phase 이름 배열).

## API Contracts

MCP `inputSchema`는 flat leaf-primitive only `z.object`다 — 모든 비-core 필드는 `z.string()` / `z.array(z.string())` / `z.number()` / `z.boolean()`이며 `z.enum`/중첩 object/union 사용 금지 (sibling structural dedup으로 `$ref`가 발생하기 때문). 핸들러 `handleRunTransition(input: unknown)`는 첫 줄에서 `RunTransitionSchema.parse(input)`을 호출하여 action별 분기 검증을 수행하며, 잘못된 입력은 throw → `wrapHandler`가 MCP `isError: true`로 변환한다. 반환값은 업데이트된 `RunState` 객체다.

## Last Updated

2026-04-05
