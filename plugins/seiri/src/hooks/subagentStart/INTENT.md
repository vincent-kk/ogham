# subagentStart — 서브에이전트 상태 재주입

## Purpose

스폰되는 서브에이전트에게 **이 저장소가 무엇을 켰는지**를 축약해 알린다. 서브에이전트는 부모의 SessionStart 컨텍스트를 물려받지 않아, 아무것도 안 하면 프로젝트가 옵트인한 사실 자체를 모른 채 일한다.

## Structure

- `subagentStart.ts` — `processSubagentStart` (축약 렌더 재사용)
- `subagentStart.entry.ts` — 번들 진입점 (`bridge/subagent-start.mjs`)

## Conventions

- 렌더는 `shared/renderStatusLines` 의 `compact` 모드 — **최대 2줄** (활성 규칙 + 선출 계약). 렌더 로직을 복제하지 않는다.
- **선출 줄은 규칙 배포와 분리** — 게이팅은 다이얼뿐이라 배포 0건이면 활성 규칙 줄만 빠지고 선출 줄은 남는다. 순간의 주인은 워크플로우가 갖는다.
- 드리프트·저장 파일 경고·우선순위 사슬은 넣지 않는다 — 앞의 둘은 부모 몫이고 우선순위는 서브에이전트가 읽는 규칙 파일에 있다.
- **off 면 상태 읽기 전 skip, advisory 면 렌더 침묵** — 둘 다 주입은 없지만 off만 규칙 상태 접근도 하지 않는다.
- 규칙 **이름만** 말한다. 매 스폰마다 본문을 복제하면 SessionStart 가 피하는 이중 비용을 서브에이전트 수만큼 곱한다.
- stdin 타임아웃(`shared/readStdin`)이 방어선 — 일부 환경은 훅의 stdin 을 닫지 않는다. 스폰을 막는 훅은 없어야 한다.

## Boundaries

### Always do

- 어떤 실패에도 processor는 `{ continue: true }`, 무주입 entry stdout은 빈 문자열. 스폰을 지연·차단하지 않는다.
- 부모 렌더가 바뀌면 축약본도 같은 함수에서 나오게 유지.

### Ask first

- 축약 렌더 2줄 초과.
- matcher 좁히기 (특정 에이전트 타입만).

### Never do

- 규칙 본문 복제.
- `.claude/rules/`·`.seiri/` 쓰기 — 읽기 전용 훅이다.
- `decision` 제어.

## Dependencies

- `../shared/` (`renderStatusLines`·`readStdin`), `../../core/ruleDocs/`, `../../core/infra/configLoader/` — 전부 concrete 경로
