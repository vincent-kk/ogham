# session-cleanup

## Purpose
SessionEnd hook. 세션 종료 시 정리 작업 수행.

## Boundaries
### Always do
- 이 모듈의 단일 책임을 유지한다
### Ask first
- 정리 대상 변경
### Never do
- 순환 의존성 도입
