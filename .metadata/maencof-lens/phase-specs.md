# maencof-lens Phase Specifications

Each phase is detailed enough for a developer to implement without ambiguity.

---

## Phase 1: Package Scaffolding + Config System

### Objective
Create the `packages/maencof-lens` package structure and the config loader that reads `.maencof-lens/config.json` from the development context.

### Deliverables

#### 1.1 Package Infrastructure

**`package.json`**:
```jsonc
{
  "name": "@ogham/maencof-lens",
  "version": "0.0.1",
  "description": "Read-only vault knowledge access plugin for Claude Code",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "bridge", "libs", "hooks", "skills", ".claude-plugin", ".mcp.json"],
  "dependencies": {
    "@ogham/maencof": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.26.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "esbuild": "^0.24.0",
    "typescript": "^5.7.2",
    "@vitest/coverage-v8": "^3.2.4"
  },
  "scripts": {
    "clean": "rm -rf bridge",
    "version:sync": "node scripts/inject-version.mjs",
    "build": "yarn clean && yarn version:sync && tsc -p tsconfig.build.json && node scripts/build-mcp-server.mjs && node scripts/build-hooks.mjs",
    "build:plugin": "node scripts/build-mcp-server.mjs && node scripts/build-hooks.mjs",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "engines": { "node": ">=20.0.0" }
}
```

**`tsconfig.json`**: Extend from root or match filid/maencof pattern. Target ES2022, module NodeNext.

**`tsconfig.build.json`**: Emit to `dist/`, include `src/`, exclude tests.

#### 1.2 Config Schema (`src/config/config-schema.ts`)

```typescript
import { z } from 'zod';

export const VaultConfigSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  layers: z.array(z.number().int().min(1).max(5)).default([2, 3, 4, 5]),
  default: z.boolean().optional().default(false),
});

export const LensConfigSchema = z.object({
  version: z.string().default('1.0'),
  vaults: z.array(VaultConfigSchema).min(1),
});

export type VaultConfig = z.infer<typeof VaultConfigSchema>;
export type VaultConfig = z.infer<typeof VaultConfigSchema>;
export type LensConfig = z.infer<typeof LensConfigSchema>;
```

#### 1.3 Config Loader (`src/config/config-loader.ts`)

```typescript
export function loadConfig(projectRoot: string): LensConfig | null;
export function writeConfig(projectRoot: string, config: LensConfig): void;
export function createDefaultConfig(vaultPath: string, vaultName: string): LensConfig;
```

**Behavior**:
- Config path: `<projectRoot>/.maencof-lens/config.json`
- Returns `null` if file not found or invalid JSON
- Validates with `LensConfigSchema.safeParse()` — returns `null` on validation failure
- `writeConfig` creates `.maencof-lens/` directory if needed
- `createDefaultConfig` generates a single-vault config with defaults

#### 1.4 Default Config Factory (`src/config/defaults.ts`)

```typescript
export const DEFAULT_LAYERS = [2, 3, 4, 5] as const;
export const CONFIG_DIR = '.maencof-lens';
export const CONFIG_FILE = 'config.json';
```

### Acceptance Criteria
- [ ] `yarn typecheck` passes
- [ ] `loadConfig` returns valid `LensConfig` from a well-formed JSON file
- [ ] `loadConfig` returns `null` for missing/invalid config
- [ ] `writeConfig` creates directory and writes valid JSON
- [ ] `createDefaultConfig` produces a config that passes schema validation
- [ ] Config schema rejects: empty vaults array, missing name/path, layer outside 1-5

---

## Phase 2: MCP Server + Vault Router + Graph Cache

### Objective
Build the MCP server skeleton, multi-vault routing logic, and per-vault graph cache manager.

### Deliverables

#### 2.1 Vault Router (`src/vault/vault-router.ts`)

```typescript
export class VaultRouter {
  constructor(config: LensConfig);
  resolve(vaultName?: string): VaultConfig;
  getDefault(): VaultConfig;
  listVaults(): VaultConfig[];
}
```

