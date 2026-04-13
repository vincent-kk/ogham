# Task 05: knowledge-connector 에이전트 정리

## Problem

`src/types/agent.ts:12`에 `'knowledge-connector'`가 AgentRole로 정의되고
`src/__tests__/integration/agent-collaboration.test.ts`에서 시뮬레이션되지만,
`agents/` 디렉토리에 대응하는 에이전트 정의 파일이 없다.

## Decision: Option A — 에이전트 파일 생성

기존 agent 파일(memory-organizer.md, identity-guardian.md, checkup.md, configurator.md)과
동일한 형식으로 `agents/knowledge-connector.md`를 신규 작성한다.
통합 테스트의 시뮬레이션이 실제 에이전트 정의와 일치하는지 확인한다.

## Files

- `src/types/agent.ts:12`
- `src/__tests__/integration/agent-collaboration.test.ts`
- `agents/` (파일 생성 시)

## Verify

```bash
grep -rn 'knowledge-connector' packages/maencof/src/ packages/maencof/agents/
```
