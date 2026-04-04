# cyclomatic-complexity

## Purpose
AST 기반 순환 복잡도(Cyclomatic Complexity) 계산. 코드 품질 분석에 사용.

## Boundaries
### Always do
- ast-grep-shared를 통해 napi 모듈 접근
### Ask first
- 새 복잡도 메트릭 추가
### Never do
- 순환 의존성 도입
