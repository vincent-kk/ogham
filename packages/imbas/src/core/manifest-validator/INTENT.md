# imbas-manifest-validator

## Purpose
매니페스트 스키마 검증 및 참조 무결성 검사.

## Boundaries
### Always do
- manifest-parser를 통해 매니페스트 로드
### Ask first
- 검증 규칙 변경
### Never do
- 순환 의존성 도입
