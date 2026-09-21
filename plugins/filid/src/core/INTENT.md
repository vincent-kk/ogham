# core — language-neutral FCA engine

## Purpose

등록된 어댑터 증거를 FCA snapshot, 규칙 결과, 최소 context와 읽기 전용 restructure plan으로 변환하고, 에이전트가 제출한 파일별 사실을 코드 해석 없이 검사해 보관한다.

## Conventions

- 판단 우선순위: 1. 확실한 증거 2. 경계 보존 3. 자동화 범위
- sibling fractal은 각 entry point로 import하고 local barrel은 내부 routing에 쓰지 않는다.
- filesystem write는 config 승인 저장, cache와 artifact edge에만 둔다.

## Boundaries

### Always do

- adapter certainty와 dependency evidence를 결과에 보존
- 제출된 사실은 hash 결속·문자열 존재·해석 경로 유효성을 통과한 것만 저장
- 문서·boundary·DAG·verification rule을 동일 snapshot에 대해 평가

### Ask first

- node classification 우선순위나 15개 built-in rule 의미 변경
- snapshot, context 또는 restructure 공개 DTO 변경

### Never do

- 언어 확장자, entry filename, framework 또는 test-call 문법 추측
- 소스 파일을 구문으로 해석하거나 어떤 명령도 실행
- project source 이동, import rewrite 또는 review fix 실행
- unsupported/indeterminate를 PASS로 변환

## Dependencies

- `../types/`, `../constants/`와 주입된 adapter registry
