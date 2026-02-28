# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is coffaen?

`@ogham/coffaen`은 개인 지식 공간 관리 Claude Code 플러그인이다. 마크다운 기반 Knowledge Graph, Spreading Activation 검색, 기억 라이프사이클 관리를 제공한다.

```
Layer 1 (자동)  → Hooks (SessionStart, PreToolUse, PostToolUse, SessionEnd)
Layer 2 (도구)  → MCP Server (10개 도구: coffaen_* CRUD + kg_* 그래프)
Layer 3 (에이전트) → 3개 특화 에이전트 (memory-organizer, identity-guardian, doctor)
Layer 4 (사용자) → 14개 Skills (/coffaen:setup, /coffaen:remember 등)
```

## Commands

```bash
yarn build          # clean → version:sync → tsc → esbuild (MCP + hooks)
yarn build:plugin   # esbuild 번들만 (tsc 생략)
yarn typecheck      # 타입 체크 (emit 없음)
yarn test           # watch 모드
yarn test:run       # 단일 실행 (CI)
yarn test:coverage  # 커버리지
yarn format && yarn lint  # 포맷 + 린트
yarn version:sync   # 버전 동기화 (package.json → src/version.ts)
```

## Build System

1. **TypeScript 컴파일** (`tsconfig.build.json`): `src/` → `dist/` (ESM + `.d.ts`)
2. **esbuild 번들링**:
   - `scripts/build-mcp-server.mjs`: `src/mcp/server-entry.ts` → `bridge/mcp-server.cjs` (CJS)
   - `scripts/build-hooks.mjs`: `src/hooks/entries/*.entry.ts` → `bridge/*.mjs` (ESM, 각 훅)

`dist/`는 라이브러리 export용, `bridge/`는 MCP 서버 + 훅 런타임용, `libs/`는 런타임 유틸리티(`find-node.sh`).

## Architecture

### 4-Layer Knowledge Model

| Layer | 이름 | 디렉토리 | SA Decay | 설명 |
|-------|------|----------|----------|------|
| L1 | Core Identity Hub | `01_Core/` | 0.5 | 핵심 정체성 (읽기 전용) |
| L2 | Derived Knowledge | `02_Derived/` | 0.7 | 내재화 지식 |
| L3 | External Reference | `03_External/` | 0.8 | 외부 참조 |
| L4 | Action Memory | `04_Action/` | 0.9 | 휘발성 작업 기억 |

### Key Source Directories

| 경로 | 역할 |
|------|------|
| `src/core/` | 핵심 로직 (VaultScanner, DocumentParser, GraphBuilder 등 8개) |
| `src/mcp/` | MCP 서버 + 10개 도구 핸들러 |
| `src/hooks/` | 훅 구현체 + `entries/` (esbuild 진입점) |
| `src/search/` | QueryEngine, ContextAssembler |
| `src/index/` | MetadataStore, IncrementalTracker |
| `src/types/` | 타입 정의 (index.ts에서 중앙 export) |

### MCP Tools (10)

`coffaen_create`, `coffaen_read`, `coffaen_update`, `coffaen_delete`, `coffaen_move` (CRUD)
`kg_build`, `kg_search`, `kg_navigate`, `kg_context`, `kg_status` (그래프)

### Agents (3)

`memory-organizer` (judge/execute seam), `identity-guardian` (L1 보호), `doctor` (진단/복구)

### Skills (14)

`setup`, `remember`, `recall`, `organize`, `reflect`, `build`, `explore`, `doctor`, `rebuild`, `ingest`, `diagnose`, `connect`, `mcp-setup`, `manage`

### Plugin Runtime

- `.claude-plugin/plugin.json` — 매니페스트
- `.mcp.json` — MCP 서버 등록 (`bridge/mcp-server.cjs`)
- `hooks/hooks.json` — 훅 이벤트 매핑 (SessionStart, PreToolUse→Write|Edit, PostToolUse→coffaen_*, SessionEnd)
- `templates/rules/` — 규칙 템플릿 3개 (memory-guard, layer-structure, naming)

## Development Notes

- **훅 수정**: `src/hooks/entries/*.entry.ts` 수정 후 `yarn build:plugin`으로 재빌드
- **버전**: `src/version.ts` 직접 수정 금지 → `yarn version:sync` 사용
- **테스트**: `src/__tests__/`, 단위(`unit/`) + 통합(`integration/`)
