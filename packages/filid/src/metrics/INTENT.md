# metrics -- 메트릭 분석 모듈

## Purpose

테스트 밀도, 모듈 분리 결정, 프로모션 적격성 등 FCA-AI 품질 메트릭을 계산한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `test-counter` | 테스트 케이스 카운팅 |
| `three-plus-twelve` | 3+12 규칙 검증 |
| `decision-tree` | 모듈 분리 결정 트리 |
| `promotion-tracker` | organ→fractal 프로모션 적격성 평가 |

## Boundaries

### Always do
- 메트릭 함수는 순수 함수로 유지

### Ask first
- 임계값 변경 (LCOM4, CC, 테스트 수)

### Never do
- 파일 I/O 수행
- `core/`, `mcp/`, `hooks/` 모듈 import

## Dependencies
- `../types/`
