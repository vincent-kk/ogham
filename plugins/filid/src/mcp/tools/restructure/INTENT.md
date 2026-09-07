# restructure — placement plan lifecycle dispatcher

## Purpose

read-only placement plan 생성과 외부 실행 전·후 검증을 `restructure`의 명시적 action으로 한 절차에 묶는다.

## Conventions

- plan은 항상 artifact로 저장하고 검증 action은 그 절대 경로를 읽는다.
- `action`은 정확히 한 handler를 선택한다.
- project tree의 실제 이동과 import rewrite는 외부 actor가 수행한다.

## Boundaries

### Always do

- plan ID, snapshot hash, placement evidence와 persistence 의미 보존
- precondition과 postcondition에서 동일한 plan schema 사용
- plan validation summary에는 canonical 전체 scope 보고

### Ask first

- plan DTO, validation action 또는 persistence 의미 변경

### Never do

- source file 이동·생성·삭제·수정
- import rewrite 실행
- unresolved 또는 stale plan을 실행 가능하다고 표현
