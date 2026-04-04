# vault-committer

## Purpose

세션 종료 시 볼트 변경사항 Git 자동 커밋.

## Boundaries

### Always do

- git-utils로 커밋 실행
- 변경 파일 목록 기반 커밋 메시지

### Ask first

- 커밋 전략 변경

### Never do

- 사용자 리포지토리에 force push
