# subagentStart — 서브에이전트 상태 재주입

## Purpose

스폰되는 서브에이전트에게 **이 저장소가 무엇을 켰는지**를 축약해 알린다.
서브에이전트는 부모의 SessionStart 컨텍스트를 물려받지 않아, 아무것도 안 하면
프로젝트가 옵트인한 사실 자체를 모른 채 일한다.

## Structure

- `subagentStart.ts` — `processSubagentStart` (축약 렌더 재사용)
- `subagentStart.entry.ts` — 번들 진입점 (`bridge/subagent-start.mjs`)

## Conventions

- 렌더는 `shared/renderStatusLines` 의 `compact` 모드 — **최대 2줄**
  (활성 규칙 + 규율 체인). 렌더 로직을 복제하지 않는다.
- 드리프트·저장 파일 경고·우선순위 사슬은 넣지 않는다. 앞의 둘은 부모가
  처리할 일이고, 우선순위는 서브에이전트가 읽을 수 있는 규칙 파일에 있다.
- **advisory 면 아무것도 주입하지 않는다.** 서브에이전트 스폰은 D7 실측 당시
  seiri 가 손대지 않던 지점이라 기본 다이얼에서는 그대로 둔다. (TODO 의
  "advisory: Active rules 한 줄"보다 프롬프트 구속 조건 "advisory 면 신규 주입
  전부 침묵"을 따른 판단 — 되돌리기 쉽다.)
- 규칙 **이름만** 말한다. 매 스폰마다 본문을 복제하면 SessionStart 가 피하는
  이중 비용을 서브에이전트 수만큼 곱한다.
- stdin 타임아웃(`shared/readStdin`)이 방어선 — 일부 환경은 훅의 stdin 을
  닫지 않는다. 스폰을 막는 훅은 없어야 한다.

## Boundaries

### Always do

- 어떤 실패에도 `{ continue: true }`. 스폰을 지연·차단하지 않는다.
- 부모 렌더가 바뀌면 축약본도 같은 함수에서 나오게 유지.

### Ask first

- 축약 렌더 2줄 초과.
- matcher 좁히기 (특정 에이전트 타입만).

### Never do

- 규칙 본문 복제.
- `.claude/rules/`·`.seiri/` 쓰기 — 읽기 전용 훅이다.
- `decision` 제어.

## Dependencies

- `../shared/` (`renderStatusLines`·`readStdin`), `../../core/ruleDocs/`,
  `../../core/infra/configLoader/` — 전부 concrete 경로
