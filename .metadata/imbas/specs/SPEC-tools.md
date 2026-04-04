# SPEC-tools — imbas MCP Tools 정의

> Status: v1.3 (2026-04-04) — Provider-agnostic field names
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. 개요

imbas `tools` MCP 서버의 15개 도구 정의. 내부 전용 — 스킬/에이전트만 호출.
Atlassian 도구는 외부 HTTP MCP(`https://mcp.atlassian.com/v1/mcp`)가 제공.

### 설계 원칙

1. **Plan-then-Execute** — P1-P3은 매니페스트만 생성. Jira 쓰기는 `imbas:manifest` 스킬이 Atlassian MCP 통해 수행.
2. **Tool-mediated access** — `.imbas/` 상태 변경은 모두 도구를 통해 수행.
3. **Idempotent** — 모든 쓰기는 기존 상태 확인 후 수행. Resume == Re-run.
4. **Minimal runtime description** — 도구의 `registerTool` description은 1문장. 상세 스펙은 이 문서에만 기술. LLM 컨텍스트 절약.
5. **Minimal surface** — 스킬/에이전트가 실제 필요한 도구만 노출.

### 도구 총괄

| # | Category | Tool | ReadOnly | Runtime Description |
|---|----------|------|----------|---------------------|
| 1 | Pipeline | `imbas_run_create` | false | Create run directory and state.json |
| 2 | Pipeline | `imbas_run_get` | true | Read state.json for a run |
| 3 | Pipeline | `imbas_run_transition` | false | Typed phase transition (start/complete/escape) |
| 4 | Pipeline | `imbas_run_list` | true | List runs for a project |
| 5 | Manifest | `imbas_manifest_get` | true | Load manifest with summary |
| 6 | Manifest | `imbas_manifest_save` | false | Save manifest (full replace) |
| 7 | Manifest | `imbas_manifest_validate` | true | Validate manifest structure |
| 8 | Manifest | `imbas_manifest_plan` | true | Execution plan from devplan manifest |
| 9 | Config | `imbas_config_get` | true | Read config.json |
| 10 | Config | `imbas_config_set` | false | Update config.json fields |
| 11 | Cache | `imbas_cache_get` | true | Read issue tracker metadata cache |
| 12 | Cache | `imbas_cache_set` | false | Write issue tracker metadata cache |
| 13 | AST | `imbas_ast_search` | true | AST pattern search via @ast-grep/napi |
| 14 | AST | `imbas_ast_analyze` | true | Dependency graph / cyclomatic complexity |
| 15 | Utility | `imbas_ping` | true | Health check |

모든 도구: `destructiveHint: false`, `idempotentHint: true`.

---

## 2. Pipeline State 도구 (4개)

### 2.1 imbas_run_create

새 런 디렉토리와 state.json을 생성한다.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_ref` | string | yes | 프로젝트 참조 (Jira: `"PROJ"`, GitHub: `"owner/repo"`) |
| `source_file` | string | yes | 기획 문서 경로 (로컬 md/txt) |
| `supplements` | string[] | no | 보조 자료 경로 목록 |

**Output:**

```json
{
  "run_id": "20260404-001",
  "run_dir": ".imbas/PROJ/runs/20260404-001",  // GitHub: ".imbas/owner--repo/runs/..."
  "state": { /* RunState 전체 */ }
}
```

**Side Effects:**
- `.imbas/<PROJECT-DIR>/runs/<YYYYMMDD-NNN>/` 디렉토리 생성 (Jira: `<KEY>`, GitHub: `<owner--repo>`)
- 원본 문서 → `source.md` 복사 (원본 불변 원칙)
- 보조 자료 → `supplements/` 복사
- `state.json` 초기화 (`current_phase: "validate"`, 모든 phase `status: "pending"`)

**Run ID 생성 규칙:**
- 포맷: `YYYYMMDD-NNN` (NNN은 001부터 시작)
- 동일 날짜에 기존 디렉토리 존재 시 NNN 증가 (collision-safe)

---

### 2.2 imbas_run_get

런의 state.json을 읽는다.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_ref` | string | no | 미지정 시 config.defaults.project_ref 사용 |
| `run_id` | string | no | 미지정 시 가장 최근 런 |

