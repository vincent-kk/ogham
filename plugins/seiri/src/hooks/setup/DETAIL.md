# setup — Contract

## Requirements

- 세션 시작 시 활성 규칙·유효 다이얼·드리프트·선출 계약을 주입한다. 읽기 전용이며 `.claude/rules/` 와 `.seiri/` 에 쓰지 않는다.
- 다이얼은 **훅 참여와 렌더 분량**을 바꾼다. 배포되는 문서는 바꾸지 않는다.
  - off — 규칙 상태를 읽기 전 완전 skip, wire stdout 없음.
  - advisory — 활성 규칙·drift·설정 경고만 허용.
  - 배포 0건 — standard 이상에서 선출 줄만.
  - standard — 다이얼 + 규율 체인 + 선출.
  - strict — 위에 우선순위와 완료 계약을 더한다.
- off가 아닐 때 드리프트 경고와 다이얼 파일 무시 경고는 개입 강도와 무관하게 항상 렌더한다.
- 유효 다이얼에 밸브가 살아 있으면 출처와 기준선을 명시한다 — advisory 로 **내린** 밸브도 마찬가지다.
- 플러그인 루트는 `process.env.CLAUDE_PLUGIN_ROOT` 이며 부재 시 무주입이다. Codex도 플러그인 훅에 이 호환 변수를 제공한다.
- 동작에 쓰는 입력은 두 호스트 공통의 `cwd`·`session_id`·`hook_event_name`이며 Codex 추가 필드는 결과를 바꾸지 않는다.
- 매니페스트 로드 실패는 우리 쪽 빌드 결함이므로 무주입으로 흡수한다 — 그것 때문에 세션을 죽이지 않는다.
- 규칙 이름만 말하고 내용은 말하지 않는다.

## API Contracts

- `processSessionStart(input: SessionStartInput): HookOutput` — `off`를 먼저 판정하고, 나머지는 상태 요약을 렌더해 주입한다. 실패해도 `{ continue: true }`.
- 렌더는 `../shared/renderStatusLines.ts` 가 담당한다(훅 2개 공용, 단위 테스트 대상).

## Acceptance Criteria

### AC-render-budget — 렌더 분량 상한

- standard 총량이 5줄 이하다.
- strict 총량이 6줄 이하이며, 경고·드리프트를 포함해도 9줄을 넘지 않는다.

### AC-dial-silence — 다이얼별 참여 규칙

- off 에서 규칙 상태를 읽지 않고 아무것도 주입하지 않는다.
- advisory 에서는 workflow 선출 없이 상태만 주입한다.
- 배포 0건에서는 standard 이상에서 선출 줄만 남는다.

### AC-setup-readonly — 읽기 전용

- 훅 실행이 `.claude/rules/` 와 `.seiri/` 에 쓰기를 일으키지 않는다.
- Codex 추가 필드가 있어도 같은 상태에서 Claude 형태와 같은 `hookEventName`·`additionalContext`를 반환한다.

## Last Updated

2026-09-03 — `off` 조기 skip과 advisory status-only 계약을 분리했다.
