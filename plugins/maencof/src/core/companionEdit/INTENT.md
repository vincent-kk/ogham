# companionEdit

## Purpose

companion-identity.json 정본 편집의 로직 코어. `.maencof-meta` 직접 Edit 금지의 유일한 허가 우회로(companion_edit 도구가 위임). preview와 commit의 2단계로 편집한다. 매 턴 예산 악화(초과를 더 키움)·brief 동기화 위반 시 커밋 거부.

## Conventions

초과 예산은 단조 개선으로 수렴시킨다. 이미 초과한 파일도 brief를 하나씩 붙일 수 있어야 하므로 절대 상한만으로 편집을 막지 않는다.

## Boundaries

### Always do

- 레거시 파일은 [`companionNormalize`](../companionNormalize/INTENT.md)로 먼저 정본 정규화
- 저장 전 Zod(정본) + 매 턴 예산([`companionBudget`](../companionBudget/INTENT.md)) 단조-개선 게이트 + brief 길이역전 검증
- commit≠true는 파일 불변(diff/검증만), commit은 백업 후 저장
- 백업은 [`backupPath`](../backupPath/INTENT.md) 규칙 사용

### Ask first

- 편집 연산(add/update/remove/update_core) 추가·변경
- 검증 게이트를 경고로 완화하는 변경

### Never do

- preview 경로에서 파일 쓰기
- mcp/ · hooks/ 직접 의존 (core 경계)