**Output:**

```json
{
  "state": { /* RunState */ },
  "run_dir": ".imbas/PROJ/runs/20260404-001",  // GitHub: ".imbas/owner--repo/runs/..."
  "manifests_available": ["stories", "devplan"]
}
```

**에러 케이스:**
- state.json 미존재 → `toolError("Run not found: ...")`
- malformed JSON → `toolError("Corrupted state.json at <path>: <parse error>")`

---

### 2.3 imbas_run_transition

타입화된 phase 전이. 제네릭 update가 아닌 discriminated union 기반.

**Input — Discriminated Union on `action`:**

공통 필드:

| Field | Type | Required |
|-------|------|----------|
| `project_ref` | string | yes |
| `run_id` | string | yes |
| `action` | enum | yes |

**Action: `start_phase`**

| Field | Type | Required |
|-------|------|----------|
| `phase` | PhaseName | yes |

**Action: `complete_phase`**

| Field | Type | Required | Phase |
|-------|------|----------|-------|
| `phase` | PhaseName | yes | all |
| `result` | ValidateResult | validate 시 필수 | validate |
| `blocking_issues` | number | no | validate |
| `warning_issues` | number | no | validate |
| `pending_review` | boolean | no (기본: true) | split, devplan |
| `stories_created` | number | no | split |

**Action: `escape_phase`**

| Field | Type | Required |
|-------|------|----------|
| `phase` | `"split"` | yes |
| `escape_code` | EscapeCode | yes |

**전이 규칙:**

| Action | Phase | 전제조건 |
|--------|-------|---------|
| start | validate | 항상 가능 |
| start | split | `validate.status == "completed"` && `result ∈ [PASS, PASS_WITH_WARNINGS]` |
| start | devplan | (`split.status == "completed"` && `!pending_review`) \|\| (`split.status == "escaped"` && `escape_code == "E2-3"`) |
| complete | * | 해당 phase `status == "in_progress"` |
| escape | split | `split.status == "in_progress"`, escape_code 필수 |
| skip | validate, split | 항상 가능 (`pending` 또는 `in_progress` 상태) |

**Action: `skip_phases`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phases` | `PhaseName[]` | yes | 건너뛸 phase 목록 (예: `["validate"]`) |

건너뛴 phase들은 `status → "completed"`, `completed_at → now()`로 자동 설정되며, `current_phase`는 마지막 skipped phase 다음으로 전진한다. `state.metadata.skipped_phases`에 건너뛴 phase 목록이 기록된다.

**코드 참조:** `types/state.ts:112` (Zod schema), `core/state-manager.ts:106` (구현)

**자동 설정:**
- `start_phase`: `status → "in_progress"`, `started_at → now()`
- `complete_phase`: `status → "completed"`, `completed_at → now()`, `current_phase` 다음 phase로 전진
- `escape_phase`: `status → "escaped"`, `escape_code → <code>`
- `skip_phases`: 각 phase `status → "completed"`, `completed_at → now()`, `metadata.skipped_phases` 기록, `current_phase` 전진

**에러 케이스:**
- 전이 규칙 위반 → `toolError("Invalid transition: cannot start split before validate is completed")`
- 잘못된 action/phase 조합 → `toolError("escape_phase is only valid for split phase")`

**Zod 구현:** `z.discriminatedUnion('action', [...])` → `ZodType<object>`. MCP SDK의 `registerTool`이 `ZodRawShape | ZodType<object>` 모두 지원.

---

### 2.4 imbas_run_list

프로젝트의 모든 런을 조회한다.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `project_ref` | string | no |

**Output:**

```json
{
  "runs": [
    { "run_id": "20260404-001", "current_phase": "split", "status": "in_progress", "created_at": "2026-04-04T10:00:00+09:00" }
  ]
}
```

---

## 3. Manifest 도구 (4개)

### 3.1 imbas_manifest_get

매니페스트 파일을 로드하고 요약을 생성한다.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `project_ref` | string | yes |
| `run_id` | string | yes |
| `type` | `"stories"` \| `"devplan"` | yes |

**Output:**

```json
{
  "manifest": { /* StoriesManifest 또는 DevplanManifest 전체 */ },
  "summary": { "total": 5, "pending": 3, "created": 2, "failed": 0 }
}
```

---

### 3.2 imbas_manifest_save

매니페스트 파일을 저장한다 (전체 교체).

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_ref` | string | yes | |
| `run_id` | string | yes | |
| `type` | `"stories"` \| `"devplan"` | yes | |
| `manifest` | object | yes | 전체 매니페스트 (complete replacement) |

