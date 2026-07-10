# preToolUse

## Purpose

PreToolUse hook. Read/Write/Edit 대상이 `.imbas/` 내부일 때 "MCP 도구 사용 권장" 안내 컨텍스트를 주입 (차단 없음, continue: true 고정).

## Boundaries

### Always do

- 이 모듈의 단일 책임을 유지한다

### Ask first

- 검증 규칙 변경

### Never do

- 순환 의존성 도입
