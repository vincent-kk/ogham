# configLoader — Contract

## Requirements

- 훅을 완전히 건너뛰는 `off`와 세 개의 개입 강도를 한 다이얼로 읽고·쓰고·설명한다. **규칙 배포 상태는 담지 않는다** — 호스트 규칙 채널의 파일시스템이 그쪽의 단일 진실이라 사본은 드리프트만 만든다.
- 다이얼은 3계층이다: user `config.json`(개인 기본값) · `.seiri/config.json`(커밋되는 프로젝트 기준선) · `.seiri/runtime.json`(비추적 런타임 밸브). 유효값은 `runtime ?? project ?? user ?? off` 이며 매 훅 실행마다 다시 계산한다. 기존 `advisory`·`standard`·`strict` 파일은 그대로 유효하다.
- 계층을 병합하지 않고 따로 읽는다. 다이얼은 한 키라 병합 문서가 `??` 체인보다 말해주는 게 없고, 렌더가 필요한 것은 **어느 계층이 그 값을 줬는지**다.
- 읽기는 절대 throw 하지 않는다. 부재는 정상이고, 손상된 계층은 건너뛰되 `warnings` 가 그 파일과 손상 종류를 지목한다 — 조용한 오버라이드를 만들지 않되 거부된 원값은 경고에 복제하지 않는다.
- 검증은 손으로 짠 predicate 다. 훅 경로라 검증 런타임을 들일 수 없다.
- 한 계층의 값을 다른 계층에 되쓰지 않는다 — 프로젝트 결정이 개인 기본값에 구워진다.
- 세션 훅은 다이얼을 읽기만 한다. 쓰기는 도구 경로의 일이다.
- 배럴은 외부 소비자 전용이다. 훅은 `loaders/`·`utils/` 를 직접 import 한다.

## API Contracts

- `loaders/` — `loadConfig`, `loadConfigScope`, `loadIntervention`, `writeConfig`, `writeRuntime`, `clearRuntime`, `createDefaultConfig`.
- `utils/` — `readDialFile`, `configLayers`, `resolveConfigPath`, `resolveRuntimePath`, `isInterventionLevel`, `describeDial`, `renderPostureLines`, `renderElectionLine`.

## Acceptance Criteria

### AC-dial-precedence — 계층 우선순위

- 유효값이 `runtime ?? project ?? user ?? default` 순으로 정해진다.
- 결과가 값을 준 계층(`source`)을 함께 보고한다.
- 밸브를 지우면 프로젝트 기준선으로, 기준선이 없으면 개인 기본값으로 돌아간다.
- 아무 계층도 없거나 사용할 수 없으면 built-in `off`로 돌아간다.

### AC-dial-degradation — 손상 내성

- 설정 파일이 없거나 파싱 불가여도 throw 없이 기본 다이얼로 동작한다.
- 손상된 계층은 건너뛰되 `warnings` 에 그 파일이 지목된다.
- 알 수 없는 intervention 값은 원값을 복제하지 않는 고정 사유로 보고된다.

### AC-dial-no-ruledocs-mirror — 배포 상태 비미러링

- 다이얼 파일에 규칙 배포 상태가 기록되지 않는다.

## Boundary Exemptions

### loaders — Hook bundles cannot pass through the barrel

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅은 esbuild 번들로 배송되고 크기 가드를 받는다. `index.ts` 를 거치면 배럴이 재노출하는 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다. typecheck 는 이 비대를 잡지 못하고 `build:hooks` 의 가드만 잡으므로, 배럴 경유는 선택지가 아니라 빌드 실패다.

### utils — Hook bundles cannot pass through the barrel

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: `loaders` 와 같은 이유다. 상태 렌더 함수(`describeDial`·`renderPostureLines`·`renderElectionLine`)는 훅 두 개가 공유하는데, 배럴을 거치면 다이얼 쓰기 경로 전체가 번들에 딸려 온다.

## History

- 2026-09-05 — 잘못된 intervention 원값을 경고에서 제거했다. 경고는 fallback의 이유만 설명하고 프로젝트가 쓴 임의 문자열을 훅 컨텍스트로 운반하지 않아야 하기 때문이다.

## Last Updated

2026-09-05 — 잘못된 intervention 경고가 거부된 원값을 복제하지 않게 했다.
