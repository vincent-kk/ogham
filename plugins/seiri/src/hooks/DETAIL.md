# hooks — Contract

## Requirements

- 훅은 비차단이며 규칙 본문·전역 상태 배너·선출 문구를 주입하지 않습니다. 비참여 작업과 무변화 이벤트는 wire stdout까지 비웁니다.
- 예외는 fail-open으로 처리하고 logHookFailure로 진단합니다. stdin deadline은 외부 timeout보다 짧습니다.
- off/advisory는 신규 관측·주입을 금지하지만 기존 참여의 신뢰되는 턴·세션 경계 철회는 허용합니다.
- 훅은 concrete 내부 파일만 import하고 검증 런타임·MCP SDK·glob 엔진을 포함하지 않습니다. 공유 패키지는 공개 진입점으로 사용합니다.
- 호스트는 build 시 선택하고 compiler가 Codex 전용 runtime 경로를 가리킵니다. 해당 호스트의 Claude prompt_id 또는 Codex turn_id, 공통 tool_use_id 및 native agent_id를 경계에서 정규화합니다. 누락한 identity나 vendor를 모델 인자·프롬프트·runtime 추론으로 보충하지 않습니다.
- 실행 진입점과 정적 manifest 등록은 wiring 검사로 맞춥니다. dormant InstructionsLoaded는 빌드되지만 등록하지 않습니다.

## API Contracts

- SessionStart는 startup/resume/clear/fork에서 기존 참여를 무효화하고 compact를 유지합니다.
- UserPromptSubmit은 최신 native-turn anchor를 기록하고 이전 binding을 suspend하며 항상 침묵합니다.
- SubagentStart는 부모 binding 없이 자식의 첫 anchor만 생성합니다.
- PreToolUse는 기존 anchor와 일치하는 workflow/Bash invocation만 기록하며 권한 결정·입력수정을 하지 않습니다.
- PostToolUse와 Claude Failure는 정확한 paired invocation의 현재 generation/actor/task에만 효과를 적용합니다. workflow 성공은 ACK, Bash는 활성 task의 증거/실패 변화만 제공합니다.
- 훅 밖 소비자는 공개 배럴을 사용할 수 있으나 executable entry는 concrete 구현을 사용합니다.

## Acceptance Criteria

### AC-hooks-never-block — 비차단 보장

- 모든 훅이 예외 상황에서도 `{ continue: true }` 를 반환한다.
- 어떤 훅도 `decision` 제어를 반환하지 않는다.

### AC-hooks-off-skip — skills-only wire 침묵

- off/advisory에서 새 관측·주입은 없고 기존 참여의 신뢰되는 경계 철회만 허용합니다.
- `additionalContext`가 없는 결과는 exit 0과 빈 stdout으로 끝나며 통과 JSON을 남기지 않는다.

### AC-hooks-no-rule-body — 규칙 본문 비복제

- 훅은 배포 규칙 본문이나 전역 규칙 상태를 복제하지 않습니다.

### AC-hooks-bundle-isolation — 번들 격리

- 훅 번들에 검증 런타임·MCP SDK·glob 엔진이 포함되지 않는다.
- post-tool-use만 20KiB이며 나머지는 16KiB 상한입니다. 호출 귀속·원자 상태·원장 판정을 한 진입점에서 수행하는 비용을 측정하여 허용한 예외이며 금지 의존 검사는 그대로 적용합니다.
- 진입점에서 배럴 import 가 0건이다.

### AC-hooks-wiring — 등록 일치

- 활성 훅 이름이 `hooks/hooks.json` 등록과 일치하고, `DORMANT_HOOKS` 는 미등록으로 남는다.
- Codex 전용 훅 파일은 지원 이벤트만 가지며 build 때 Codex adapter로 고정한 handler bundle을 가리킨다. Claude 정본 경로와 원본은 변경하지 않는다.

### AC-hooks-host-shape — 공통 입력과 출력

- 두 호스트의 native identity와 응답 envelope를 정규화한 뒤 같은 유효 참여·호출 대응에 같은 효과를 적용합니다. 부재 필드를 추정하여 권한을 넓히지 않습니다.

### AC-hooks-deadline-headroom — fail-open 종료 여유

- stdin fail-open deadline은 이를 사용하는 모든 활성 훅의 외부 timeout보다 짧다.

## History

- 2026-09-05 — stdin fail-open과 외부 훅 timeout 사이에 종료 여유를 추가했다. 같은 deadline이면 타이머가 입력을 놓은 뒤에도 호스트가 파싱·출력 전에 프로세스를 죽일 수 있기 때문이다.

## Last Updated

2026-09-26 — 명시적 조건부 참여와 비차단 호스트 계약을 반영했습니다.