**Output:**

```json
{
  "path": ".imbas/PROJ/runs/20260404-001/stories-manifest.json",
  "summary": { "total": 5, "pending": 5, "created": 0, "failed": 0 }
}
```

**Side Effects:**
- Zod 스키마 검증 후 저장
- write-to-temp-then-rename (crash safety)

---

### 3.3 imbas_manifest_validate

매니페스트의 구조적 정합성을 검증한다.

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `project_ref` | string | yes |
| `run_id` | string | yes |
| `type` | `"stories"` \| `"devplan"` | yes |

**Output:**

```json
{
  "valid": false,
  "errors": ["Link target 'S3' not found in stories list"],
  "warnings": ["Story 'S1' has no verification results"]
}
```

**검증 항목:**
- Zod 스키마 적합성
- 내부 ID 일관성 (stories[].id, tasks[].id 중복 없음)
- 링크 대상 존재 (links[].from / links[].to가 유효한 ID)
- devplan: execution_order의 items가 실제 ID 참조

**Note:** validation은 advisory — `manifest_save`가 validation 통과를 요구하지 않음.

---

### 3.4 imbas_manifest_plan

devplan 매니페스트의 실행 계획을 생성한다 (dry-run).

> **devplan 전용.** stories 실행 순서는 고정(Epic→Story→Link)으로 스킬이 직접 처리 (SPEC-skills.md §4.1).

**Input:**

| Field | Type | Required |
|-------|------|----------|
| `project_ref` | string | yes |
| `run_id` | string | yes |

**Output:**

```json
{
  "steps": [
    { "step": 1, "action": "create_tasks", "items": ["T1"], "pending_count": 1 },
    { "step": 2, "action": "create_task_subtasks", "items": ["T1-ST1", "T1-ST2"], "pending_count": 2 },
    { "step": 3, "action": "create_links", "items": ["T1→S1-a"], "pending_count": 1 }
  ],
  "total_pending": 4
}
```

**동작:**
- `devplan-manifest.json`의 `execution_order` 읽음
- `created`/`skipped` 항목 필터링 → `pending`만 포함

---

## 4. Config & Cache 도구 (4개)

### 4.1 imbas_config_get

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field` | string | no | dot-path (예: `"defaults.project_ref"`). 미지정 시 전체 |

**Output:** 전체 config 객체 (wrapper 없음) 또는 field 지정 시 `{ "field": "<dot-path>", "value": <값> }`

---

### 4.2 imbas_config_set

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `updates` | Record<string, unknown> | yes | dot-path 키-값 (예: `{ "defaults.project_ref": "PROJ" }`) |

**Output:** `{ "config": { /* 갱신된 전체 */ } }`

**Side Effects:** config 스키마 검증 후 저장. write-to-temp-then-rename.

---

### 4.3 imbas_cache_get

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_ref` | string | no | 미지정 시 config default |
| `cache_type` | enum | no | `"project-meta"` \| `"issue-types"` \| `"link-types"` \| `"workflows"` \| `"all"` |

**Output:**

```json
{
  "cache": { /* 요청한 캐시 데이터 */ },
  "cached_at": "2026-04-04T10:00:00+09:00",
  "ttl_expired": false
}
```

---

### 4.4 imbas_cache_set

