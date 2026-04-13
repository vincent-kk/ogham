# vault-committer

## Purpose

볼트 변경사항 Git 자동 커밋. SessionEnd와 UserPromptSubmit(/clear) 이벤트에서 opt-in 방식으로 동작.

## Boundaries

### Always do

- vault-commit.json의 enabled: true 확인 후 실행 (opt-in 전용)
- git-utils로 커밋 실행 (index.lock 체크 선행)
- UserPromptSubmit 이벤트에서는 /clear 명령어 확인 후에만 실행

### Ask first

- 커밋 전략 변경
- 자동 커밋 트리거 이벤트 추가

### Never do

- 사용자 리포지토리에 force push
- vault-commit.json 없이 자동 커밋 실행
