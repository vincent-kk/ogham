# sessionSignals — Contract

## Requirements

- 워크플로우 상태는 host/session/agent 해시별 파일이다. 위치는 소비 프로젝트의 런타임 디렉터리(`../../constants/files.ts`의 `CONFIG_DIR`·`SESSIONS_DIR`)이며 실행 중에 만들어지는 비추적 상태라 이 저장소에는 없다.
- `WorkflowBinding`은 `step?: WorkflowStep`을 갖는다. `WorkflowStep`은 아홉 체인 스킬 이름의 합집합이고, 그 중 `CHAIN_ENTRY_STEPS`(`write-plan`, `execute`)만 새 바인딩을 만들 수 있다. `isWorkflowState`는 저장된 `step`이 `WorkflowStep` 멤버인지 검증하고, 실패하면 actor 상태 전체를 무효로 친다.
- `step`·`start`·`resume`의 전이는 이전 상태 × 요청의 조합으로 `created`·`switched`·`updated`·`mismatch`·`rejected` 중 하나를 반환한다. 바인딩이 없을 때 진입 `step`이나 `start`는 `created`, 비진입 `step`은 `rejected`(상태 불변, 무주입), `resume`도 `rejected`(새 바인딩을 만들지 않음)다. 같은 task에 대한 `start`는 `updated`가 아니라 `created`다 — 처음부터 다시 시작하는 것으로 취급해 바인딩을 새로 만들고 counts·verdicts·generation을 초기화한다. 같은 task의 active/paused에 대한 `step`·`resume`은 `updated`(paused는 active로 복귀, `step`만 갱신, generation·invocations 불변)다. 다른 task에 대한 진입 `step`·`start`는 `switched`(counts·verdicts 초기화)이고, 비진입 `step`·`resume`·`pause`·`finish`는 `mismatch`(상태 불변)다.
- `observeBoundary(identity, enabled, now, { firstChild?, suspend? })`로 턴 경계를 관측한다. generation·invocations·seen 갱신은 항상 하고, `suspend`가 참일 때만 바인딩을 `suspended`로 만든다. 반환값은 같은 actor transaction 안에서 갱신 뒤 상태의 바인딩 스냅샷이며, 호출자는 이 스냅샷만으로 렌더한다(갱신 전 상태를 읽어 낡은 표시를 내지 않는다).
- SessionStart는 startup/resume/clear/fork에서 `suspend: true`(compact는 제외, 진행 중 호출 보존), UserPromptSubmit은 `suspend: !enabled`(off/advisory만 suspend)로 호출한다. SubagentStart는 자식 자신의 최초 anchor만 만들며 바인딩을 상속하지 않는다.
- `isFirstChildTurn(identity, now)`는 `observeBoundary`가 같은 파일을 갱신하기 전에 자식 자신의 상태 파일을 무락으로 읽어, 파일이 없거나 TTL을 넘겼거나 저장된 generation이 `0`이면 첫 턴으로 본다(쓰기는 하지 않음). 읽기 실패도 첫 턴으로 본다.
- `readActorBinding(identity, now)`는 무락·무쓰기로 다른 actor(부모 `host + session_id + 'main'`)의 상태 파일을 읽어, 구조 검증·TTL·`.revoked`를 통과하고 `state === 'active'`인 스냅샷만 반환한다. 잠금 중이거나 읽기 실패면 아무것도 반환하지 않는다.
- 상태 변경과 부수효과는 actor lock 내부에서 수행한다. lock 실패 시 무변경이며 actor→gate 순으로 잠근다. 두 파일 간 crash atomicity는 보장하지 않는다.
- 경계 무효화 저장 실패 시 revocation marker를 시도한다. marker는 같은 세션에서 해제하지 않는다. 상태와 marker 모두 쓸 수 없는 경우 복구 후 과거 상태가 살아날 수 있다는 한계는 남는다.
- actor는 7일 비활성, invocation은 24시간 후 만료하며 해당 actor 접근 시에만 정리한다. 명령·출력은 저장하지 않는다. 사용자 원장은 삭제하지 않는다.
- 사용자 소유 ignore 파일은 수정하지 않는다. sessions 경로 제외가 명시적으로 확인되지 않으면 자동 상태 생성을 생략한다.
- 전이는 정확한 호출 ID·입력·actor·turn·generation에 대응하는 성공한 Post에서만 적용된다. `created`·`switched`는 generation을 올리고 진행 중 호출을 폐기하며, `step`·`resume`의 `updated`는 generation·invocations를 바꾸지 않는다. `pause`·`finish`의 `updated`는 `created`·`switched`와 같이 generation을 올리고 진행 중 호출을 폐기해 늦게 도착하는 결과를 무효화한다. 문서의 `paused`는 저장 상태 `suspended`(`types/workflow.ts`)를 가리킨다.
- **활성 바인딩의 잔여 범위(명시적 수용).** standard/strict에서 활성 바인딩은 같은 host·native session·actor의 후속 사용자 턴 전체에 유지된다. 다른 task로의 진입 `step` 교체나 `pause`/`finish` 전까지는, 무관한 질문이나 진입 스킬을 거치지 않는 작업에도 이전 task의 진행 줄이 표시되고 그 사이의 일치하는 Bash 증거·실패 힌트가 이 바인딩에 쌓인다. 이 범위는 같은 session 안에서만 허용되며 다른 session·agent·host로는 상속되지 않는다(actor 해시가 분리하고, SessionStart가 세션 경계에서 suspend한다).

## API Contracts

- workflow store는 명시적 lifecycle와 Bash 관측을 같은 lock으로 결합한다. 훅 경계에서 host payload를 정규화하고 core에는 vendor-neutral identity만 전달한다.
- MCP 검증 응답 accepted는 요청 수락만 의미한다. 실제 참여 성공은 Post 훅 ACK로 확인한다.

## Acceptance Criteria

### AC-workflow-lifecycle — 참여 격리

- 바인딩 없는 일반 작업·Skill 읽기는 바인딩·원장·진행 줄을 만들지 않는다. dial 범위 안내(SessionStart 선출·체인, strict의 활성 바인딩이 없는 턴의 체인 한 줄)는 훅 렌더 소관이다.
- 이전 turn·다른 actor·교체 전 task의 호출 결과와 중복·역순·늦은 결과는 효과를 만들지 않는다. 비진입 `step`·`resume`·`pause`·`finish`가 다른 task를 가리키면 상태 변경 없이 짧은 불일치 결과만 돌려준다.
- lock 획득 실패와 손상 파일은 자동 참여를 만들지 않는다.
- `resume`은 기존 바인딩(같은 task의 active 또는 paused)만 갱신하며 새 바인딩을 만들지 않는다.

### AC-workflow-observations — 작업 범위 증거

- active task에만 CHECK 증거를 기록하고 동일 판정/증거는 재알림하지 않는다. regression과 agent provenance는 유지한다.
- 반복 실패 카운터는 actor/task별이며 의도된 red를 차단하지 않는다.

## Boundary Exemptions

### `workflow` — hook bundle isolation

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: Concrete imports keep optional hook bundles within the existing byte budget without importing the full public barrel.

## Last Updated

2026-09-26
