## Purpose

`assert_analysis_plan` 도구 핸들러. 정규화 입력만으로 통계 hard gate 를 결정론적으로 평가한다. hard 위반은 항상 차단, soft 위반은 interactive 허용·auto 차단. 실행·자연어 판단 없음 — 입력의 순수 함수.

## Conventions

- 룰셋은 런타임 결정성을 위한 TS 정본 — meta.yaml 카탈로그와 동기 유지
- hard 발견 시 즉시 `hard_block`(soft 평가 생략)
- soft: interactive `allowed:true`, auto `allowed:false`

## Boundaries

### Always do

- 입력 필드만으로 판정 (자연어·외부 IO 없음)
- 가정 아티팩트 부재는 "미검증" soft 경고
- 미등록 기법(룰셋 부재)은 `unregistered_technique` soft 경고

### Ask first

- 룰셋에 기법 추가/가정 매핑 변경 (meta.yaml 동시 갱신)
- hard/soft 분류 변경

### Never do

- R 실행·아티팩트 생성 (run_r 소관)
- soft 위반을 interactive 에서 차단 (대화로 개선)