스킬이 Atlassian MCP로 fetch한 메타데이터를 캐시에 저장.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_ref` | string | yes | |
| `cache_type` | enum | yes | `"project-meta"` \| `"issue-types"` \| `"link-types"` \| `"workflows"` |
| `data` | object | yes | 캐시 콘텐츠 (타입별 스키마 검증) |

**Output:**

```json
{
  "path": ".imbas/PROJ/cache/issue-types.json",
  "cached_at": "2026-04-04T10:00:00+09:00"
}
```

**Side Effects:**
- `.imbas/<KEY>/cache/<type>.json` 저장
- `cached_at.json` 자동 갱신 (`cached_at: now(), ttl_hours: 24`)

---

## 5. AST Code Analysis 도구 (2개)

### 설계 배경

Phase 3 (devplan)에서 `imbas-engineer`가 코드베이스를 분석하여 Subtask/Task를 생성할 때, AST 수준 정밀 분석이 필요하다. filid와 독립 배포를 위해 자체 구현 (filid의 `ast-grep-shared.ts` 패턴 적응).

**의존성:** `@ast-grep/napi` 전역 설치 기대 (`npm install -g @ast-grep/napi`).
미설치 → `{ error, sgLoadError }` 반환 → 호출자(스킬/에이전트)가 LLM fallback으로 전환.

### 5.1 imbas_ast_search

AST 패턴 매칭으로 코드를 검색. **읽기 전용** — replace 없음 (imbas는 코드 수정 안 함).

**Input:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pattern` | string | yes | | AST 패턴 (meta-variable: `$VAR`, `$$$VARS`) |
| `language` | string | yes | | 17 languages 지원 (§5.4 참조) |
| `path` | string | no | `"."` | 검색 디렉토리 또는 파일 |
| `context` | number | no | `2` | 매치 주변 컨텍스트 줄 수 |
| `max_results` | number | no | `20` | 최대 결과 수 |

**Output (성공):**

```json
{
  "matches": [
    "src/auth/login.ts:42\n>   42: export async function handleLogin(req: Request) {\n    43:   const token = await generateToken(req.body);"
  ],
  "totalMatches": 3,
  "filesSearched": 127,
  "pattern": "export async function $NAME($$$ARGS) { $$$BODY }"
}
```

**Output (napi 미설치):**

```json
{
  "error": "@ast-grep/napi is not available. Install it with: npm install -g @ast-grep/napi",
  "sgLoadError": "Cannot find module '@ast-grep/napi'"
}
```

**Output (매치 없음):**

```json
{
  "message": "No matches found for pattern: ...",
  "pattern": "...",
  "filesSearched": 127
}
```

---

### 5.2 imbas_ast_analyze

소스 코드의 구조를 분석한다. filid의 `ast_analyze` 서브셋.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | yes | 분석할 소스 코드 |
| `file_path` | string | no | 가상 파일 경로 (기본: `"anonymous.ts"`) |
| `analysis_type` | enum | yes | `"dependency-graph"` \| `"cyclomatic-complexity"` \| `"full"` |

**Output (dependency-graph):**

```json
{
  "imports": [{ "source": "./auth/token.js", "specifiers": ["generateToken", "validateToken"] }],
  "exports": [{ "name": "handleLogin", "type": "function" }],
  "calls": [{ "name": "generateToken", "count": 2 }]
}
```

**Output (cyclomatic-complexity):**

```json
{
  "value": 8,
  "fileTotal": 15,
  "perFunction": { "handleLogin": 5, "validateRequest": 3 }
}
```

**Output (full):** `{ dependencies: {...}, cyclomaticComplexity: {...} }` (위 두 결과 결합)

**Output (napi 미설치):** `{ error, sgLoadError }` (§5.1과 동일)

**제외된 분석 타입 (filid 전용):**
- `lcom4` — Lack of Cohesion 메트릭
- `tree-diff` — AST 시맨틱 diff

---

### 5.3 napi 로딩 전략

```
1. createRequire() (CJS resolution) — NODE_PATH 경로 탐색
2. 실패 시 dynamic import() (ESM fallback)
3. 모두 실패 → sgLoadFailed = true, 세션 내 재시도 안 함
```

filid의 `src/ast/ast-grep-shared.ts` `getSgModule()` 패턴 적응.
CJS 번들(`bridge/mcp-server.cjs`)에서 `import.meta.url` → `__filename` 폴백 포함.

### 5.4 지원 언어 (17)

