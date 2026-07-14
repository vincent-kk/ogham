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

## Last Updated

2026-07-10
