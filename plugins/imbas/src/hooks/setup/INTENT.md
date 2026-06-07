# setup

## Purpose
SessionStart hook. 세션 시작 시 imbas 환경 초기화 및 로거 설정.

## Boundaries
### Always do
- 로거 초기화 포함
### Ask first
- 초기화 항목 변경
### Never do
- 순환 의존성 도입
