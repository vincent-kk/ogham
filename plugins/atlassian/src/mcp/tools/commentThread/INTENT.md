[filid:lang:ko]

# commentThread — 댓글 스레드 도구 어댑터

## Purpose

`comment_thread` 도구의 얇은 어댑터. `mode` 로 분기해 도메인 계층의 함수 하나를 부르고 결과를 그대로 돌려준다. Cloud 사이트는 거부한다.

## Conventions

- 모드별 입력 계약은 서버가 등록한 Zod 스키마가 소유한다. 어댑터는 직접 호출도 도메인 함수에 누락 인자를 넘기지 않도록 필수값 가드만 유지한다.
- 결과는 가공하지 않고 그대로 통과시킨다. 병합·판정은 도메인 계층의 책임이다.

## Boundaries

### Always do

- `ctx.is_cloud === true` 면 표준 fetch 경로를 안내하는 오류를 던진다.

### Ask first

- 새 모드 또는 어댑터 책임 추가

### Never do

- 도메인 계층의 내부 파일을 import 하지 않는다 — 진입점만 호출한다.
- 병합·판정 로직을 보유하지 않는다.
