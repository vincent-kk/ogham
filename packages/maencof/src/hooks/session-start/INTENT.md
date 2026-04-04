# session-start

## Purpose

세션 시작 훅. CLAUDE.md 초기화, 볼트 검증, 설정 프로비저닝.

## Boundaries

### Always do

- claude-md-merger로 CLAUDE.md 섹션 관리
- 아키텍처 버전 검증 및 마이그레이션 트리거
- companion identity 검증

### Ask first

- 초기화 순서 변경

### Never do

- 사용자 CLAUDE.md 섹션 수정