| Language | Extensions |
|----------|-----------|
| javascript | `.js` `.mjs` `.cjs` `.jsx` |
| typescript | `.ts` `.mts` `.cts` |
| tsx | `.tsx` |
| python | `.py` |
| ruby | `.rb` |
| go | `.go` |
| rust | `.rs` |
| java | `.java` |
| kotlin | `.kt` `.kts` |
| swift | `.swift` |
| c | `.c` `.h` |
| cpp | `.cpp` `.cc` `.cxx` `.hpp` |
| csharp | `.cs` |
| html | `.html` `.htm` |
| css | `.css` |
| json | `.json` |
| yaml | `.yaml` `.yml` |

### 5.5 파일 탐색 규칙

- 언어별 확장자 필터링
- 제외: `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, `venv/`
- 최대 1000파일

---

## 6. AST Fallback 스킬

### 6.1 정의

```yaml
name: imbas-ast-fallback
user_invocable: false
description: LLM-based code analysis fallback when @ast-grep/napi is unavailable.
plugin: imbas
```

**호출 시점:** devplan 스킬 또는 imbas-engineer가 AST 도구 호출 시 napi 에러 감지.

### 6.2 감지 로직

```
IF response.error starts with "@ast-grep/napi is not available"
THEN print warning once per session:
  "[WARN] @ast-grep/napi not installed. Using LLM fallback — results may be approximate."
  "Install: npm install -g @ast-grep/napi"
THEN switch to fallback mode for remaining AST operations
```

### 6.3 Fallback 매핑

| Native 도구 | Fallback 방식 |
|-------------|-------------|
| `imbas_ast_search` | meta-variable → regex 변환 → Grep 검색 → LLM 허위양성 필터링 |
| `imbas_ast_analyze` dependency-graph | Read source → LLM이 import/export/call 패턴 추출 |
| `imbas_ast_analyze` cyclomatic-complexity | Read source → LLM이 분기문(if/for/while/switch/catch/&&/\|\|/?) 카운트 |

### 6.4 Meta-Variable → Regex 변환

| Meta-Variable | Regex | 매치 대상 |
|---------------|-------|---------|
| `$NAME` | `[\w.]+` | 단일 식별자/점 경로 |
| `$VALUE` | `[\w.]+` | 단일 값 표현식 |
| `$TYPE` | `[\w.<>,\[\] ]+` | 타입 어노테이션 |
| `$$$ARGS` | `[\s\S]*?` | 복수 인자 (non-greedy) |
| `$$$BODY` | `[\s\S]*?` | 블록 본문 (non-greedy) |

변환 알고리즘:
1. regex 특수문자 이스케이프 (`$` 제외)
2. `$$$[A-Z_]+` → `[\s\S]*?`
3. `$[A-Z_]+` → `[\w.]+`
4. 공백 → `\s+`

### 6.5 한계

- 정확도: 텍스트 매칭이므로 AST 구조 보장 안 함
- 규모: 500파일 이하 권장
- 미지원: rule-based matching, fix patterns, type-aware matching

---

## 7. Utility 도구 (1개)

### 7.1 imbas_ping

```
Input: (none)
Output: { "status": "ok", "version": "<package version>" }
```

기존 구현을 `server.registerTool()` 패턴으로 마이그레이션.

---

## 8. 도구 접근 제어

### 8.1 스킬별

| Skill | imbas tools | Atlassian tools |
|-------|------------|-----------------|
| setup | config_get, config_set, cache_set | getVisibleJiraProjects, getJiraProjectIssueTypesMetadata, getJiraIssueTypeMetaWithFields, getIssueLinkTypes |
| cache | cache_get, cache_set | (setup과 동일) |
| status | run_get, run_list | — |
| validate | run_create, run_get, run_transition | getConfluencePage, searchConfluenceUsingCql |
| split | run_get, run_transition, manifest_save, manifest_validate | getJiraIssue, searchJiraIssuesUsingJql |
| devplan | run_get, run_transition, manifest_get, manifest_save, manifest_validate, ast_search, ast_analyze | getJiraIssue, searchJiraIssuesUsingJql |
| manifest | manifest_get, manifest_save, manifest_plan | createJiraIssue, createIssueLink, editJiraIssue, transitionJiraIssue, addCommentToJiraIssue, getTransitionsForJiraIssue |
| fetch-media | — | getConfluencePage, fetchAtlassian |
| digest | — | (read-issue 경유) getJiraIssue, addCommentToJiraIssue; (fetch-media 경유) fetchAtlassian |
| read-issue | — | getJiraIssue (본문+코멘트 구조화) |

### 8.2 에이전트별

| Agent | imbas tools | 비고 |
|-------|------------|------|
| imbas-analyst | — | Read/Grep/Glob + Atlassian 읽기만 |
| imbas-planner | — | Read/Grep/Glob + Atlassian 읽기만 |
| imbas-engineer | ast_search, ast_analyze | 코드 탐색 + AST 분석. napi 없으면 fallback |
| imbas-media | — | Read(멀티모달) + Write(analysis.json) |

**핵심:** 에이전트는 pipeline/manifest 도구 미사용. 스킬이 에이전트 결과를 받아 도구로 상태 갱신.

---

## 9. 구현 구조

### 9.1 소스 디렉토리

```
packages/imbas/src/
  ast/                        # @ast-grep/napi 분석
    ast-grep-shared.ts        #   lazy-load + graceful degradation
    dependency-extractor.ts   #   import/export/call 추출
    cyclomatic-complexity.ts  #   CC 계산

  core/                       # 비즈니스 로직
    state-manager.ts          #   state.json CRUD + transition validation
    manifest-parser.ts        #   매니페스트 로딩 + 요약
    manifest-validator.ts     #   스키마 + 참조 정합성
    execution-planner.ts      #   devplan execution_order 필터링
    config-manager.ts         #   config.json CRUD
    cache-manager.ts          #   캐시 CRUD + TTL + cached_at
    run-id-generator.ts       #   YYYYMMDD-NNN (collision-safe)
    paths.ts                  #   .imbas/ 경로 해석

  mcp/
    server.ts                 #   registerTool + wrapHandler
    shared.ts                 #   toolResult, toolError, wrapHandler
    tools/                    #   15개 핸들러 (thin wrapper → core/ast)

  lib/
    file-io.ts                #   JSON read/write (write-to-temp-then-rename)
