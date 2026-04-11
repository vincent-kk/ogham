# agent-enforcer -- SubagentStart 역할 강제

## Purpose

SubagentStart 이벤트에서 에이전트 타입을 식별해 FCA 역할 제약·워크플로우 가이드·언어 태그를 `additionalContext`로 주입한다. filid agent(architect, qa-reviewer 등)는 항상, OMC planner/executor 계열은 FCA 프로젝트에서만 주입된다.

## Structure

- `agent-enforcer.ts` — `enforceAgentRole`, `buildLangTag` (internal)
- `agent-enforcer.entry.ts` — esbuild 번들 진입점 (stdin → `enforceAgentRole` → stdout)

## Conventions

- 주입 우선순위 (짧은 회로):
  1. `ROLE_RESTRICTIONS[agentType]` 정확 매치 → 역할 제약 + 언어 태그 (FCA 여부 무관)
  2. `!isFcaProject(cwd)` → continue (비-FCA 프로젝트는 워크플로우 가이드 스킵)
  3. `PLANNING_AGENT_RE` 또는 `'Plan'` → `PLANNING_GUIDANCE` + 언어 태그
  4. `EXECUTOR_AGENT_RE` 또는 `'general-purpose'` → `IMPLEMENTATION_REMINDER` + 언어 태그
- 언어 태그는 `loadConfig` 실패 시 `'en'` 폴백 — 절대 throw 금지
- 모든 상수(`ROLE_RESTRICTIONS` 등)는 `constants/agent-context.ts`에서만 관리

## Boundaries

### Always do

- `validateCwd`를 최우선으로 호출해 payload cwd 검증 (보안 가드)
- 실패 시 `{ continue: true }` 반환 — 에이전트 실행 차단 금지

### Ask first

- 새 에이전트 타입 추가 (`ROLE_RESTRICTIONS` 키 확장)
- 주입 우선순위 순서 변경

### Never do

- 역할 제약 문자열을 모듈 내부에 인라인 (상수 분리 필수)
- `continue: false`로 에이전트 실행 블록

## Dependencies

- `../../core/infra/config-loader/` (`loadConfig`, `resolveLanguage`)
- `../../constants/agent-context.js`, `../../types/hooks.js`
- `../shared/` (`isFcaProject`), `../utils/validate-cwd.js`
