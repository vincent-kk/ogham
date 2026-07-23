# hooks — 세션 이벤트 구현체

## Purpose

seiri 의 훅 구현 4종. **어느 것도 차단하지 않고 어느 것도 규칙 본문을 나르지
않는다.** 규칙 파일은 하니스가 이미 자동 로드하므로, 훅이 나르는 것은 파일이
스스로 말할 수 없는 것뿐이다 — 무엇이 활성인지, 다이얼이 어디인지, 드리프트가
있는지, 같은 명령이 몇 번째 실패인지.

## Structure

```
shared/              organ — readStdin · renderStatusLines (setup·subagentStart 공용)
setup/               SessionStart — 상태 요약 주입
postToolUse/         PostToolUse + PostToolUseFailure(Bash) — 실패 연쇄 신호
subagentStart/       SubagentStart — 상태 요약 축약 재주입
instructionsLoaded/  InstructionsLoaded — 로드 관측, 주입 0 (dormant)
```

## Conventions

- **배럴 import 금지.** 훅 도달 코드는 `index.js` 가 아니라 concrete 파일을
  직접 import 한다 — 배럴은 재수출하는 모듈 전체를 번들로 끌어온다.
  typecheck 는 이를 못 잡고 `scripts/build-hooks.mjs` 의 캡·금칙 가드가
  최종 방어선이다. 훅 소스 변경 후 반드시 `build:plugin` 으로 확인.
- 검증 런타임(zod 등)·MCP SDK·glob 엔진을 훅 번들에 들이지 않는다.
- `@ogham/cross-platform/host-paths` 를 소비하지 않는다 — 호스트가 훅에
  `CLAUDE_PLUGIN_ROOT` 와 세션 cwd 를 이미 준다. 경로 조합은 `compat` 경유.
- 진입점은 `<name>/<name>.entry.ts`. `build-hooks.mjs` 의 `hookEntries` 가
  빌드하고, 활성 훅은 같은 이름으로 `hooks/hooks.json` 에 등록한다 —
  `DORMANT_HOOKS`(constants) 는 빌드되나 미등록 (wiring 이 강제). 번들 하나가
  이벤트 여럿에 등록될 수 있다 — 이름은 번들 기준이지 등록 수가 아니다.

## Boundaries

### Always do

- 어떤 실패에도 세션을 막지 않는다 — 최상위 try/catch → `{ continue: true }`.
- 실패는 `logHookFailure` 로 기록한다. 조용한 실패 금지.

### Ask first

- 훅 추가 (현재 4개가 설계 상한 — 매 이벤트 콜드스타트를 지불한다).
- 주입 렌더 길이 증가.

### Never do

- `.claude/rules/` 쓰기 — 배포는 setup 표면 전담.
- 배포된 규칙 문서의 내용을 주입에 복제.
- 차단 훅(`PreToolUse`·`Stop`) 도입 — 진실은 저장소가 소유한다.
