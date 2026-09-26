# sessionSignals — Contract

## Requirements

- 워크플로우 상태는 host/session/agent 해시별 파일이다. 위치는 소비 프로젝트의 런타임 디렉터리(`../../constants/files.ts`의 `CONFIG_DIR`·`SESSIONS_DIR`)이며 실행 중에 만들어지는 비추적 상태라 이 저장소에는 없다.
- `WorkflowBinding`은 `step?: WorkflowStep`을 갖는다. `WorkflowStep`은 아홉 체인 스킬 이름의 합집합이고, 그 중 `CHAIN_ENTRY_STEPS`(`write-plan`, `execute`)만 새 바인딩을 만들 수 있다. `isWorkflowState`는 저장된 `step`이 `WorkflowStep` 멤버인지 검증하고, 실패하면 actor 상태 전체를 무효로 친다.
- `step`·`start`·`resume`의 전이는 이전 상태 × 요청의 조합으로 `created`·`switched`·`updated`·`mismatch`·`rejected` 중 하나를 반환한다. 바인딩이 없을 때 진입 `step`이나 `start`는 `created`, 비진입 `step`은 `rejected`(상태 불변, 무주입), `resume`도 `rejected`(새 바인딩을 만들지 않음)다. 같은 task에 대한 `start`는 `updated`가 아니라 `created`다 — 처음부터 다시 시작하는 것으로 취급해 바인딩을 새로 만들고 counts·verdicts·generation을 초기화한다. 같은 task의 active/paused에 대한 `step`·`resume`은 `updated`(paused는 active로 복귀, `step`만 갱신, generation·invocations 불변)다. 다른 task에 대한 진입 `step`·`start`는 `switched`(counts·verdicts 초기화)이고, 비진입 `step`·`resume`·`pause`·`finish`는 `mismatch`(상태 불변)다.
- `observeBoundary(identity, enabled, now, { firstChild?, suspend? })`로 턴 경계를 관측한다. generation·invocations·seen 갱신은 항상 하고, `suspend`가 참일 때만 바인딩을 `suspended`로 만든다. 반환값은 같은 actor transaction 안에서 갱신 뒤 상태의 바인딩 스냅샷이며, 호출자는 이 스냅샷만으로 렌더한다(갱신 전 상태를 읽어 낡은 표시를 내지 않는다).
- 생성 가능한 호출은 `observeBoundary`뿐이며 `prepareDirectory`를 주입한다. `suspendActor`는 생성 경로 없이 suspend만 한다.
- SessionStart는 startup/resume/clear/fork에서 `suspend: true`(compact는 제외, 진행 중 호출 보존), UserPromptSubmit은 `suspend: !enabled`(off/advisory만 suspend)로 호출한다. main actor의 turn은 호스트의 native turn을 해시하며, 자식 actor의 turn은 `JSON.stringify(['agent', agent_id])`를 해시해 부모의 prompt/turn 변경과 독립적으로 유지한다. SubagentStart는 자식 자신의 최초 anchor만 만들며 바인딩을 상속하지 않는다. 재개된 자식의 SubagentStart는 저장된 generation이 `0`보다 크면 anchor를 제거하고 generation을 올려 진행 중 호출을 폐기하며, `suspend: true`로 기존 바인딩을 suspend한다. 자식의 늦은 호출은 부모 turn 변경이 아니라 이 generation 경계로 무효화한다.
- `isFirstChildTurn(identity, now)`는 `observeBoundary`가 같은 파일을 갱신하기 전에 자식 자신의 상태 파일을 무락으로 읽어, 파일이 없거나 TTL을 넘겼거나 저장된 generation이 `0`이면 첫 턴으로 본다(쓰기는 하지 않음). 읽기 실패도 첫 턴으로 본다.
- `readActorBinding(identity, now)`는 무락·무쓰기로 다른 actor(부모 `host + session_id + 'main'`)의 상태 파일을 읽어, 구조 검증·TTL·`.revoked`·`.revoked-suspend`를 통과하고 `state === 'active'`인 스냅샷만 반환한다. 잠금 중이거나 읽기 실패면 아무것도 반환하지 않는다.
- 상태 변경과 부수효과는 actor lock 내부에서 수행한다. lock 실패 시 무변경이며 actor→gate 순으로 잠근다. 두 파일 간 crash atomicity는 보장하지 않는다.
- 경계 트랜잭션이 lock을 얻지 못하거나 상태 저장에 실패하면 고유 토큰(`randomUUID()`)을 내용으로 하는 revocation marker(`.revoked`)를 시도하고, 그 경계 자신의 suspend 의도가 참이면 같은 방식의 sticky marker(`.revoked-suspend`)도 함께 쓴다 — 이 두 번째 marker는 suspend 의도가 거짓일 때는 절대 쓰지 않는다. 두 marker 중 하나라도 있는 동안 non-boundary 트랜잭션(관측·완료·전이)과 `readActorBinding`은 계속 거부한다(quarantine) — `.revoked`만 지워지고 `.revoked-suspend`가 남아 있어도 quarantine은 풀리지 않는다. 같은 actor의 다음 boundary 트랜잭션(`observeBoundary`, `suspendActor`)만은 marker가 있어도 실행되며, lock을 얻자마자 두 marker의 토큰을 각각 읽어 둔다. `.revoked-suspend`를 보았다면(바인딩이 있을 때) 콜백 실행 전에 바인딩을 `suspended`로 먼저 만든 뒤, 평소의 경계 효과(generation 증가, invocations·seen 초기화 — 실패 이전에 기록된 모든 것을 폐기)를 수행한다. 커밋에 성공하면 각 marker는 자신이 lock 획득 직후 본 토큰과 현재 내용이 같을 때만 지운다 — 트랜잭션 도중 다른 실패한 경계가 같은 marker를 새 토큰으로 다시 썼다면(동시 경합), 그 marker는 지우지 않고 남긴다. 다만 read와 unlink 사이의 극히 짧은 창에서 다시 쓰인 marker는 지워질 수 있다 — 토큰 비교는 그 창 밖의 경합만 막는다. 이 회복 경계 자체가 다시 실패하면(lock 재충돌 또는 storage 지속 실패) marker는 그대로 남는다(자신의 suspend 의도로 `.revoked-suspend`를 새로 쓸 수도 있다). 상태와 marker 모두 쓸 수 없는 경우 복구 후 과거 상태가 살아날 수 있다는 한계는 남는다.
- actor는 7일 동안 관측되지 않으면 해당 actor 접근 시 트랜잭션 안에서 만료된다. invocation은 24시간 후 만료하며 명령·출력은 저장하지 않는다.
- 별도로 MCP 서버 시작 시 `sweepStaleActors`가 72시간(`IDLE_STATE_TTL`) 넘게 수정되지 않은 actor 묶음(상태, lock, marker, 임시 파일)을 actor lock 아래에서 다시 확인하고 삭제한다. git 추적·ignore 여부는 보지 않는다. `.json`이 없는 이름은 lock 없이 자기 mtime으로 판정해 삭제하며, 디렉터리의 하위 항목은 보지 않는다.
- 사용자 소유 ignore 파일은 수정하지 않는다. sessions 경로 제외가 명시적으로 확인되지 않으면 자동 상태 생성을 생략한다.
- 전이는 정확한 호출 ID·입력·actor·turn·generation에 대응하는 성공한 Post에서만 적용된다. `created`·`switched`는 generation을 올리고 진행 중 호출을 폐기하며, `step`·`resume`의 `updated`는 generation·invocations를 바꾸지 않는다. `pause`·`finish`의 `updated`는 `created`·`switched`와 같이 generation을 올리고 진행 중 호출을 폐기해 늦게 도착하는 결과를 무효화한다. 문서의 `paused`는 저장 상태 `suspended`(`types/workflow.ts`)를 가리킨다.
- **활성 바인딩의 잔여 범위(명시적 수용).** standard/strict에서 활성 바인딩은 같은 host·native session·actor의 후속 사용자 턴 전체에 유지된다. 다른 task로의 진입 `step` 교체나 `pause`/`finish` 전까지는, 무관한 질문이나 진입 스킬을 거치지 않는 작업에도 이전 task의 진행 줄이 표시되고 그 사이의 일치하는 Bash 증거·실패 힌트가 이 바인딩에 쌓인다. 이 범위는 같은 session 안에서만 허용되며 다른 session·agent·host로는 상속되지 않는다(actor 해시가 분리하고, SessionStart가 세션 경계에서 suspend한다).

