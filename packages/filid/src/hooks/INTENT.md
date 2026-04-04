# hooks -- Claude Code 훅 구현체

## Purpose

Claude Code 플러그인 훅 이벤트 핸들러를 구현한다. PreToolUse, SubagentStart, UserPromptSubmit, SessionStart, SessionEnd 이벤트를 처리한다.

## Structure

| 모듈 | 역할 |
|------|------|
| `pre-tool-use` | PreToolUse 이벤트 메인 핸들러 |
| `pre-tool-validator` | 도구 입력 유효성 검증 |
| `intent-injector` | INTENT.md 체인 컨텍스트 주입 |
| `structure-guard` | 구조 위반 경고 |
| `agent-enforcer` | 에이전트 역할 강제 |
| `context-injector` | FCA 컨텍스트 주입 |
| `change-tracker` | 변경 추적 (deprecated) |
| `session-cleanup` | 세션 종료 시 캐시 정리 |
| `setup` | 세션 시작 시 초기화 |
| `shared` | 훅 공통 유틸리티 |
| `user-prompt-submit` | 사용자 프롬프트 제출 처리 |
| `utils/` | 훅 내부 유틸리티 (organ) |

## Boundaries

### Always do
- 훅 수정 후 `yarn build:plugin`으로 재빌드

### Ask first
- 새 훅 이벤트 추가 (hooks.json 수정 필요)

### Never do
- entry 파일에 비즈니스 로직 추가

## Dependencies
- `../core/`, `../types/`, `../lib/`
