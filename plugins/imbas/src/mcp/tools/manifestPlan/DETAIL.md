# manifestPlan — Contract

## Requirements

- MCP 도구 `manifest_plan` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 입력 매니페스트는 devplan 하나뿐이다. 이 도구가 계산하는 것은 devplan 이 이미 기록한 `execution_order` 중 **아직 남은 일**이며, 순서를 새로 만들지 않는다 — DAG 계산은 `manifest_implement_plan` 의 몫이다.
- 필터링은 `core/executionPlanner` 의 `planExecution` 이 소유한다. pending 판정 규칙을 여기서 다시 구현하지 않는다.
- 디스크에 아무것도 쓰지 않는다(`readOnlyHint: true`). 결과는 호출 시점의 스냅샷이며 파일로 남지 않는다.

## API Contracts

```typescript
export function handleManifestPlan(
  input: ManifestPlanInput,
): Promise<ExecutionPlan>;

interface ManifestPlanInput {
  project_ref: string;
  run_id: string;
  project_root?: string;
}

interface ExecutionPlan {
  steps: Array<{
    step: number;
    action: string;
    items: string[];
    pending_count: number;
  }>;
  total_pending: number;
}
```

- MCP `inputSchema` 는 `{ project_ref, run_id }` 필수 + `project_root?` 다. 타입 인자가 없다 — 대상은 언제나 `<run_dir>/devplan-manifest.json` 이다.
- `steps[].items` 는 원본 `execution_order` step 의 항목 중 상태가 `pending` 인 것만 남긴다. pending 이 하나도 없는 step 은 결과에서 통째로 빠지므로, `step` 번호는 원본 값을 유지하며 연속하지 않을 수 있다.
- pending 판정 대상은 네 갈래다 — `tasks[]`, `tasks[].subtasks[]`, `story_subtasks[].subtasks[]`, 그리고 `feedback_comments[]`(pending 이면 그 `target_story` 를 대상 ID 로 넣는다).
- `total_pending` 은 남은 `steps[].items` 의 총 개수다.
- 실패 — devplan 매니페스트 부재·스키마 불일치는 `readJson` 오류로 올라온다. stories 매니페스트로 대체하지 않는다.
- 배럴은 `handleManifestPlan` 만 노출한다.

## Acceptance Criteria

### AC-pending-only — pending 만 남긴다

- 이미 `created` 인 항목은 `steps[].items` 에 나타나지 않는다.
- 모든 항목이 처리된 매니페스트는 `steps: []`, `total_pending: 0` 을 준다 — 오류가 아니다.

### AC-step-identity-preserved — step 번호 보존

- 결과에 남은 step 은 원본 `execution_order` 의 `step`·`action` 을 그대로 지닌다. 빈 step 을 걷어낸 뒤에도 번호를 다시 매기지 않는다.

### AC-devplan-only — devplan 전용

- devplan 매니페스트가 없으면 오류 응답이 된다 — 다른 매니페스트를 대신 읽지 않는다.

## Last Updated

2026-07-30 — 실행 계획 조회 계약과 pending 필터 규약을 문서화했다.
