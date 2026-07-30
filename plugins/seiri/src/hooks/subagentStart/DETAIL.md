# subagentStart — Contract

## Requirements

- 서브에이전트는 부모의 SessionStart 컨텍스트를 물려받지 않는다. 아무것도 하지 않으면 프로젝트가 무엇에 옵트인했는지 모른 채 일하므로, 축약 상태를 재주입한다.
- 렌더는 `shared/renderStatusLines` 의 `compact` 모드이며 **최대 2줄**(활성 규칙 + 선출 계약)이다. 렌더 로직을 복제하지 않는다 — 부모 렌더가 바뀌면 축약본도 같은 함수에서 나온다.
- **선출 줄은 규칙 배포와 분리된다.** 게이팅은 다이얼뿐이라 배포 0건이면 활성 규칙 줄만 빠지고 선출 줄은 남는다.
- 드리프트·저장 파일 경고·우선순위 사슬은 넣지 않는다. 앞의 둘은 부모 몫이고 우선순위는 서브에이전트가 읽는 규칙 파일에 있다.
- advisory 면 완전 침묵이다.
- 규칙 이름만 말한다. 매 스폰마다 본문을 복제하면 SessionStart 가 피하는 이중 비용을 서브에이전트 수만큼 곱한다.
- 읽기 전용이다 — `.claude/rules/` 와 `.seiri/` 에 쓰지 않는다.
- stdin 타임아웃(`shared/readStdin`)이 방어선이다. 일부 환경은 훅의 stdin 을 닫지 않으며, 스폰을 막는 훅은 있어서는 안 된다.

## API Contracts

- `processSubagentStart(input: SubagentStartInput): HookOutput` — 축약 상태를 렌더해 주입한다. 어떤 실패에도 `{ continue: true }`.

## Acceptance Criteria

### AC-compact-budget — 축약 분량

- 주입이 2줄을 넘지 않는다.

### AC-election-line-independence — 선출 줄 독립

- 규칙 배포가 0건이어도 선출 줄이 남는다.
- advisory 에서는 두 줄 모두 나오지 않는다.

### AC-spawn-non-blocking — 스폰 비차단

- stdin 이 닫히지 않는 환경에서도 타임아웃으로 빠져나와 스폰을 지연시키지 않는다.

## Last Updated

2026-07-30 — 서브에이전트 상태 재주입 계약을 문서화했다.
