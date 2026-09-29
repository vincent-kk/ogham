# runtime — Contract

## Requirements

- 명시적 `step`·`start`·`resume`·`pause`·`finish` 요청을 검증한다. project_root와 kebab-case task는 필수이다. start/resume에는 change 또는 review intent가 필요하다. `step`은 아홉 `WorkflowStep` 중 하나인 `step` 값이 필요하고 intent는 선택이다: 생략하면 `parseWorkflowRequest`가 review-plan·request-review·receive-review → `review`, 나머지 → `change`로 유도하며 명시 intent가 우선한다.
- off/advisory는 참여 액션에서 disabled, 나머지는 accepted를 반환한다. 파일은 쓰지 않으며 accepted만으로 참여는 활성화되지 않는다. `dial`은 유효 다이얼 값과 무관하게 항상 동작한다.
- 실제 효과는 native Pre/Post 짝의 검증 뒤 훅이 적용한다. 모델이 actor/turn/call ID를 전달할 수 없다.
- `dial`(`dial_op`: get/set/clear, `intervention`)은 훅 짝 없이 gitignore된 런타임 밸브 파일(`RUNTIME_FILE`)을 즉시 조회·설정·해제한다. 참여 액션은 입력만 검증하며, `dial`은 그 밸브 파일만 쓴다.
- 입력 스키마는 평면 zod shape이다: `action`은 `step`·`start`·`resume`·`pause`·`finish`·`dial` 여섯 값의 enum, `project_root`는 필수, `task`·`step`·`intent`·`dial_op`·`intervention`은 optional/nullish다. 액션별 필수 필드는 핸들러가 강제한다.

## API Contracts

- `handleRuntime`이 도구의 진입점이다: `action`으로 분기해 `dial`은 `applyDial`로, 나머지는 `handleWorkflow`로 보낸다.
- `handleWorkflow`는 참여 액션(`step`·`start`·`resume`·`pause`·`finish`)의 `WorkflowReply`를 반환한다: disabled는 status와 effective dial(off/advisory)의 reason만, accepted는 status와 validated request의 action/task/step?/intent에 `notice` 문자열을 더해 담는다. invalid 입력은 오류다.
- `notice`는 accepted 응답마다 붙는 스킬 호출 안내다. MCP 서버는 호출 주체가 스킬 안에 있는지 알 수 없으므로 매번 같은 조건문을 돌려준다: `step` 요청은 `seiri:<step>` 스킬을 이름으로 지목하고, 나머지 액션은 현재 단계의 seiri 스킬을 가리킨다. 이번 턴에 그 스킬을 호출하지 않았다면 다른 도구 이전에 Skill 도구로 호출하라는 문장이다. 훅의 ACK 매칭(`workflowAccepted`)은 action/task/step/intent만 비교하므로 `notice`에 영향받지 않는다.
- 도구 설명문과 입력 스키마 설명은 최소로 유지한다: 참여 액션은 그 단계를 소유한 seiri 스킬을 호출한 뒤 그 스킬 안에서만 부른다는 진입 규칙, 필드별 필수 조건, `dial`의 역할만 적는다. 진입 스텝·전환·바인딩 규칙은 각 `SKILL.md`와 `workflow-lifecycle.md`가 정본이며 설명문에 중복하지 않는다.
- `applyDial`는 `dial` 액션을 처리해 `{ action: 'dial', op, changed, dial, posture }`를 반환한다. `dial_op: set`은 유효한 `intervention`을 요구한다.

## Acceptance Criteria

### AC-workflow-request — Explicit contract

- 절대경로·task·action·intent가 잘못되면 요청을 거부한다.
- 상태 파일·원장은 생성하지 않고 다이얼의 비활성화를 보존한다.
- accepted 응답은 항상 `notice`를 담는다. `step` 요청의 notice는 `seiri:<step>`을 이름으로 지목하고, 다른 액션의 notice는 현재 단계의 seiri 스킬을 가리킨다.

### AC-dial-no-side-effects — dial은 참여 상태를 만들지 않음

- `dial` 호출은 invocation·ACK·actor 파일을 만들지 않는다.
- `dial`은 런타임 밸브 파일(`RUNTIME_FILE`) 외에는 아무것도 쓰지 않는다.

## History

- 2026-09-29 — accepted 응답에 `notice`를 추가하고 도구 설명문을 최소화했다. 이유: 모델이 스킬을 호출하지 않고 runtime `step`만 직접 불러 바인딩을 만들어도 훅이 정상 진입으로 받았고, 상세한 설명문이 그 지름길을 스스로 안내했다. 스킬 호출 여부는 MCP가 알 수 없으므로 응답마다 안내를 싣는다.

## Last Updated

2026-09-29
