# configSchema — Contract

## Requirements

- 설정 스키마와 타입 가드의 단일 출처다. 검증 규칙을 다른 모듈이 재구현하지 않는다.
- 스키마 검증과 형태 판정(guard)은 역할이 다르다 — 전자는 파싱, 후자는 런타임 좁히기다.
- 훅 번들에 Zod를 싣지 않도록 로더는 이 모듈의 수동 가드와 정규화를 사용한다. 가드는 스키마가 허용하는 입력을 받아들이되, 선택 필드의 잘못된 값은 기본값이나 유효한 레이어로 정규화할 수 있다.
- **Zod 스키마와 수동 가드의 필드는 어긋나면 안 된다.** 스키마를 고치면 가드를 같은 변경에서 맞춘다.

## API Contracts

- 스키마는 파싱, 가드는 런타임 좁히기다. 외부 스키마 표면에 로더 전용 가드를 올리지 않는 이유는 아래 경계 예외에 기록한다.

## Acceptance Criteria

### AC-schema-single-source — 스키마 단일 출처

- 설정 파싱·형태 판정·정규화 규칙은 이 모듈이 소유하며, 로더가 별도 검증 규칙을 만들지 않는다.

## Boundary Exemptions

### guard — configLoader reaches the guard directly

- **Consumers**: `**/src/config/configLoader/**`
- **Direct import**: allowed
- **Reason**: 로더는 훅 번들에 Zod를 넣지 않도록 수동 가드로 형태를 판정하고 정규화한다. 사용할 설정이 없으면 미설정으로 처리한다. 배럴은 스키마와 타입을 외부 소비자에게 내보내는 표면이고, 이 guard 는 로더 한 곳만 쓰는 내부 판정이라 표면에 올리면 소비자가 하나뿐인 심볼이 공개 계약에 남는다.

## Last Updated

스키마·수동 가드의 책임과 동기화 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
