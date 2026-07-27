# userPromptSubmit — Filid 1.0 Contract

## Requirements

- FCA 프로젝트의 user prompt마다 turn-scoped fractal map을 초기화하고 delivery TTL turn을 증가시킨다.
- 세션 첫 prompt에만 FCA 규칙 위치, 언어 태그와 비활성 규칙 요약을 주입한다.
- branch, spike lifecycle, harvest 상태 또는 agent 역할 배너를 prompt context에 추가하지 않는다.
- 비-FCA 프로젝트와 유효하지 않은 cwd는 상태를 변경하지 않고 통과시킨다.

## API Contracts

- `handleUserPromptSubmit(input): HookOutput` — map reset과 turn 증가 후 session-first context 결과를 반환한다.
- 반환값은 항상 `continue: true`이며 user prompt를 차단하지 않는다.
- prompt context cache가 이미 존재하면 추가 context 없이 통과한다.

## Acceptance Criteria

### AC-prompt-session-first — 세션 최초 주입

- 첫 prompt는 FCA pointer와 `[filid:lang]`을 포함하고 같은 session의 두 번째 prompt는 조용히 통과한다.
- 서로 다른 session은 독립적으로 최초 context를 전달한다.

### AC-prompt-no-mode-banner — 모드 비의존성

- spike 이름의 branch에서도 첫 prompt 출력은 session-first FCA context만 포함한다.
- 이후 prompt에는 spike/harvest 관련 배너가 다시 주입되지 않는다.

## Last Updated

2026-07-27 — spike banner를 제거한 session-first 1.0 계약으로 재구성했다.
