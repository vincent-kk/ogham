# hooks — Contract

## Requirements

- 훅은 비차단이며 규칙 본문은 주입하지 않습니다. standard/strict의 SessionStart는 선출 문구·체인 한 줄·활성 규칙 요약·다이얼·drift를 주입합니다(선출·posture·규칙 요약은 `hooks/setup/render/`; SessionStart의 체인 한 줄은 `WORKFLOW_CHAIN_LINE`(`constants/workflowChain.ts`)를 `renderPostureLines`로 얻고, 진행 줄·진행-줄 형식 ACK·subagent 줄은 `hooks/shared/progressLine/`의 concrete 파일에서 가져옵니다). 진입 `step`이나 `start`로 바인딩이 생기면 PostToolUse는 `created`·`switched`에서, UserPromptSubmit은 활성 바인딩이 있는 매 턴에, SubagentStart는 부모 main의 활성 바인딩이 있을 때 1회 진행 줄을 주입하고, strict UserPromptSubmit은 활성 바인딩이 없으면(paused 포함) 체인 한 줄을 주입합니다. off/advisory와 주입 대상이 없는 이벤트는 wire stdout까지 비웁니다.
- 예외는 fail-open으로 처리하고 logHookFailure로 진단합니다. stdin deadline은 외부 timeout보다 짧습니다.
- off/advisory는 신규 관측·주입을 금지하지만 기존 참여의 신뢰되는 턴·세션 경계 철회는 허용합니다.
- 훅은 concrete 내부 파일만 import하고 검증 런타임·MCP SDK·glob 엔진을 포함하지 않습니다. 공유 패키지는 공개 진입점으로 사용합니다.
- 호스트는 build 시 선택하고 compiler가 Codex 전용 runtime 경로를 가리킵니다. 해당 호스트의 Claude prompt_id 또는 Codex turn_id, 공통 tool_use_id 및 native agent_id를 경계에서 정규화합니다. 누락한 identity나 vendor를 모델 인자·프롬프트·runtime 추론으로 보충하지 않습니다.
- 실행 진입점과 정적 manifest 등록은 wiring 검사로 맞춥니다. dormant InstructionsLoaded는 빌드되지만 등록하지 않습니다.

## API Contracts

- SessionStart는 startup/resume/clear/fork에서 기존 바인딩을 suspend하고(`suspendActor(identity, now)`) compact를 유지하며, standard/strict에서 선출·체인·규칙 요약·다이얼·drift를 주입합니다. 규칙 상태를 읽지 못해도 선출·체인 줄은 나옵니다.
- UserPromptSubmit은 최신 native-turn anchor를 기록합니다. off/advisory는 이전 binding을 suspend하고(`suspend: !enabled`) 항상 침묵하며, standard/strict는 suspend하지 않고 활성 바인딩이 있으면 진행 줄을(standard의 paused 바인딩은 무주입), strict는 활성 바인딩이 없으면(paused 포함) 체인 한 줄을 주입합니다.
- SubagentStart는 부모 binding을 상속하지 않고 자식의 첫 anchor만 생성합니다. 부모가 main actor이고 활성 바인딩이 있으면(`readActorBinding`, 무락·무쓰기) 진행 줄을 1회 주입합니다.
- PreToolUse는 기존 anchor와 일치하는 runtime 참여 액션(`step`·`start`·`resume`·`pause`·`finish`; `dial`은 제외)이나 Bash invocation만 기록하며 권한 결정·입력수정을 하지 않습니다.
- PostToolUse와 Claude Failure는 정확한 paired invocation의 현재 generation/actor/task에만 효과를 적용합니다. runtime의 `created`·`switched`는 진행 줄 형식 ACK, `mismatch`는 안내 문구를 내고, `rejected`는 무주입입니다. `updated`는 같은 task `step`이면 무주입이고, `resume`·`pause`·`finish`는 기존 control-verb ACK 문구로 응답합니다. Bash는 활성 task의 증거/실패 변화만 제공합니다.
- 훅 밖 소비자는 공개 배럴을 사용할 수 있으나 executable entry는 concrete 구현을 사용합니다.

## Acceptance Criteria

### AC-hooks-never-block — 비차단 보장

- 모든 훅이 예외 상황에서도 `{ continue: true }` 를 반환한다.
- 어떤 훅도 `decision` 제어를 반환하지 않는다.

### AC-hooks-off-skip — skills-only wire 침묵

- off/advisory에서 새 관측·주입은 없고 기존 참여의 신뢰되는 경계 철회만 허용합니다.
- `additionalContext`가 없는 결과는 exit 0과 빈 stdout으로 끝나며 통과 JSON을 남기지 않는다.

### AC-hooks-no-rule-body — 규칙 본문 비복제

- 훅은 배포 규칙 본문을 복제하지 않습니다. standard/strict SessionStart의 규칙 요약은 이름·상태만 내며 본문을 담지 않습니다.

### AC-hooks-bundle-isolation — 번들 격리

- 훅 번들에 검증 런타임·MCP SDK·glob 엔진이 포함되지 않는다.
- setup과 post-tool-use는 metafile의 모든 모듈에 호출 경로(전체 import 사슬)를 기록하고 경로 없는 모듈을 제거한 뒤 실측값 바로 위 KiB를 상한으로 둡니다. 나머지 훅은 16KiB를 유지합니다. 금지 의존 검사는 그대로 적용합니다.
- 진입점에서 배럴 import 가 0건이다.
- user-prompt-submit·post-tool-use·subagent-start 번들에는 `/Election/` 리터럴이 없다(선출 문구는 `hooks/setup/render/` 전용). post-tool-use 번들에는 `/A plan was produced/` 리터럴이 없다.

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
