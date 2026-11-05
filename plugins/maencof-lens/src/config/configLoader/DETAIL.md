# configLoader — Contract

## Requirements

- user 설정 위에 project 재정의를 얹는다. 저장소가 자기 볼트를 지정할 수 있어야 한다.
- 검증은 병합 결과에만 적용하여 project 문서가 재정의할 키만 담을 수 있게 한다.
- 볼트 배열은 전체 교체한다. 목록을 줄일 수 있어야 하며 개인 목록을 유지하려면 project에서 키를 생략한다.
- 저장 대상 레이어는 호출자가 명시한다. 병합 결과를 어느 한 레이어에 되쓰면 프로젝트 재정의가 개인 기본값에 구워진다.
- 병합 후 사용할 설정이 없으면 미설정으로 처리한다. 볼트 경로를 임의로 만들지 않고, 설정 하나가 세션을 막지 않게 한다.
- 스키마·형태 판정과 기본값은 각 소유 모듈에 맡겨 검증 규칙을 중복 구현하지 않는다.

## API Contracts

- 저장 계층을 암묵적으로 고르지 않으며 로드 결과를 그대로 저장용 문서로 취급하지 않는다. 로드의 미설정 결과는 호출자가 세션 계속 여부와 설정 복구 안내에 사용한다.

## Acceptance Criteria

### AC-config-degradation — 손상 내성

- 파일 부재·손상으로 사용할 병합 설정이 없으면 throw 없이 미설정을 반환한다.

### AC-schema-delegation — 검증 위임

- 검증이 `configSchema` 의 스키마·guard 를 거친다.

## Boundary Exemptions

### configLoader.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: allowed
- **Reason**: SessionStart 훅은 esbuild 번들로 배송되고 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다.

## Last Updated

설정 계층·저장 대상·손상 처리 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
