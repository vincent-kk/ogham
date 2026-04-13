# Task 04: AgentRole 타입에 configurator 추가

## Problem

`agents/configurator.md`가 존재하나 `src/types/agent.ts`의 `AgentRole` union에
`'configurator'`가 포함되어 있지 않아 타입 시스템과 불일치한다.

## Files

- `src/types/agent.ts:8-12` — AgentRole union에 `'configurator'` 추가

## Steps

1. `src/types/agent.ts`에서 AgentRole에 `| 'configurator'` 추가

## Expected Result

```typescript
export type AgentRole =
  | 'memory-organizer'
  | 'identity-guardian'
  | 'checkup'
  | 'knowledge-connector'
  | 'configurator';
```

## Verify

```bash
yarn typecheck 2>&1 | tail -5
```

타입 에러 없으면 완료.
