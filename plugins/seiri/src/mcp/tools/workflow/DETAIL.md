# workflow — Contract

## Requirements

- 명시적 start/resume/pause/finish 요청을 검증한다. project_root와 kebab-case task는 필수이며 start/resume에는 change 또는 review intent가 필요하다.
- off/advisory는 disabled, 나머지는 accepted를 반환한다. 파일은 쓰지 않으며 accepted만으로 참여는 활성화되지 않는다.
- 실제 효과는 native Pre/Post 짝의 검증 뒤 훅이 적용한다. 모델이 actor/turn/call ID를 전달할 수 없다.

## API Contracts

- handleWorkflow는 WorkflowReply를 반환한다: disabled는 status와 effective dial(off/advisory)의 reason만, accepted는 status와 validated request의 action/task/intent를 담는다. invalid 입력은 오류다.

## Acceptance Criteria

### AC-workflow-request — Explicit contract

- 절대경로·task·action·intent가 잘못되면 요청을 거부한다.
- 상태 파일·원장은 생성하지 않고 다이얼의 비활성화를 보존한다.

## Last Updated

2026-09-26
