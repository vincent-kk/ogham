# configLoader — Contract

## Requirements

- 설정은 user(호스트 상태 루트)와 project(`<projectRoot>/.maencof-lens/config.json`) 두 레이어이며 project 가 user 를 재정의한다 — 저장소 하나가 자기 vault 를 가리킬 수 있어야 하기 때문이다.
- 검증은 **병합 결과에만** 건다. project 레이어는 재정의한 키만 담을 수 있다.
- `vaults` 는 배열이라 project 가 통째로 교체한다 — 목록을 **줄일 수 있는 유일한 방법**이다. 개인 목록을 그대로 쓰려면 project 에서 그 키를 생략한다.
- 저장 레이어는 호출자가 지목한다. 기본값을 두지 않는다. 병합 결과를 어느 한 레이어에 되쓰지 않는다.
- 부재·손상 시 기본값으로 degrade 한다 — 설정 하나가 세션을 막지 않는다.
- 스키마와 형태 판정은 `configSchema` 가 소유한다. 여기서 검증 규칙을 다시 만들지 않는다.
- 기본값은 `defaults` organ 이 소유한다.

## API Contracts

- `loadConfig(...)` — 설정 로드. 부재·손상 시 기본값.
- `writeConfig(...)` — 설정 기록.
- `createDefaultConfig(...)` — 기본 설정 생성.

## Acceptance Criteria

### AC-config-degradation — 손상 내성

- 파일이 없거나 파싱 불가여도 throw 없이 기본 설정으로 동작한다.

### AC-schema-delegation — 검증 위임

- 검증이 `configSchema` 의 스키마·guard 를 거친다.

## Boundary Exemptions

### configLoader.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: allowed
- **Reason**: SessionStart 훅은 esbuild 번들로 배송되고 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다.

## Last Updated

2026-07-30 — 설정 로드 계약과 훅 직접 import 면책을 문서화했다.
