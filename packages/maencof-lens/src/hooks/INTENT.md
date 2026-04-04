## Purpose

Claude Code 훅 구현 모듈. SessionStart 시 설정 감지 및 스킬 가이드를 주입한다.

## Structure

- `session-start/` — SessionStart 훅 로직 및 esbuild 진입점

## Boundaries

### Always do

- 훅 출력은 JSON 형식으로 stdout에 기록한다
- 설정 미발견 시 조용히 종료한다

### Ask first

- 새로운 훅 이벤트 추가
- 훅 출력 형식 변경

### Never do

- 순환 의존성 도입
- 훅에서 볼트 파일시스템에 쓰기
