# structureValidate — project and plan validation

## Purpose

같은 project snapshot을 대상으로 scope-filtered FCA project rule 또는 restructure plan의 실행 전후 조건을 read-only로 검증한다.

## Structure

- `structureValidate.ts` — mode dispatch와 validation summary
- `handlers/` — project와 plan mode별 snapshot validation
- `utils/` — plan artifact parsing과 status 결정
- `index.ts` — named handler export

## Conventions

- mode 생략값은 `project`, scope 생략값은 canonical 전체 scope다.
- plan mode는 artifact의 `RestructurePlan`을 검증한 뒤 core validator에 위임한다.

## Boundaries

### Always do

- project mode는 canonical rule engine과 snapshot을 재사용
- plan mode에서 `planPath` 부재·invalid JSON을 trust-boundary error로 거부

### Ask first

- mode, scope 또는 plan artifact contract 변경

### Never do

- auto-fix, source move 또는 import rewrite 실행
- non-exact evidence를 PASS로 변환

## Dependencies

- core rules/restructure/projectSnapshot과 common tool envelope