```

### 9.2 registerTool 패턴

```typescript
// description은 1문장. 상세 스펙은 SPEC-tools.md 참조.
server.registerTool('imbas_run_create', {
  description: 'Create run directory and state.json',
  inputSchema: runCreateSchema,
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
}, wrapHandler(handleRunCreate));
```

### 9.3 wrapHandler 패턴

```typescript
function wrapHandler<T>(
  fn: (args: T) => unknown | Promise<unknown>,
  options?: { checkErrorField?: boolean },
) {
  return async (args: T) => {
    try {
      const result = await fn(args);
      // When checkErrorField is true and result contains an error field,
      // return it as a non-error text response (e.g., AST napi load failure).
      if (options?.checkErrorField && result && typeof result === 'object' && 'error' in result) {
        return { content: [{ type: 'text', text: String(result.error) }] };
      }
      return toolResult(result);
    } catch (error) {
      return toolError(error);
    }
  };
}
```

---

## 10. Deferred

### imbas_manifest_update_item

매니페스트 배치 실행 시 개별 항목 갱신 (전체 매니페스트 대신 단일 item).

```typescript
Input: { project_ref, run_id, type, item_id, updates: { status?, issue_ref? } }
```

**Trigger:** 배치 >20 항목에서 full manifest reload가 컨텍스트 압박을 유발할 때.

---

## Related

- [SPEC-skills.md](./SPEC-skills.md) — 도구를 호출하는 스킬
- [SPEC-agents.md](./SPEC-agents.md) — 도구를 사용하는 에이전트
- [SPEC-state.md](./SPEC-state.md) — 도구가 읽고 쓰는 상태 스키마
- [SPEC-provider.md](./SPEC-provider.md) — Provider 추상화 인터페이스
- [SPEC-provider-jira.md](./SPEC-provider-jira.md) — Jira provider (Atlassian MCP)
- [SPEC-provider-github.md](./SPEC-provider-github.md) — GitHub provider (gh CLI)
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
