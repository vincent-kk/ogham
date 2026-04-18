# CLAUDE.md - @ogham/imbas

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is imbas?

`@ogham/imbas`는 planning 문서를 Jira/GitHub 이슈로 변환하는 파이프라인 플러그인이다. 4-Phase 오케스트레이션으로 작동한다:

```
Phase 1 → validate  (analyst)
Phase 2 → split     (planner + analyst reverse-inference)
Phase 2.5 → manifest-stories (batch Jira/GitHub/local create)
Phase 3 → devplan   (engineer, EARS Subtask generation)
Phase 3.5 → manifest-devplan (batch Task/Subtask create)
```

## Commands

```bash
yarn build          # clean → version:sync → tsc → esbuild
yarn typecheck      # 타입 체크 (emit 없음)
yarn test:run       # 단일 실행 (CI)
yarn format && yarn lint  # 포맷 + 린트
```

## Architecture

### Core Concepts

- **Provider abstraction**: `jira` / `github` / `local` — skill SKILL.md는 `config.provider`로 라우팅
- **Run-based state**: 각 파이프라인 실행은 `run_id`를 갖고 `.imbas/runs/<id>/` 디렉토리에 state 저장
- **Manifest-driven**: stories-manifest.json, devplan-manifest.json이 생성 단위
- **Agent separation**: `analyst` (sonnet, 검증), `planner` (sonnet, 분할), `engineer` (opus, maxTurns:80, 코드 탐색)

### Key Directories

| 경로 | 역할 |
|------|------|
| `src/core/` | state-manager, manifest-parser, config-manager, cache-manager |
| `src/providers/` | jira, github 프로바이더 (local은 core 내장) |
| `src/mcp/tools/` | 16개 MCP 도구 (run_create, manifest_save, manifest_implement_plan 등) |
| `src/hooks/` | pre-tool-use, context-injector, session-cleanup |

### Skills (12)

`imbas-pipeline`, `imbas-validate`, `imbas-split`, `imbas-devplan`, `imbas-manifest`, `imbas-implement-plan`, `imbas-digest`, `imbas-read-issue`, `imbas-scaffold-pr`, `imbas-setup`, `imbas-status`, `imbas-cache`

### Agents (3)

`analyst` (sonnet), `planner` (sonnet), `engineer` (opus, maxTurns:80)

## Anti-Yield Discipline

imbas 파이프라인은 다단계 + Task subagent spawn + Jira `[OP:]` 루프로 turn 끊김에 취약하다. Tier 분류와 3-layer 방어:

- **Tier-1** (파이프라인): `imbas-pipeline` — 상단 EXECUTION MODEL preamble + phase-transition inline directives + DO NOT STOP callouts (Phase 2.5 → Phase 3 경계 + `workflow.md:296,459` 기존 CRITICAL 참조)
- **Tier-2a** (다단계 비상호작용): `imbas-validate`, `imbas-split`, `imbas-devplan`, `imbas-manifest`, `imbas-digest` — 3-layer 동일 적용
- **Tier-2b** (단일 MCP 호출 기반): `imbas-implement-plan` — 간소화된 preamble
- **Tier-3** (단일 phase): `imbas-setup`, `imbas-status`, `imbas-cache`, `imbas-read-issue`, `imbas-scaffold-pr` — preamble 추가 금지

**알려진 한계**: `engineer` (opus, maxTurns:80) subagent-internal 컨텍스트 소진은 preamble로 해결 불가. 체크포인트 파일 계약 follow-up 이슈 참조. 신규 skill 추가 시 `packages/filid/skills/filid-pipeline/SKILL.md:11-24` 3-layer 패턴을 참조.

## Development Notes

- **버전**: `src/version.ts` 직접 수정 금지 → `yarn version:sync` 사용
- **테스트**: `src/**/__tests__/**/*.test.ts`
- **Provider 경계**: skill이 provider X 실행 시 `references/Y/**`를 읽지 않음
