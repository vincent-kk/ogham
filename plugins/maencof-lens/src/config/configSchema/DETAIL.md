# configSchema — Contract

## Requirements

- 설정 스키마와 타입 가드의 단일 출처다. 검증 규칙을 다른 모듈이 재구현하지 않는다.
- 스키마 검증과 형태 판정(guard)은 역할이 다르다 — 전자는 파싱, 후자는 런타임 좁히기다.
- **Zod 스키마와 수동 가드의 필드는 어긋나면 안 된다.** 스키마를 고치면 가드를 같은 변경에서 맞춘다.

## API Contracts

- `LensConfigSchema` · `VaultConfigSchema` — 설정 스키마.
- `LensConfig` · `VaultConfig` — 대응 타입.
- `guard/` — 런타임 형태 판정(organ).

## Acceptance Criteria

### AC-schema-single-source — 스키마 단일 출처

- 설정 검증이 이 모듈의 스키마로만 수행된다.

## Boundary Exemptions

### guard — configLoader reaches the guard directly

- **Consumers**: `**/src/config/configLoader/**`
- **Direct import**: allowed
- **Reason**: `configLoader` 는 파싱 실패를 형태 판정으로 좁혀 기본값으로 degrade 한다. 배럴은 스키마와 타입을 외부 소비자에게 내보내는 표면이고, 이 guard 는 로더 한 곳만 쓰는 내부 판정이라 표면에 올리면 소비자가 하나뿐인 심볼이 공개 계약에 남는다.

## Last Updated

2026-07-30 — 스키마 단일 출처 계약과 guard 직접 참조 면책을 문서화했다.
