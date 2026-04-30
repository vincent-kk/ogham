## Purpose

Zod 기반 설정 스키마 정의. `VaultConfig` 및 `LensConfig` 타입과 검증 스키마를 제공한다.

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다
- 변경 시 관련 테스트를 함께 업데이트한다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
- Zod 스키마(config-schema.ts)와 수동 가드(config-guard.ts) 간 필드 불일치 허용 금지 — 스키마 수정 시 가드도 같은 PR에서 동기화
