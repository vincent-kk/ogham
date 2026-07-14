# companionEdit

## Purpose

companion-identity.json 정본 편집의 로직 코어. `.maencof-meta` 직접 Edit 금지의 유일한 허가 우회로(companion_edit 도구가 위임). 로드→정규화→연산 적용→검증→preview/commit 2단계. 매 턴 예산 악화(초과를 더 키움)·brief 동기화 위반 시 커밋 거부.

## Boundaries

### Always do

- 레거시 파일은 [`companionNormalize`](../companionNormalize/INTENT.md)로 먼저 정본 정규화
- 저장 전 Zod(정본) + 매 턴 예산([`companionBudget`](../companionBudget/INTENT.md)) 단조-개선 게이트 + brief 길이역전 검증
- 예산 게이트는 절대 기준이 아니라 단조 기준 — 편집 후 `TURN_IDENTITY_CHAR_BUDGET` 이내이거나 편집 전 총합을 악화시키지 않으면 커밋 허용(초과 상태에서 brief 부착으로 점진 수렴)
- commit≠true는 파일 불변(diff/검증만), commit은 백업 후 저장
- 백업은 [`backupPath`](../backupPath/INTENT.md) 규칙 사용

### Ask first

- 편집 연산(add/update/remove/update_core) 추가·변경
- 검증 게이트를 경고로 완화하는 변경

### Never do

- preview 경로에서 파일 쓰기
- mcp/ · hooks/ 직접 의존 (core 경계)
