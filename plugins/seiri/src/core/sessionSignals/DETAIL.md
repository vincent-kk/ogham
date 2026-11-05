# sessionSignals — Contract

## Requirements

- 워크플로우 상태는 host/session/agent 해시별 파일이다. 위치는 소비 프로젝트의 런타임 디렉터리(`../../constants/files.ts`의 `CONFIG_DIR`·`SESSIONS_DIR`)이며 실행 중에 만들어지는 비추적 상태라 이 저장소에는 없다.
- `WorkflowBinding`은 `step?: WorkflowStep`을 갖는다. `WorkflowStep`은 아홉 체인 스킬 이름의 합집합이고, 그 중 `CHAIN_ENTRY_STEPS`(`write-plan`, `execute`, `implement`)만 새 바인딩을 만들 수 있고, 다른 task의 active 바인딩 교체는 `CHAIN_SWITCH_STEPS`(`write-plan`, `execute`)만 한다. `isWorkflowState`는 저장된 `step`이 `WorkflowStep` 멤버인지 검증하고, 실패하면 actor 상태 전체를 무효로 친다.
- start는 같은 task라도 재시작으로 취급하여 증거·카운터·진행 중 호출을 초기화한다. step과 resume은 같은 task의 기존 바인딩만 갱신하며 새 바인딩을 만들지 않는다(진입 step 예외는 위 계약을 따른다). implement가 다른 active task를 교체하지 못하게 하여 진행 중인 증거를 보존한다. 세부 전이 표와 결과 종류는 transitionWorkflow 및 테스트에서 확인한다.
- `observeBoundary(identity, enabled, now, { firstChild?, suspend? })`로 턴 경계를 관측한다. generation·invocations·seen 갱신은 항상 하고, `suspend`가 참일 때만 바인딩을 `suspended`로 만든다. 반환값은 같은 actor transaction 안에서 갱신 뒤 상태의 바인딩 스냅샷이며, 호출자는 이 스냅샷만으로 렌더한다(갱신 전 상태를 읽어 낡은 표시를 내지 않는다). 트랜잭션 예외는 `null`로 알려 바인딩 부재의 `undefined`와 구별하며, 실패한 턴에 무바인딩 안내가 주입되지 않게 한다. 존재하는 actor 파일의 읽기 오류도 트랜잭션 예외로 다루어 같은 격리 계약을 적용한다. 부재·손상·만료 상태는 바인딩 없음으로 다룬다.
- 진입 요청의 `observeInvocation`만 actor를 만들 수 있으며 `prepareDirectory`를 주입한다. `observeBoundary`는 actor를 만들지 않는다. 상태 파일이 없는 actor의 quarantine marker는 seed 트랜잭션이 지운다.
- SessionStart는 startup/resume/clear/fork에서 `observeBoundary(identity, false, now, { suspend: true })`(compact는 제외, 진행 중 호출 보존), UserPromptSubmit은 `suspend: !enabled`(off/advisory만 suspend)로 호출한다. main actor의 turn은 호스트의 native turn을 해시하며, 자식 actor의 turn은 `JSON.stringify(['agent', agent_id])`를 해시해 부모의 prompt/turn 변경과 독립적으로 유지한다. SubagentStart는 actor를 만들지 않으며 바인딩을 상속하지 않는다. 재개된 자식의 SubagentStart는 저장된 generation이 `0`보다 크면 anchor를 제거하고 generation을 올려 진행 중 호출을 폐기하며, `suspend: true`로 기존 바인딩을 suspend한다. 자식의 늦은 호출은 부모 turn 변경이 아니라 이 generation 경계로 무효화한다.
- 자식의 첫 턴 판정은 경계 갱신 전 자신의 상태를 무락·무쓰기로 읽는다. 부재·만료·읽기 실패·generation 0은 첫 턴으로 다루어 참여 이력이 없는 자식의 진입 기회를 보존한다.
- 부모 handoff 조회는 다른 actor에 잠금이나 쓰기를 가하지 않는다. 구조·TTL·quarantine·잠금·active 조건을 통과한 스냅샷만 반환하며 실패를 활성 참여로 추정하지 않는다.
- 상태 변경과 부수효과는 actor lock 내부에서 수행한다. lock 실패 시 무변경이며 actor→gate 순으로 잠근다. 두 파일 간 crash atomicity는 보장하지 않는다.
- 실패한 경계는 고유 토큰의 revocation marker로 quarantine을 남기고, suspend 의도가 있을 때만 sticky suspend marker를 함께 남긴다. 둘 중 하나라도 있으면 관측·완료·전이·바인딩 조회를 거부하며 다음 boundary만 복구할 수 있다. 복구는 남은 suspend 의도를 먼저 적용하고 generation 경계로 오래된 호출을 폐기한다. 커밋 성공 후 자신이 본 토큰과 여전히 같은 marker만 지워 동시 실패의 철회를 지우지 않는다. 재실패하면 quarantine을 유지한다. 다만 토큰 read와 unlink 사이의 재기록은 지워질 수 있고, actor와 marker를 모두 쓸 수 없으면 복구 뒤 과거 상태가 살아날 수 있다. 정확한 파일 처리 순서는 withWorkflowState와 경합 테스트에서 확인한다.
- actor는 7일 동안 관측되지 않으면 해당 actor 접근 시 트랜잭션 안에서 만료된다. invocation은 24시간 후 만료하며 명령·출력은 저장하지 않는다.
- 별도로 MCP 서버 시작 시 `sweepStaleActors`가 72시간(`IDLE_STATE_TTL`) 넘게 수정되지 않은 actor 묶음(상태, lock, marker, 임시 파일)을 actor lock 아래에서 다시 확인하고 삭제한다. git 추적·ignore 여부는 보지 않는다. `.json`이 없는 이름은 lock 없이 자기 mtime으로 판정해 삭제하며, 디렉터리의 하위 항목은 보지 않는다.
- 사용자 소유 ignore 파일은 수정하지 않는다. sessions 경로 제외가 명시적으로 확인되지 않으면 자동 상태 생성을 생략한다.
- 전이는 정확한 호출 ID·입력·actor·turn·generation에 대응하는 성공한 Post에서만 적용된다. `created`·`switched`는 generation을 올리고 진행 중 호출을 폐기하며, `step`·`resume`의 `updated`는 generation·invocations를 바꾸지 않는다. `pause`·`finish`의 `updated`는 `created`·`switched`와 같이 generation을 올리고 진행 중 호출을 폐기해 늦게 도착하는 결과를 무효화한다. 문서의 `paused`는 저장 상태 `suspended`(`types/workflow.ts`)를 가리킨다.
- **활성 바인딩의 잔여 범위(명시적 수용).** standard/strict에서 활성 바인딩은 같은 host·native session·actor의 후속 사용자 턴 전체에 유지된다. 다른 task로의 `start`·`write-plan`·`execute` 교체나 `pause`/`finish` 전까지는, 무관한 질문이나 진입 스킬을 거치지 않는 작업에도 이전 task의 진행 줄이 표시되고 그 사이의 일치하는 Bash 증거·실패 힌트가 이 바인딩에 쌓인다. 이 범위는 같은 session 안에서만 허용되며 다른 session·agent·host로는 상속되지 않는다(actor 해시가 분리하고, SessionStart가 세션 경계에서 suspend한다).

