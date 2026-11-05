# stateManager — Contract

## Requirements

- `state.json` 의 CRUD 와 파이프라인 전이 규칙을 소유한다. phase 는 `refine → estimate → split` 순서이고 `estimate` 만 건너뛸 수 있다.
- 전이는 순수 함수로 적용한다. `applyTransition` 은 입력 상태를 변형하지 않고 `structuredClone` 한 새 상태를 반환한다 — 호출자가 쥔 상태가 조용히 바뀌면 실패한 전이를 되돌릴 수 없다.
- 규칙 위반은 조용한 무시가 아니라 throw 다. 메시지는 현재 상태와 기대 상태를 함께 적는다.
- `skip_phases` 도 전진 이동이므로 `start_phase` 와 같은 refine 게이트를 통과해야 한다. 게이트가 없으면 통과한 적 없는 refine 을 지나 `current_phase` 가 전진한다.
- 파일 I/O 는 `lib/fileIo.ts` 의 `readJson` · `writeJson` 을 경유하고, 읽기는 `RunStateSchema` 검증을 통과한 값만 반환한다.

## API Contracts

이미 완료되거나 건너뛴 phase를 다시 skip해도 완료 데이터는 보존한다. 적용된 phase가 없으면 현재 phase를 전진시키지 않는다. action별 입력과 초기값은 스키마·구현·테스트에서 확인한다.

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

phase 전이·불변성·영속 계약의 내용과 근거가 바뀔 때 갱신한다.
