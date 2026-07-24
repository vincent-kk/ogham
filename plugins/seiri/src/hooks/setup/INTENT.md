# setup — SessionStart 상태 요약

## Purpose

세션 시작 시 활성 규칙·유효 다이얼·드리프트를 주입한다. 읽기 전용이며, 배포된
규칙이 0건이면 **아무것도 주입하지 않는다** — 옵트인 전까지 컨텍스트를 안 쓴다.

## Structure

- `setup.ts` — `processSessionStart` (IO + 폴백)
- `utils/renderStatusLines.ts` — 순수 렌더 (단위 테스트 대상)
- `setup.entry.ts` — esbuild 번들 진입점

## Conventions

- 플러그인 루트는 `process.env.CLAUDE_PLUGIN_ROOT` — 부재 시 무주입.
- 매니페스트 로드 실패(해시 미주입 등)는 **우리 쪽 빌드 결함**이므로
  무주입으로 흡수한다. 세션을 그것 때문에 죽이지 않는다.
- 다이얼은 **렌더 분량만** 바꾼다: advisory 1줄 / standard +다이얼 +규율 체인 /
  strict +우선순위 +완료 계약. 배포 문서는 안 바꾼다 — templateHash 와 충돌.
- 유효 다이얼은 `loadIntervention`(밸브 ?? 기준선 ?? standard). 밸브가 살아 있으면 출처·기준선을 명시한다 — advisory 로 **내린** 밸브도 마찬가지.
- 드리프트·다이얼 파일 무시 경고는 다이얼과 무관하게 항상 렌더한다.
- 렌더 총량 기본 ≤5줄 · strict ≤8줄 — `renderStatusLines` 테스트가 고정한다.
- `filid` 의 SessionStart 와 달리 `selfProbe` 를 쓰지 않는다 — 탐지할 외부
  바이너리가 없어 spawn 의존을 들일 이유가 없다.

## Boundaries

### Always do

- 어떤 예외에도 `{ continue: true }` 로 빠져나온다.
- 규칙 이름만 말하고 규칙 내용은 말하지 않는다.

### Ask first

- 렌더에 새 줄 추가 (상시 주입 예산 증가).
- 무주입 조건 변경 (배포 0건 = 침묵).

### Never do

- `.claude/rules/` 또는 `.seiri/` 쓰기.
- 배포된 규칙 본문 복제 — 하니스가 이미 로드했다.

## Dependencies

- `../../core/ruleDocs/status/getRuleDocsStatus.js` (concrete)
- `../../core/infra/configLoader/` — `loadIntervention` · `describeDial` ·
  `renderPostureLines` (concrete)
- `@ogham/cross-platform/error-log`
