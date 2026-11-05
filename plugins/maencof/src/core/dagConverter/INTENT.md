# dagConverter

## Purpose

지식 그래프를 DAG(방향성 비순환 그래프)로 변환. 레이어 방향성 적용.

## Conventions

레이어 우선순위 규칙은 그래프 의미를 바꾸므로 별도 결정을 거친다. 원본 보존은 호출자의 그래프를 손상시키지 않기 위한 경계다.

## Boundaries

### Always do

- Layer enum 기반 방향성 결정
- 순환 참조 제거

### Ask first

- 레이어 우선순위 규칙 변경

### Never do

- 원본 그래프 변경 (복사본 반환)
