# sessionSignals — Contract

## Requirements

- 워크플로우 상태는 host/session/agent 해시별 파일이다. 위치는 소비 프로젝트의 런타임 디렉터리(`../../constants/files.ts`의 `CONFIG_DIR`·`SESSIONS_DIR`)이며 실행 중에 만들어지는 비추적 상태라 이 저장소에는 없다.
- UserPromptSubmit은 standard/strict에서 바인딩이 없어도 native-turn anchor를 만들고 기존 작업은 suspend한다. off/advisory에서는 기존 anchor만 무효화한다. Pre/Post는 anchor를 만들거나 교체하지 않는다.
- SubagentStart는 자식 자신의 최초 anchor만 만든다. 부모 작업은 상속하지 않으며 새 경계를 알 수 없는 자식 재개에는 자동 보조를 하지 않는다.
- startup/resume/clear/fork는 기존 actor를 무효화한다. compact는 유지한다.
- start/resume/pause/finish는 정확한 호출 ID·입력·actor·turn·generation에 대응하는 성공한 Post에서만 적용된다. 바인딩 변경은 generation을 올리고 진행 중 호출을 폐기한다. start가 아닌 액션이 바인딩된 것과 다른 task를 지정하면 `mismatch`이며 바인딩·generation·invocations를 전혀 건드리지 않는다; 훅은 이때 한 줄의 불일치 안내만 주입한다.
- 상태 변경과 부수효과는 actor lock 내부에서 수행한다. lock 실패 시 무변경이며 actor→gate 순으로 잠근다. 두 파일 간 crash atomicity는 보장하지 않는다.
- 경계 무효화 저장 실패 시 revocation marker를 시도한다. marker는 같은 세션에서 해제하지 않는다. 상태와 marker 모두 쓸 수 없는 경우 복구 후 과거 상태가 살아날 수 있다는 한계는 남는다.
- actor는 7일 비활성, invocation은 24시간 후 만료하며 해당 actor 접근 시에만 정리한다. 명령·출력은 저장하지 않는다. 사용자 원장은 삭제하지 않는다.
- 사용자 소유 ignore 파일은 수정하지 않는다. sessions 경로 제외가 명시적으로 확인되지 않으면 자동 상태 생성을 생략한다.

## API Contracts

- workflow store는 명시적 lifecycle와 Bash 관측을 같은 lock으로 결합한다. 훅 경계에서 host payload를 정규화하고 core에는 vendor-neutral identity만 전달한다.
- MCP 검증 응답 accepted는 요청 수락만 의미한다. 실제 참여 성공은 Post 훅 ACK로 확인한다.

## Acceptance Criteria

### AC-workflow-lifecycle — 참여 격리

- 바인딩 없는 일반 작업·Skill 읽기에는 주입·원장 변경이 없다.
- 새 turn, 다른 actor, 교체된 task, 중복·역순·늦은 결과가 이전 작업 효과를 만들지 않는다. resume/pause/finish가 다른 task를 가리키면 상태 변경 없이 짧은 불일치 결과만 돌려준다.
- lock 획득 실패와 손상 파일은 자동 참여를 만들지 않는다.

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
