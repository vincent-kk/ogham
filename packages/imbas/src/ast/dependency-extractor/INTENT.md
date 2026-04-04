# dependency-extractor

## Purpose
AST 기반 import/export/call 정보 추출. 코드 의존성 분석에 사용.

## Boundaries
### Always do
- ast-grep-shared를 통해 napi 모듈 접근
### Ask first
- 새 추출 패턴 추가
### Never do
- 순환 의존성 도입
