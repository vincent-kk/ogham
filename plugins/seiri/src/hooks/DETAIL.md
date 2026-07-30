# hooks — Contract

## Requirements

- 훅 5종 중 **어느 것도 차단하지 않고 어느 것도 규칙 본문을 나르지 않는다.** 규칙 파일은 하니스가 이미 로드하므로, 훅이 나르는 것은 파일이 스스로 말할 수 없는 것뿐이다.
- 어떤 실패에도 세션을 막지 않는다 — 최상위 try/catch 가 `{ continue: true }` 로 빠져나오고, 실패는 `logHookFailure` 로 기록한다. 조용한 실패는 없다.
- 훅 도달 코드는 **배럴을 import 하지 않는다.** concrete 파일만 쓰며, 빌드 캡과 metafile 이 재유입을 막는다.
- 검증 런타임(zod 등)·MCP SDK·glob 엔진을 훅 번들에 들이지 않는다.
- `@ogham/cross-platform/host-paths` 를 소비하지 않는다 — 호스트가 `CLAUDE_PLUGIN_ROOT` 와 세션 cwd 를 이미 준다. 경로 조합은 `compat` 경유다.
- 진입점은 `<name>/<name>.entry.ts` 이며, 활성 훅은 같은 이름으로 `hooks/hooks.json` 에 등록된다. `DORMANT_HOOKS` 는 빌드되되 미등록이며 wiring 테스트가 이를 강제한다.

## API Contracts

- `processSessionStart` — SessionStart: 활성 규칙·유효 다이얼·드리프트·선출 계약 주입.
- `processUserPromptSubmit` — UserPromptSubmit: 매 턴 선출 상기 + 워크플로우 상태 1절.
- `processToolOutcome` — PostToolUse(+Failure): Bash 실패 연쇄 신호와 Skill 로드 관측.
- `processSubagentStart` — SubagentStart: 상태 요약 축약 재주입.
- `processInstructionsLoaded` — InstructionsLoaded: 로드 관측(주입 0, dormant).

`index.ts` 는 훅 밖 소비자(테스트·타입체크)를 위한 배럴이다. 진입점은 이 배럴을 쓰지 않는다.

## Acceptance Criteria

### AC-hooks-never-block — 비차단 보장

- 모든 훅이 예외 상황에서도 `{ continue: true }` 를 반환한다.
- 어떤 훅도 `decision` 제어를 반환하지 않는다.

### AC-hooks-no-rule-body — 규칙 본문 비복제

- 훅 출력이 규칙 이름만 담고 배포된 문서 본문을 복제하지 않는다.

### AC-hooks-bundle-isolation — 번들 격리

- 훅 번들에 검증 런타임·MCP SDK·glob 엔진이 포함되지 않는다.
- 진입점에서 배럴 import 가 0건이다.

### AC-hooks-wiring — 등록 일치

- 활성 훅 이름이 `hooks/hooks.json` 등록과 일치하고, `DORMANT_HOOKS` 는 미등록으로 남는다.

## Last Updated

2026-07-30 — 훅 계층 계약을 문서화하고 훅 밖 소비자용 배럴을 명시했다.
