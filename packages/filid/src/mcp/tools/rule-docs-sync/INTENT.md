# rule-docs-sync -- 규칙 문서 동기화 도구

## Purpose

filid-setup 스킬이 사용자 선택에 따라 `.claude/rules/` 경로의 규칙 문서를 배포/제거하는 MCP 도구. 세션 훅에서는 호출 금지.

## Boundaries

### Always do
- 변경 후 관련 테스트 업데이트
- 필수 규칙(`required: true`)은 사용자 선택과 무관하게 항상 배포

### Ask first
- 공개 API 시그니처 변경
- 신규 액션 추가

### Never do
- SessionStart / UserPromptSubmit 훅에서 호출
- `templates/rules/manifest.json`에 등록되지 않은 파일 복사
