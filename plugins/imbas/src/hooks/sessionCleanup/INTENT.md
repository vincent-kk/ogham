# sessionCleanup

## Purpose

SessionEnd hook. 현재는 no-op 플레이스홀더 — 사용자 동의 없는 자동 삭제를 하지 않는다 (`.imbas/.temp/` 정리는 `/imbas:setup clear-temp` 수동 경로 전용).

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다

### Ask first

- 정리 대상 변경

### Never do

- 순환 의존성 도입