## API Contracts

- workflow store는 명시적 lifecycle와 Bash 관측을 같은 lock으로 결합한다. 훅 경계에서 host payload를 정규화하고 core에는 vendor-neutral identity만 전달한다.
- MCP 검증 응답 accepted는 요청 수락만 의미한다. 실제 참여 성공은 Post 훅 ACK로 확인한다.
- `sweepStaleActors(projectRoot, now)`는 배럴로 공개하는 MCP 시작 정리 진입점이며, 항목별 실패를 삼키고 다음 묶음을 처리한다.

## Acceptance Criteria

### AC-workflow-lifecycle — 참여 격리

- 바인딩 없는 일반 작업·Skill 읽기는 바인딩·원장·진행 줄을 만들지 않는다. dial 범위 안내(SessionStart 선출·체인, standard/strict의 활성 바인딩이 없는 턴의 진입 줄)는 훅 렌더 소관이다.
- main actor의 이전 native turn·자식의 이전 generation·다른 actor·교체 전 task의 호출 결과와 중복·역순·늦은 결과는 효과를 만들지 않는다. 부모의 native turn만 바뀐 자식 호출은 같은 generation 안에서 계속 유효하다. 비진입 `step`·`resume`·`pause`·`finish`가 다른 task를 가리키면 상태 변경 없이 짧은 불일치 결과만 돌려준다. 다른 task가 active일 때의 `implement` `step`도 같다.
- lock 획득 실패는 참여를 만들지 않는다. 경계 훅은 손상 파일을 그대로 두며, 진입 Pre가 손상·만료·generation 0 상태를 native turn으로 다시 seed한다. 유효하고 만료되지 않은 generation > 0 상태의 anchor는 도구 이벤트가 교체하지 않는다.
- 경계 훅만 지나간 actor는 파일이 없다. 비진입 Pre·Bash Pre도 파일을 만들지 않는다. 참여한 적 없는 자식은 재개 뒤에도 첫 턴으로 간주되어 handoff 줄을 다시 받고 진입 요청으로 참여할 수 있다.
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

actor 참여·호출 대응·경계 철회·보존 계약의 내용과 근거가 바뀔 때 갱신한다.
