# setup — SessionStart 상태 요약

## Purpose

세션 시작 시 활성 규칙·다이얼·드리프트를 한 덩어리(~2–4줄)로 주입한다.
읽기 전용이며, 배포된 규칙이 하나도 없으면 **아무것도 주입하지 않는다** —
옵트인하기 전까지 seiri 는 컨텍스트를 쓰지 않는다.

## Structure

- `setup.ts` — `processSessionStart` (IO + 폴백)
- `utils/renderStatusLines.ts` — 순수 렌더 (단위 테스트 대상)
- `setup.entry.ts` — esbuild 번들 진입점

## Conventions

- 플러그인 루트는 `process.env.CLAUDE_PLUGIN_ROOT` — 부재 시 무주입.
- 매니페스트 로드 실패(해시 미주입 등)는 **우리 쪽 빌드 결함**이므로
  무주입으로 흡수한다. 세션을 그것 때문에 죽이지 않는다.
- 다이얼은 **렌더 분량만** 바꾼다: advisory 1줄 / standard +다이얼 /
  strict +우선순위 사슬. 배포 문서는 절대 바꾸지 않는다 — 문서를 바꾸면
  templateHash 드리프트 감지와 충돌한다.
- 드리프트 경고와 config 무시 경고는 다이얼과 무관하게 항상 렌더한다.
- `filid` 의 SessionStart 와 달리 `selfProbe` 를 쓰지 않는다 — 탐지할 외부
  바이너리가 없어 spawn 의존을 들일 이유가 없고, 그 덕에 번들이 light 티어에
  머문다.

## Boundaries

### Always do

- 어떤 예외에도 `{ continue: true }` 로 빠져나온다.
- 규칙 이름만 말하고 규칙 내용은 말하지 않는다.

### Ask first

- 렌더에 새 줄 추가 (상시 주입 예산 증가).
- 무주입 조건 변경 (배포 0건 = 침묵).

### Never do

- `.claude/rules/` 또는 `.seiri/config.json` 쓰기.
- 배포된 규칙 본문 복제 — 하니스가 이미 로드했다.

## Dependencies

- `../../core/ruleDocs/status/getRuleDocsStatus.js` (concrete)
- `../../core/infra/configLoader/loaders/loadConfig.js` (concrete)
- `@ogham/cross-platform/error-log`