**Behavior**:
- `resolve(name)` — finds vault by name; throws descriptive error if not found
- `resolve(undefined)` — returns default vault
- Default vault: first vault with `default: true`, or first in array if none marked
- Validates vault path existence at resolution time (warn, don't block)

#### 2.2 Graph Cache Manager (`src/vault/graph-cache.ts`)

```typescript
export class GraphCache {
  getGraph(vaultPath: string): Promise<KnowledgeGraph | null>;
  invalidate(vaultPath: string): void;
  invalidateAll(): void;
  isLoaded(vaultPath: string): boolean;
}
```

**Behavior**:
- Stores `Map<string, KnowledgeGraph>` in memory
- `getGraph`: cache miss → `new MetadataStore(vaultPath).loadGraph()` → cache + return
- No TTL; cache lives for server process lifetime (= Claude Code session)
- No auto-rebuild (read-only principle; unlike maencof server's `ensureFreshGraph`)

#### 2.3 Stale Detector (`src/vault/stale-detector.ts`)

```typescript
export interface StaleInfo {
  isStale: boolean;
  indexMtime: number | null;   // null if index doesn't exist
  newestFileMtime: number;
  staleSince?: string;         // human-readable duration
}

export function detectStale(vaultPath: string): Promise<StaleInfo>;
```

**Behavior**:
- Compare `.maencof/index.json` mtime against vault markdown files' max mtime
- Uses `MetadataStore.loadStaleNodes()` directly (method exists on MetadataStore)
- Returns structured info; caller decides how to present warnings

#### 2.4 MCP Server (`src/mcp/server.ts`)

```typescript
export function createServer(config: LensConfig): McpServer;
```

**Behavior**:
- Creates `McpServer({ name: 'maencof-lens', version: VERSION })`
- Instantiates `VaultRouter` and `GraphCache` from config
- Registers 5 read-only tools (Phase 3 implementations)
- Each tool handler:
  1. Resolves vault from `args.vault` parameter
  2. Gets graph from cache
  3. Applies layer guard
  4. Calls maencof handler
  5. Returns filtered result

#### 2.5 Server Entry (`src/mcp/server-entry.ts`)

```typescript
// Load config from CWD
// Create server
// Connect to StdioServerTransport
```

**Behavior**:
- Reads config from `process.cwd()` (or env override)
- If no config found, server starts but all tools return helpful error messages
- Connects to `StdioServerTransport`

#### 2.6 Shared Utilities (`src/mcp/shared.ts`)

- Re-export or copy `toolResult` / `toolError` from `@ogham/maencof`
- Add `lensError(message)` helper for lens-specific errors

### Acceptance Criteria
- [ ] `VaultRouter` resolves by name and returns default when name omitted
- [ ] `VaultRouter` throws descriptive error for unknown vault name
- [ ] `GraphCache` lazy-loads graph on first access per vault
- [ ] `GraphCache` returns cached graph on subsequent access (no reload)
- [ ] `GraphCache.invalidate` forces reload on next access
- [ ] `detectStale` correctly identifies stale vs fresh index
- [ ] MCP server starts and responds to `initialize` request
- [ ] Server gracefully handles missing config (tools return error messages)

---

## Phase 3: Tool Wrappers with Layer Filtering

### Objective
Implement 5 read-only tool wrappers that delegate to maencof handlers with layer filtering applied.

### Deliverables

#### 3.1 Layer Guard (`src/filter/layer-guard.ts`)

```typescript
export function computeEffectiveLayers(
  vaultLayers: number[],
  toolLayerFilter?: number[],
): number[];

export function filterResultsByLayer<T extends { layer?: number }>(
  results: T[],
  effectiveLayers: number[],
): T[];
```

**Behavior**:
- `computeEffectiveLayers`: intersection of vault config layers and tool param
- If intersection is empty, fall back to vault layers (ignore invalid tool filter)
- `filterResultsByLayer`: generic post-filter for result arrays

#### 3.2 lens_search (`src/tools/lens-search.ts`)

**MCP Tool Definition**:
```
name: lens_search
description: Search vault knowledge via Spreading Activation from seed keywords.
inputSchema:
  - vault: string (optional, default vault if omitted)
  - seed: string[] (required, min 1)
  - max_results: number (optional, default 10)
  - decay: number (optional, default 0.7)
  - threshold: number (optional, default 0.1)
  - max_hops: number (optional, default 5)
  - layer_filter: number[] (optional, intersected with vault config)
  - sub_layer: enum (optional)
```

**Implementation**:
1. Resolve vault → get graph
2. `effectiveLayers = computeEffectiveLayers(vault.layers, args.layer_filter)`
3. Call `handleKgSearch(graph, { ...args, layer_filter: effectiveLayers })`
4. If error result → rewrite error message (remove maencof-specific references)
5. Return result

#### 3.3 lens_context (`src/tools/lens-context.ts`)

**MCP Tool Definition**:
```
name: lens_context
description: Assemble a token-budgeted context block from vault documents matching a query.
inputSchema:
  - vault: string (optional)
  - query: string (required)
  - token_budget: number (optional, default 2000)
  - include_full: boolean (optional, default false)
  - layer_filter: number[] (optional)
```

**Implementation**:
1. Resolve vault → get graph
2. Compute effective layers
3. Call `handleKgContext(graph, { ...args }, vaultPath)`
4. Post-filter: remove context items where `item.layer NOT IN effectiveLayers`
5. Return result

**⚠️ Known v1 Limitation**: `handleKgContext` internally calls `query()` without `layerFilter`.
Token budget is consumed by all-layer results before post-filtering. Effective utilization
drops proportionally to excluded-layer content ratio.
**v1.1 Fix**: Add optional `layer_filter` to `handleKgContext` in `@ogham/maencof` (3-line change).

#### 3.4 lens_navigate (`src/tools/lens-navigate.ts`)

**MCP Tool Definition**:
```
name: lens_navigate
description: Explore graph neighbors (inbound/outbound links, parent/child) of a specific node.
inputSchema:
  - vault: string (optional)
  - path: string (required)
  - include_inbound: boolean (optional, default true)
  - include_outbound: boolean (optional, default true)
  - include_hierarchy: boolean (optional, default true)
```

**Implementation**:
1. Resolve vault → get graph
2. Compute effective layers
3. Check target node's layer against effective layers (if excluded → error)
4. Call `handleKgNavigate(graph, args)`
5. Post-filter: remove neighbor nodes from excluded layers
6. Return result

#### 3.5 lens_read (`src/tools/lens-read.ts`)

**MCP Tool Definition**:
```
name: lens_read
description: Read a single vault document with optional related context.
inputSchema:
  - vault: string (optional)
  - path: string (required)
  - depth: number (optional, default 2)
  - include_related: boolean (optional, default true)
```

**Implementation**:
1. Resolve vault → vaultPath
2. Compute effective layers
3. Call `handleMaencofRead(vaultPath, args)` — note: handler takes `(vaultPath, input)`, NOT graph
4. Check `result.node.layer` (from frontmatter) against effective layers
   - If excluded → return error: "Document is in a restricted layer (L{n})"
5. Return result (note: `handleMaencofRead` does not populate `related` results, so no post-filtering needed)

#### 3.6 lens_status (`src/tools/lens-status.ts`)

**MCP Tool Definition**:
```
name: lens_status
description: Check vault index status including node count, staleness, and health.
inputSchema:
  - vault: string (optional)
```

**Implementation**:
1. Resolve vault → get graph
2. Call `handleKgStatus(vaultPath, graph, {})`
3. Add stale warning from `detectStale(vaultPath)` if applicable
4. Append message: "This is a read-only view. To rebuild, run kg_build in a maencof session."
5. Return enriched result

### Acceptance Criteria
- [ ] All 5 tools return valid MCP responses
- [ ] Layer filtering correctly intersects vault config and tool parameter
- [ ] L1 documents are hidden by default (default layers = [2,3,4,5])
- [ ] `lens_read` rejects documents in excluded layers
- [ ] `lens_navigate` filters neighbor lists by effective layers
- [ ] `lens_search` passes effective layers to handler
- [ ] `lens_context` post-filters assembled items (token budget limitation documented)
- [ ] `lens_status` includes stale warning when applicable
- [ ] Error messages do not reference maencof-specific commands (/maencof:build)
- [ ] Each tool accepts `vault` parameter and routes to the correct vault
- [ ] Omitting `vault` parameter uses the default vault

---

## Phase 4: Hooks (SessionStart + Prompt Injection)

### Objective
Implement the SessionStart hook that detects lens config and injects a system prompt.

### Deliverables

#### 4.1 Session Start Hook (`src/hooks/session-start.ts`)

```typescript
export interface LensSessionStartResult {
  continue: boolean;
  message?: string;
}

export function runSessionStart(input: { cwd?: string }): LensSessionStartResult;
```

**Behavior**:
1. `cwd = input.cwd ?? process.cwd()`
2. Check `.maencof-lens/config.json` exists in cwd
   - Not found → `{ continue: true }` (silent exit, not a lens project)
3. Load + validate config
   - Invalid → `{ continue: true, message: "[maencof:lens] Invalid config..." }`
4. For each vault, run lightweight stale check
5. Build prompt injection message:

```markdown
# [maencof:lens] Read-only vault access enabled.

Vault knowledge is available for reference during development.

## Available Tools
- lens_search: Keyword-based knowledge search (Spreading Activation)
- lens_context: Token-budgeted context assembly
- lens_navigate: Graph neighbor exploration
- lens_read: Single document reader
- lens_status: Vault health check

## Registered Vaults
- {name} ({path}) [default] — {status}
- {name} ({path}) — {status}

## Usage Guidelines
- Use when you need design references, architecture docs, or technical knowledge
- Vault data is read-only — modifications require a maencof session
- Default layer filter: L2-L5 (L1 Core Identity is private)
```

6. Return `{ continue: true, message: injectedPrompt }`

#### 4.2 Hook Entry Point (`src/hooks/entries/session-start.entry.ts`)

```typescript
// Thin entry for esbuild bundling
import { runSessionStart } from '../session-start.js';
const result = runSessionStart({ cwd: process.cwd() });
if (result.message) {
  process.stdout.write(JSON.stringify({
    type: 'system-prompt-injection',
    content: result.message,
  }));
}
```

Pattern follows maencof's hook entries: minimal wrapper that calls the implementation and writes JSON to stdout.

#### 4.3 Hook Registration (`hooks/hooks.json`)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "[ -z \"${CLAUDE_PLUGIN_ROOT}\" ] && exit 0; ${CLAUDE_PLUGIN_ROOT}/libs/find-node.sh \"${CLAUDE_PLUGIN_ROOT}/bridge/session-start.mjs\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### Acceptance Criteria
- [ ] Hook runs silently when no `.maencof-lens/config.json` exists
- [ ] Hook injects prompt with vault list when config is valid
- [ ] Stale vaults show warning in the injected prompt
- [ ] Invalid config produces a warning message (not a crash)
- [ ] Hook completes within 5 second timeout
- [ ] Missing vault paths show warning but don't block hook execution

---

## Phase 5: Skills

### Objective
Create the `setup-lens` skill for managing `.maencof-lens/config.json` interactively.

### Deliverables

#### 5.1 setup-lens Skill (`skills/setup-lens/SKILL.md`)

**Name**: `setup-lens`
**Plugin prefix**: `/maencof-lens:setup-lens`
**User-invocable**: true

**Subcommands**:
- `init` — Interactive setup: ask for vault path + name, create config
- `add <name> <path>` — Add a vault to existing config
- `remove <name>` — Remove a vault from config
- `show` — Display current config
- `set-default <name>` — Change default vault
- `set-layers <name> <layers>` — Update layer filter for a vault

**Workflow** (follows fca-config pattern):
1. Resolve config path: `<cwd>/.maencof-lens/config.json`
2. For `init`: check if config exists → if yes, show current + ask to overwrite
3. For mutations: load → validate → mutate → write → read-back verify
4. Display result table with vault names, paths, layers, default status

### Acceptance Criteria
- [ ] `init` creates `.maencof-lens/config.json` with at least one vault
- [ ] `add` appends vault to existing config
- [ ] `remove` removes vault and adjusts default if needed
- [ ] `show` displays formatted vault table
- [ ] `set-default` updates default flag correctly
- [ ] Validates vault path exists before adding

---

## Phase 6: Build System + Plugin Manifest

### Objective
Set up the build pipeline and plugin manifest files for Claude Code plugin distribution.

### Deliverables

#### 6.1 Build Scripts

**`scripts/build-mcp-server.mjs`**:
- Entry: `src/mcp/server-entry.ts`
- Output: `bridge/mcp-server.cjs`
- Format: CJS, bundled, minified, node20 target
- External: none (bundle everything including @ogham/maencof)
- Pattern: copy from maencof's build script

**`scripts/build-hooks.mjs`**:
- Entry: `src/hooks/entries/session-start.entry.ts`
- Output: `bridge/session-start.mjs`
- Format: ESM, bundled, node20 target
- Pattern: copy from maencof's build script

**`scripts/inject-version.mjs`**:
- Reads version from `package.json`
- Writes to `src/version.ts`: `export const VERSION = '0.0.1';`
- Also updates `.claude-plugin/plugin.json` version field
- Pattern: copy from filid/maencof

#### 6.2 Plugin Manifest (`.claude-plugin/plugin.json`)

```json
{
  "name": "maencof-lens",
  "version": "0.0.1",
  "description": "Read-only vault knowledge access for development contexts",
  "author": { "name": "Vincent K. Kelvin" },
  "repository": "https://github.com/vincent-kk/ogham",
  "homepage": "https://github.com/vincent-kk/ogham/tree/main/packages/maencof-lens",
  "license": "MIT",
  "keywords": ["claude-code", "plugin", "knowledge-graph", "read-only", "lens"],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

#### 6.3 MCP Registration (`.mcp.json`)

```json
{
  "mcpServers": {
    "t": {
      "command": "${CLAUDE_PLUGIN_ROOT}/libs/find-node.sh",
      "args": ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"]
    }
  }
}
```

Pattern matches maencof's `.mcp.json` (using `find-node.sh` wrapper).

#### 6.4 Node Resolver (`libs/find-node.sh`)

Copy from `packages/maencof/libs/find-node.sh`. This is a shared utility that finds the correct Node.js binary.

#### 6.5 FCA Documentation

**`INTENT.md`** (max 50 lines):
```markdown
## Purpose
Read-only Claude Code plugin providing access to maencof vault knowledge from development contexts.

## Structure
- `src/config/` — Config loader for .maencof-lens/config.json
- `src/vault/` — Multi-vault routing and graph caching
- `src/filter/` — Layer filtering logic
- `src/tools/` — 5 MCP tool wrappers (lens_search/context/navigate/read/status)
- `src/mcp/` — MCP server setup
- `src/hooks/` — SessionStart prompt injection

## Conventions
- All vault access is read-only; never write to vault filesystem
- Import handlers from @ogham/maencof; never duplicate logic
- Layer filtering: vault config ceiling intersected with per-call filter

## Boundaries

### Always do
- Validate vault path existence before graph loading
- Apply layer guard on every tool call
- Include stale index warnings in status responses

### Ask first
- Adding new MCP tools beyond the 5 read-only set
- Changing the layer filtering intersection logic

### Never do
- Write to vault filesystem (documents, index, metadata)
- Call kg_build or any mutation handler from maencof
- Bypass layer filtering for any tool
```

**`DETAIL.md`**: Define API contracts for 5 tools, config schema, hook behavior.

**`CLAUDE.md`**: Package-level guidance following filid/maencof pattern.

#### 6.6 Monorepo Integration

- Add `"maencof-lens": "yarn workspace @ogham/maencof-lens"` to root `package.json` scripts
- Verify `yarn build:all` includes the new package
- Verify `yarn test:run` includes the new package

### Acceptance Criteria
- [ ] `yarn build` produces `bridge/mcp-server.cjs` and `bridge/session-start.mjs`
- [ ] `yarn typecheck` passes
- [ ] Plugin is loadable by Claude Code (plugin.json valid, .mcp.json valid, hooks.json valid)
- [ ] INTENT.md is under 50 lines with 3-tier boundaries
- [ ] Version sync works: `yarn version:sync` updates version.ts and plugin.json
- [ ] Monorepo scripts (`build:all`, `test:run`) include maencof-lens

---

## Phase 7: Skills + Agent + Prompt Injection 변경

### Objective
2개 신규 스킬(`lookup`, `context`), 1개 에이전트(`researcher`)를 추가하고,
SessionStart 프롬프트 주입을 도구 목록에서 스킬 사용법 안내로 변경한다.

### Deliverables

#### 7.1 lookup Skill (`skills/lookup/SKILL.md`)

**Name**: `lookup`
**Plugin prefix**: `/maencof-lens:lookup`
**User-invocable**: true
**Complexity**: simple

**역할**: 키워드 검색 → 문서 읽기 → 요약. 가장 간단한 vault 지식 조회 진입점.

**Workflow**:
1. 사용자 입력에서 키워드 추출
2. `lens_search(seed: [keywords], max_results: 5)` 호출
3. 검색 결과가 없으면 → "관련 문서를 찾지 못했습니다. 다른 키워드를 시도하세요."
4. 상위 결과에 대해 `lens_read(path: top_result.path)` 호출
5. 문서 내용을 쿼리 컨텍스트에 맞게 요약하여 제시
6. 추가 결과 목록을 함께 표시 (선택적 깊은 조회 안내)

**Options**:
```
/maencof-lens:lookup <keyword> [--vault <name>] [--layer <N>] [--detail]
```

| Option | Default | Description |
|--------|---------|-------------|
| `keyword` | required | 검색 키워드 (자연어 가능) |
| `--vault` | default vault | 대상 vault 지정 |
| `--layer` | vault config | Layer 필터 (vault 상한 내) |
| `--detail` | false | 상위 3개 문서까지 전문 읽기 |

**MCP Tools Used**:
| Tool | Purpose |
|------|---------|
| `lens_search` | SA 기반 문서 검색 |
| `lens_read` | 문서 내용 읽기 |

**Output Format**:
```markdown
## Lookup: "{keyword}"

### {title} (L{layer}, relevance {score}%)
{1-3 paragraph summary}

Path: {path}

---
### Other Results
1. **{title}** — {one-line summary} (L{layer}, {score}%)
2. ...

For deeper exploration: `/maencof-lens:lookup {keyword} --detail`
```

#### 7.2 context Skill (`skills/context/SKILL.md`)

**Name**: `context`
**Plugin prefix**: `/maencof-lens:context`
**User-invocable**: true
**Complexity**: simple

**역할**: 토큰 예산 기반 컨텍스트 조립. 현재 작업에 필요한 vault 지식을 한 블록으로 조립.

**Workflow**:
1. 사용자 입력에서 쿼리와 예산 추출
2. `lens_search(seed: [query keywords], max_results: 10)` 호출하여 관련 문서 식별
3. `lens_context(query, token_budget)` 호출하여 컨텍스트 블록 조립
4. 조립된 컨텍스트를 구조화하여 제시

**Options**:
```
/maencof-lens:context <query> [--budget <N>] [--vault <name>] [--layer <N>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `query` | required | 컨텍스트 조립 쿼리 |
| `--budget` | 2000 | 토큰 예산 |
| `--vault` | default vault | 대상 vault |
| `--layer` | vault config | Layer 필터 |

**MCP Tools Used**:
| Tool | Purpose |
|------|---------|
| `lens_search` | 관련 문서 식별 |
| `lens_context` | 토큰 예산 기반 컨텍스트 조립 |

**Output Format**:
```markdown
## Context: "{query}" (budget: {N} tokens)

{assembled context block}

---
Sources: {N} documents from vault "{vault_name}"
Token usage: ~{used}/{budget}
```

#### 7.3 researcher Agent (`agents/researcher.md`)

**Name**: `researcher`
**Model**: sonnet
**PermissionMode**: default
**MaxTurns**: 30

**역할**: 5개 MCP 도구 모두를 활용한 자율 vault 탐색 에이전트.
스킬이 제공하는 단순 파이프라인으로는 부족한 깊은 탐색이 필요할 때 사용.

**Available Tools**:
- `Read`, `Glob`, `Grep` (파일시스템 접근)
- `mcp__plugin_maencof-lens_t__lens_search`
- `mcp__plugin_maencof-lens_t__lens_context`
- `mcp__plugin_maencof-lens_t__lens_navigate`
- `mcp__plugin_maencof-lens_t__lens_read`
- `mcp__plugin_maencof-lens_t__lens_status`

**Exploration Strategy**:
1. `lens_status` — vault 상태 확인 (stale 여부)
2. `lens_search` — 시드 키워드로 초기 탐색
3. `lens_read` — 상위 결과 문서 읽기
4. `lens_navigate` — 그래프 이웃 탐색 (inbound/outbound/hierarchy)
5. 발견된 이웃 노드에서 2-4 반복 (최대 3라운드)
6. `lens_context` — 최종 컨텍스트 조립

**Trigger Phrases**:
- "vault에서 조사해줘", "vault 탐색", "vault research"
- "vault 지식 찾아줘", "관련 자료 찾아줘"

#### 7.4 프롬프트 주입 변경 (`src/hooks/session-start.ts`)

**변경 전** (도구 목록):
```
Available tools: lens_search, lens_context, lens_navigate, lens_read, lens_status
```

**변경 후** (스킬 사용법):
```
사용 방법:
- /maencof-lens:lookup <키워드>: vault 지식 검색 및 조회
- /maencof-lens:context <쿼리>: 컨텍스트 조립
```

**구현**: `session-start.ts`의 prompt 생성 부분에서 도구 나열을 스킬 안내로 교체.

#### 7.5 plugin.json 업데이트

`agents` 필드 추가:
```json
{
  "skills": "./skills/",
  "agents": "./agents/",
  "mcpServers": "./.mcp.json"
}
```

#### 7.6 CLAUDE.md / INTENT.md 업데이트

CLAUDE.md에 스킬/에이전트 목록 반영:
- **Skills (3)**: `setup-lens`, `lookup`, `context`
- **Agents (1)**: `researcher`

INTENT.md Structure 섹션에 `skills/`, `agents/` 추가.

### Acceptance Criteria
- [ ] `skills/lookup/SKILL.md` — 완전한 스킬 정의, user_invocable: true
- [ ] `skills/context/SKILL.md` — 완전한 스킬 정의, user_invocable: true
- [ ] `agents/researcher.md` — 5개 MCP 도구 참조, trigger phrases 포함
- [ ] `session-start.ts` — 프롬프트에 스킬 사용법 표시, 도구 목록 제거
- [ ] `plugin.json` — agents 필드 추가
- [ ] `CLAUDE.md` — 스킬 3개, 에이전트 1개 반영
- [ ] `INTENT.md` — Structure에 skills/, agents/ 반영 (50줄 이내 유지)
