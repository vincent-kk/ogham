# hooks

## Purpose
Claude Code lifecycle hook 구현체 모음. 5개 hook 제공.

## Structure
각 하위 모듈은 hook 로직 + entry point 포함.

## Boundaries
### Always do
- 각 hook은 독립적인 fractal 모듈로 유지
- entry point는 stdin → JSON 파싱 → 핸들러 호출 → stdout 패턴 준수
### Ask first
- 새 hook 추가
### Never do
- hook 간 직접 의존성 도입