## API Contracts

- workflow store는 명시적 lifecycle와 Bash 관측을 같은 lock으로 결합한다. 훅 경계에서 host payload를 정규화하고 core에는 vendor-neutral identity만 전달한다.
- MCP 검증 응답 accepted는 요청 수락만 의미한다. 실제 참여 성공은 Post 훅 ACK로 확인한다.
- `sweepStaleActors(projectRoot, now)`는 배럴로 공개하는 MCP 시작 정리 진입점이며, 항목별 실패를 삼키고 다음 묶음을 처리한다.

## Acceptance Criteria

### AC-workflow-lifecycle — 참여 격리

- 바인딩 없는 일반 작업·Skill 읽기는 바인딩·원장·진행 줄을 만들지 않는다. dial 범위 안내(SessionStart 선출·체인, strict의 활성 바인딩이 없는 턴의 체인 한 줄)는 훅 렌더 소관이다.
- main actor의 이전 native turn·자식의 이전 generation·다른 actor·교체 전 task의 호출 결과와 중복·역순·늦은 결과는 효과를 만들지 않는다. 부모의 native turn만 바뀐 자식 호출은 같은 generation 안에서 계속 유효하다. 비진입 `step`·`resume`·`pause`·`finish`가 다른 task를 가리키면 상태 변경 없이 짧은 불일치 결과만 돌려준다.
- lock 획득 실패와 손상 파일은 자동 참여를 만들지 않는다.
- 배포 훅의 프로세스 간 검증은 두 Pre 관측 뒤 Post를 정방향·역방향으로 처리하여 호출과 카운터 보존을 확인합니다. actor lock을 명시적으로 유지한 별도 경우에는 동시 Post가 상태를 바꾸지 않고 종료하며, 잠금 해제 후 같은 Post를 다시 전달하면 정상 처리됨을 확인합니다. CI는 임의 동시 실행이 항상 잠금 제한 시간 안에 성공한다고 가정하지 않습니다.
- `resume`은 기존 바인딩(같은 task의 active 또는 paused)만 갱신하며 새 바인딩을 만들지 않는다.

### AC-workflow-observations — 작업 범위 증거

- active task에만 CHECK 증거를 기록하고 동일 판정/증거는 재알림하지 않는다. regression과 agent provenance는 유지한다.
- 반복 실패 카운터는 actor/task별이며 의도된 red를 차단하지 않는다.

### AC-workflow-retention — 유휴 actor 정리

- 72시간 초과 묶음은 삭제되며 구성원 하나라도 72시간 이내이면 전체가 남는다. 정확히 72시간이면 남는다.
- actor lock을 얻지 못하면 남는다.
- 상태 파일을 marker·임시 파일보다 먼저 삭제하며, 상태 파일 삭제에 실패하면 quarantine marker를 남긴다.
- 사라진 구성원은 건너뛰며 심볼릭 링크를 따라가지 않고 `.seiri/sessions` 밖은 건드리지 않는다.

## Boundary Exemptions

### `workflow` — hook bundle isolation

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: Concrete imports keep optional hook bundles within the existing byte budget without importing the full public barrel.

## Last Updated

2026-09-27
