# structureValidate — project validation child

## Purpose

`fractal_inspect`의 `validate` action에서 같은 project snapshot을 대상으로 scope-filtered FCA project rule을 read-only로 검증한다.

## Conventions

- summary mode는 항상 `project`, scope 생략값은 canonical 전체 scope다.

## Boundaries

### Always do

- project mode는 canonical rule engine과 snapshot을 재사용
- exact finding과 non-exact evidence의 status 의미를 보존

### Ask first

- scope 또는 project validation status 계약 변경

### Never do

- auto-fix, source move 또는 import rewrite 실행
- non-exact evidence를 PASS로 변환
