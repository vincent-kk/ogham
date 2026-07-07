# sessionStart

## Purpose

세션 시작 훅. CLAUDE.md 초기화, 볼트 검증, 설정 프로비저닝.

## Boundaries

### Always do

- claudeMdMerger로 CLAUDE.md 섹션 관리
- 아키텍처 버전 검증 및 마이그레이션 트리거
- companion identity 검증
- metaSkillBody.md 내용을 `hookSpecificOutput.additionalContext` 로 주입 (off-switch 해제 시)
- L1 core 문서 전체 본문을 `<l1-core-full>` 로 세션 1회 주입 (buildL1CoreBlock; 매 턴은 gist 요약만)
- sessionStore로 세션 시작 기록 + 직전 세션 요약 surface (`recordSessionStart` / `getRecentSessionSummary`)

### Ask first

- 초기화 순서 변경

### Never do

- 사용자 CLAUDE.md 섹션 수정
