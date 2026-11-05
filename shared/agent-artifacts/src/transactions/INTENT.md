## Purpose

읽기 전용 계획이 기록한 대상 리비전을 잠금 아래 재검증하고, 물리 파일 단위의
원자적 적용 결과를 제공한다.

## Conventions

- 리비전은 설정 페이지로 직렬화할 수 있는 불변 값이다.
- 원자성 단위는 하나의 물리 파일이다. 적용 중 첫 파일 오류에서 중단하고 `partial`로 완료 경로, 실패 대상·오류, 미시도 경로와 실제 쓴 모든 백업을 반환한다. 실패 대상의 쓰기 전에 완료한 백업도 포함한다.
- 구현은 facade를 역참조하지 않고 내부 transaction 타입을 사용해 타입 의존 순환을 막는다.

## Boundaries

### Always do

- 쓰기 전 lock 획득과 revision 재검증을 모두 수행한다.
- stale revision 또는 lock timeout을 conflict로 반환한다.

### Ask first

- revision 형식, lock timeout 기본값, 원자성 단위 변경.

### Never do

- lock 획득 실패 후 잠금 없이 진행하거나 stale plan을 재계획 없이 적용.
- 파일 시스템 primitive를 재구현.
