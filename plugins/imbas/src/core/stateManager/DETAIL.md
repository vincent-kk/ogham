# stateManager — Contract

## Requirements

- `state.json` 의 CRUD 와 파이프라인 전이 규칙을 소유한다. phase 는 `refine → estimate → split` 순서이고 `estimate` 만 건너뛸 수 있다.
- 전이는 순수 함수로 적용한다. `applyTransition` 은 입력 상태를 변형하지 않고 `structuredClone` 한 새 상태를 반환한다 — 호출자가 쥔 상태가 조용히 바뀌면 실패한 전이를 되돌릴 수 없다.
- 규칙 위반은 조용한 무시가 아니라 throw 다. 메시지는 현재 상태와 기대 상태를 함께 적는다.
- `skip_phases` 도 전진 이동이므로 `start_phase` 와 같은 refine 게이트를 통과해야 한다. 게이트가 없으면 통과한 적 없는 refine 을 지나 `current_phase` 가 전진한다.
- 파일 I/O 는 `lib/fileIo.ts` 의 `readJson` · `writeJson` 을 경유하고, 읽기는 `RunStateSchema` 검증을 통과한 값만 반환한다.

## API Contracts

```typescript
export function createRunState(params: {
  run_id: string;
  project_ref: string;
  source_file: string;
  source_issue_ref?: string | null;
}): RunState;

export async function loadRunState(runDir: string): Promise<RunState>;
export async function saveRunState(
  runDir: string,
  state: RunState,
): Promise<void>;
export function applyTransition(
  state: RunState,
  action: RunTransition,
): RunState;
```

- `createRunState` 의 초기 상태: `current_phase` 는 `refine`, 세 phase 모두 `status: 'pending'`, `epic_ref` 는 `null`, `split.pending_review` 는 `true`.
- `applyTransition` 이 받는 `action.action` 은 넷이다.

| action           | 조건                                                     | 결과                                                                   |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `start_phase`    | `validateStartPhase` 통과                                | 해당 phase `in_progress`, `started_at` 기록, `current_phase` 이동      |
| `complete_phase` | `handleCompletePhase` 위임                               | phase 완료 필드 기록                                                   |
| `escape_phase`   | 대상(`split`)이 `in_progress`                            | `split.status = 'escaped'`, `escape_code` 기록                         |
| `skip_phases`    | refine 이 `completed` + `PASS` 또는 `PASS_WITH_WARNINGS` | `pending`·`in_progress` 인 phase 만 `skipped`, 마지막 것 다음으로 전진 |

- `skip_phases` 는 이미 `completed`·`skipped` 인 phase 를 건너뛰어도 그 데이터를 보존하는 멱등 no-op 이다.
- `RunTransition` 은 판별 union 이며 `default` 분기가 `never` 로 소진 검사한다.

## Acceptance Criteria

### AC-state-immutable-transition — 전이 불변성

- `applyTransition` 호출 후 입력 `state` 객체가 참조·값 모두 변하지 않는다.
- 반환값은 입력과 다른 객체다.

### AC-state-initial-shape — 초기 상태 형태

- `createRunState` 결과의 `current_phase` 가 `'refine'` 이다.
- `phases.refine` · `phases.estimate` · `phases.split` 의 `status` 가 모두 `'pending'` 이다.

### AC-state-skip-refine-gate — skip 의 refine 게이트

- refine 이 `pending` 인 상태에서 `skip_phases` 가 throw 한다.
- refine 이 `completed` + `FAIL` 인 상태에서 `skip_phases` 가 throw 한다.
- refine 이 `completed` + `PASS_WITH_WARNINGS` 인 상태에서 `skip_phases` 가 성공한다.

### AC-state-skip-idempotent — skip 멱등성

- 이미 `completed` 인 phase 를 `skip_phases` 대상에 넣어도 그 phase 의 `status` 와 완료 데이터가 유지된다.
- 적용된 phase 가 하나도 없으면 `current_phase` 가 이동하지 않는다.

### AC-state-escape-guard — escape 사전 조건

- `split.status` 가 `in_progress` 가 아닐 때 `escape_phase` 가 throw 하고, 메시지에 현재 status 와 기대 status 가 모두 나타난다.

### AC-state-schema-gate — 로드 검증

- `RunStateSchema` 에 맞지 않는 `state.json` 에 대해 `loadRunState` 가 reject 한다.

## Last Updated

2026-08-06 — phase 체계를 `refine/estimate/split` 로 전환한 v2 전이 규칙을 최초 문서화했다.
