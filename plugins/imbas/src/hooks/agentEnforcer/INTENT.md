# agentEnforcer

## Purpose

SubagentStart hook. `agent_type`의 `imbas:` 접두사를 벗겨 AGENT_CONSTRAINTS와 매칭하고, 해당 에이전트의 역할 제약을 additionalContext로 주입 (차단 없음).

## Boundaries

### Always do

- constants에서 에이전트 규칙 참조

### Ask first

- 에이전트 제약 조건 변경

### Never do

- 순환 의존성 도입
