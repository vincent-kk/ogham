# runTransition

## Requirements

- phase 순서는 refine → estimate → split이며 estimate만 건너뛸 수 있다.
- skip도 전진이므로 start와 같은 refine 통과 게이트를 거친다. BLOCKED 완료는 현재 phase를 전진시키지 않는다.
- estimate 완료 통계는 필수다. action별 필드·허용값은 전이 스키마와 테스트가 고정한다.
- project_root는 워크스페이스에서 서버를 띄우는 호스트에서는 생략할 수 있고, 설치 디렉터리에서 띄우는 호스트에서는 전달한다.

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

전이 입력·스키마 분리·phase 게이트 계약의 내용과 근거가 바뀔 때 갱신한다.
