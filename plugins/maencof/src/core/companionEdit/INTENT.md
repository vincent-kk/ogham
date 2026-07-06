# companionEdit

## Purpose

companion-identity.json v2 편집의 로직 코어. `.maencof-meta` 직접 Edit 금지의 유일한 허가 우회로(companion_edit 도구가 위임). 로드→정규화→연산 적용→검증→preview/commit 2단계. 예산·동기화 위반 시 커밋 거부.

## Boundaries

### Always do

- v1 파일은 [`companionNormalize`](../companionNormalize/INTENT.md)로 먼저 v2 정규화
- 저장 전 Zod v2 + 500 예산([`companionBudget`](../companionBudget/INTENT.md)) + brief 길이역전 검증
- commit≠true는 파일 불변(diff/검증만), commit은 백업 후 저장
- 백업은 [`backupPath`](../backupPath/INTENT.md) 규칙 사용

### Ask first

- 편집 연산(add/update/remove/update_core) 추가·변경
- 검증 게이트를 경고로 완화하는 변경

### Never do

- preview 경로에서 파일 쓰기
- mcp/ · hooks/ 직접 의존 (core 경계)
