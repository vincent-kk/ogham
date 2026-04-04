# agent-enforcer

## Purpose
SubagentStart hook. 에이전트 이름 접두사 및 제약 조건 검증.

## Boundaries
### Always do
- constants에서 에이전트 규칙 참조
### Ask first
- 에이전트 제약 조건 변경
### Never do
- 순환 의존성 도입
