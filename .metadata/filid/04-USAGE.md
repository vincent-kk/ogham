# 04. 설치, 설정, 사용 방법

> `@ogham/filid` 1.0 기준. 설치, 빌드, 설정 파일 구조, 스킬/MCP 사용법, 트러블슈팅.

---

## 설치

### 사전 요구사항

| 요구사항    | 최소 버전 | 비고                        |
| ----------- | --------- | --------------------------- |
| Node.js     | >= 20.0.0 | `package.json` engines 명시 |
| Claude Code | 최신      | 플러그인 시스템 지원 버전   |
| Yarn        | 4.x       | 모노레포 workspaces         |

`fs.globSync` / `fs.glob`은 Node 22+ API이므로 사용하지 않는다. 디렉터리 탐색은 `fs.readdirSync(dir, { withFileTypes: true })` 재귀만 쓴다.

### Marketplace 설치

```bash
claude plugin marketplace add https://github.com/vincent-kk/ogham
claude plugin install filid
```

### 런타임 의존성

| 패키지                      | 용도                |
| --------------------------- | ------------------- |
| `@modelcontextprotocol/sdk` | MCP 서버 프레임워크 |
| `zod`                       | 입력 스키마 검증    |

**native 바이너리 의존과 전역 npm 모듈 탐색이 없다.** 1.0은 `@ast-grep/napi`, TypeScript Compiler API, `fast-glob` 없이 설치·실행된다.

---

## 빌드

```bash
yarn install          # 모노레포 루트에서
yarn filid build      # 전체 빌드
```

파이프라인은 다음 순서로 고정되어 있다.

```
clean → version:sync → build:rules → build:pages → build:mcp → build:hooks → build:compile-plugin
```

| 스크립트               | 역할                                    | 산출물                                        |
| ---------------------- | --------------------------------------- | --------------------------------------------- |
| `version:sync`         | `package.json` → 버전 소스와 매니페스트 | `src/version.ts`, `*/plugin.json`             |
| `build:rules`          | built-in rule hash 동기화               | `templates/rules/manifest.json`               |
| `build:pages`          | 설정 UI 인라인 단일 파일                | `public/settings.html`                        |
| `build:mcp`            | MCP 서버 번들 (esbuild, CJS)            | `bridge/mcp-server.cjs`                       |
| `build:hooks`          | 훅 번들 (esbuild, ESM, 훅별 개별)       | `bridge/*.mjs`                                |
| `build:compile-plugin` | plugin-compiler 로 host 어댑터 재생성   | `.codex-plugin/`, `plugin.json`, `hooks.json` |

**`build:compile` (tsc) 단계는 1.0에 없다.** 라이브러리 산출물(`dist/`)을 만들지 않으며 `package.json`은 `private: true`다.

훅·MCP만 빠르게 재빌드하려면:

```bash
yarn filid build:plugin   # = build:pages && build:mcp && build:hooks
```

### 테스트

```bash
yarn filid test:run       # 단일 실행 (CI)
yarn filid typecheck      # 타입 체크
yarn filid test:e2e       # 설정 페이지 Playwright e2e
yarn filid bench:run      # 벤치마크
```

### 릴리스 전 전체 검증 순서

계약 수준 변경([01-ARCHITECTURE의 수용 기준](./01-ARCHITECTURE.md#10-계약-수용-기준))을 건드린 뒤에는 이 순서를 그대로 실행한다.

```bash
yarn filid typecheck
yarn filid test:run
yarn filid build
yarn plugin:adapters:check
yarn filid test:e2e
rg -n "@ast-grep/napi|fast-glob|ast_analyze|ast_grep_search|ast_grep_replace|test_metrics|3\+12|LCOM4|CC_THRESHOLD" plugins/filid --glob '!bridge/**' --glob '!public/**'
git diff --check
git status --short
```

- 앞의 다섯 명령과 `git diff --check`는 exit 0이어야 한다.
- `rg`는 live source·skill·rule에서 매치 0이어야 한다. 남는 매치는 "의존하지 않는다"는 선언, 제거된 도구의 oracle, 훅 번들 가드 자체뿐이다.
- build 후 생성물 diff를 검토해 손편집 흔적이 없어야 한다.
- **canonical 규칙 문서를 고쳤다면 `yarn filid build:rules` 뒤 `rule_docs_sync`로 배포까지 해야 한 단위가 끝난다.** 원본만 고치면 이 저장소의 에이전트가 stale 규칙을 계속 읽는다.

### 생성물 편집 금지

`bridge/`, `public/`, `.codex-plugin/`, 루트 `plugin.json`, `mcp_config.json`, `hooks.json`, `AGENTS.md`, `src/version.ts`는 생성물이다. 손으로 고치지 않고 생성기를 고친다. 특히 루트 `AGENTS.md`의 원본은 `plugins/filid/templates/rules/`의 규칙 문서 4개(`filid_fractal-boundaries.md`, `filid_module-documents.md`, `filid_verification-records.md`, `filid_code-placement.md`)이며, 각각의 해시가 `templates/rules/manifest.json`에 기록된다. Codex는 디렉토리가 아니라 단일 지시 파일만 읽으므로 4개 문서가 `AGENTS.md` 안에서 파일명으로 구분된 marker 구간이 된다.

---

## 설정 파일

### `.filid/config.json` — 프로젝트 설정 (schema 2.0)

```json
{
  "version": "2.0",
  "language": "ko",
  "adapters": {
    "mode": "auto",
    "enabled": ["ecmascript"]
  },
  "rules": {
    "intent-document-contract": { "enabled": true, "severity": "error" },
    "zero-peer-file": { "enabled": true, "severity": "warning" }
  },
  "structure": {
    "maxDepth": 10,
    "additionalOrganNames": ["fixtures"],
    "additionalAllowedPeers": [
      { "basename": "vite.config.ts", "paths": ["packages/*"] }
    ],
    "entryPointOverrides": {
      "ecmascript": ["route.ts", "page.tsx"]
    }
  }
}
```

| 필드                               | 설명                                                              |
| ---------------------------------- | ----------------------------------------------------------------- |
| `version`                          | `"2.0"` 고정                                                      |
| `language`                         | **문서 출력 언어.** 프로그래밍 언어 선택값이 아니다.              |
| `adapters.mode`                    | `auto` = 등록 어댑터의 claim 사용 / `explicit` = `enabled`만 사용 |
| `adapters.enabled`                 | 어댑터 ID 목록. `explicit`인데 비어 있으면 validation error       |
| `rules.<id>`                       | `enabled` · `severity`(`error\|warning\|info`) · `exempt` glob    |
| `structure.maxDepth`               | 트리 깊이 한계 (기본 10)                                          |
| `structure.additionalOrganNames`   | organ으로 취급할 추가 디렉터리 이름                               |
| `structure.additionalAllowedPeers` | fractal root 허용 peer. `paths` glob으로 범위 제한 가능           |
| `structure.entryPointOverrides`    | **key가 adapter ID다.** core가 파일명 의미를 해석하지 않고 전달   |

`entryPointOverrides`로 주입한 경로는 `kind: "executable"`로 보고되어 **노드 분류를 바꾸지 않는다.** `zero-peer-file`의 허용 peer와 `entry-point-surface`의 입력으로만 쓰인다. 디렉터리를 fractal로 만들려면 `INTENT.md`/`DETAIL.md`를 두거나 어댑터가 module index로 인식하는 진입점(예: `index.ts`)을 둔다.

스키마는 `strict`다. 알 수 없는 key는 조용히 무시되지 않고 거부된다.

#### v1 config 이관

v1 config가 발견되면 **읽을 때 메모리에서 v2로 변환**하고 `config-migration-required` 진단을 낸다. **자동으로 파일을 쓰지 않는다.**

- 기존 organ / depth / allowed / entry-point 값은 대응하는 v2 필드로 옮겨진다.
- 제거된 naming rule, route pattern, CC/LCOM4/promotion 설정은 버려지며 각 key가 migration diagnostic에 기록된다.
- 사용자가 `setup`에서 저장을 승인할 때만 v2가 디스크에 기록된다.

### `hooks/hooks.json` — Hook 이벤트 등록

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/setup.mjs\"",
            "timeout": 30
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/user-prompt-submit.mjs\"",
            "timeout": 5
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Read|Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/pre-tool-use.mjs\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

| Hook 이벤트      | matcher             | 스크립트           | timeout |
| ---------------- | ------------------- | ------------------ | ------- |
| SessionStart     | `*`                 | setup              | 30초    |
| UserPromptSubmit | `*`                 | user-prompt-submit | 5초     |
| PreToolUse       | `Read\|Write\|Edit` | pre-tool-use       | 10초    |

`PostToolUse`, `SubagentStart`, `SessionEnd`, `ExitPlanMode` 훅은 1.0에 없다. 실행 진입은 `libs/run.cjs` 크로스 플랫폼 러너가 담당한다.

---

## 스킬 사용법

스킬은 CLI 명령이 아니라 **LLM 프롬프트**다. 자연어 문장이 플래그만큼 잘 동작한다.

### /filid:setup

```
/filid:setup [path]
```

config와 managed rule 문서를 초기화하고, snapshot을 확인한 뒤 누락된 INTENT.md / DETAIL.md를 **제안한다.** 기존 문서를 편집하지 않는다.

### /filid:scan

```
/filid:scan [path]
/filid:scan src/core 쪽만 봐줘
```

전체 FCA 감사의 유일한 진입점. documents / nodes / entry-points / boundaries / dag / verification 전체 scope를 한 snapshot에 대해 평가한다.

> `--fix` 자동 수정은 1.0에 없다. scan은 판정하고, 이동은 `restructure`가, 문서 개선은 `enrich-docs`가 담당한다.

### /filid:context-query

```
/filid:context-query <path 또는 질문>
```

소유 프랙탈과 owner-to-root 최소 문서 체인을 해석한 뒤 3라운드 안에 답한다. 문서 본문은 반환되지 않는다 — 호출자가 필요한 경로만 읽는다.

### /filid:guide

```
/filid:guide organ 디렉터리엔 뭘 두면 돼?
```

현재 트리·분류·검증 finding·배치 규칙을 설명한다. 읽기 전용이다.

### /filid:enrich-docs

```
/filid:enrich-docs [path]
```

snapshot 증거로 INTENT.md / DETAIL.md를 개선한다. **편집 전에 승인을 받고** 편집 후 구조를 검증한다.

### /filid:restructure

```
/filid:restructure <path>
```

읽기 전용 계획 → 사전조건 → 승인 → 외부 실행 → 사후조건. filid는 파일을 옮기지 않는다. 계획과 다른 위치로 옮기면 기능이 동작해도 FAIL이다.

### /filid:cross-review

```
/filid:cross-review
/filid:cross-review https://github.com/owner/repo/pull/123
/filid:cross-review 처음부터 다시 해줘        # force
```

커밋된 파일을 내장 규칙과 저장소 규칙으로 빠짐없이 리뷰하고 FCA 도구 행을 후보에 합친 뒤, 모든 후보를 별도 verifier가 독립 검증한다. verdict는 `APPROVED | REQUEST_CHANGES | INCONCLUSIVE`이며 커밋 변경 범위에만 적용된다. 브랜치에 PR이 있으면 기존 verdict 코멘트를 갱신하고, PR이 없으면 게시하지 않는다.

### /filid:resolve

```
/filid:resolve
/filid:resolve --auto
```

interactive 실행은 모든 confirmed fix를 먼저 보여 준다. `Severity`와 `Category`는 finding의 사실이고, `Recommendation`은 적용 편의와 논쟁성을 따로 판정한다.

```text
Default | ID      | Severity | Category  | Recommendation | Path
[?]     | FIX-004 | error    | structure   | Discuss        | src/api
[x]     | FIX-001 | warning  | contract    | Apply          | src/index.ts
```

`Needs attention`이 기본 선택된 자잘한 correction보다 먼저 나온다. 선택지는 **Apply recommended set**과 **Apply every item**이고, ID별 override나 질문은 자동 제공되는 **Other**에 한 번에 적는다.

```text
apply FIX-001,FIX-003; discuss FIX-004: public API를 유지할 수 있나?;
skip FIX-006: 이번 warning을 유지할 경계 이유; reject FIX-008: 대안과 비용
```

생략한 ID는 표시된 default를 유지한다. discussion 답변과 잘못된 directive도 항목별로 왕복하지 않고 미결 항목 전체를 묶어 처리한다. `skip`은 warning에만 허용되고 error는 apply 또는 근거 있는 reject가 필요하다. 모든 skip/reject 사유는 correction 위임 전에 Context/Decision/Consequences가 완전한지 검증된다.

`--auto`는 sheet를 생략하지 않는다. 원래 Recommendation은 보존하고 Decision만 전부 `[x] Apply (auto-selected)`로 표시한 뒤 질문 없이 진행한다.

### /filid:pipeline

```
/filid:pipeline
```

`pull-request → cross-review → resolve → revalidate`를 연속 실행한다. resolve에는 항상 `--auto`를 전달하므로 전체 decision sheet는 보이지만 모든 항목이 자동 선택되고 prompt는 없다. 개별 override나 discussion이 필요하면 pipeline 대신 `/filid:resolve`를 직접 실행한다.

### /filid:migrate

```
/filid:migrate [path]
```

`CLAUDE.md` → `INTENT.md`, `SPEC.md` → `DETAIL.md`. dry-run 우선 실행 후 검증한다.

---

## MCP 도구 사용법

모든 도구가 동일한 envelope를 반환한다.

```typescript
interface ToolResultEnvelope<Summary, Data> {
  status: "ok" | "violations" | "indeterminate" | "unsupported";
  summary: Summary;
  data?: Data; // 16 KiB 초과 시 생략되고 artifact로 이동
  artifact?: ToolArtifact;
  diagnostics: ToolDiagnostic[];
}
```

### fractal_scan

```json
{ "path": "/repo", "depth": 3, "detail": "summary" }
```

`detail`은 `summary | paths | full`. summary만 요청하면 대형 트리를 인라인하지 않는다.

### context_resolve

```json
{
  "path": "/repo",
  "requests": [{ "targetPath": "/repo/src/core/restructure" }]
}
```

```json
{
  "status": "ok",
  "summary": {
    "projectRoot": "/repo",
    "requestCount": 1,
    "resolvedCount": 1,
    "failedCount": 0,
    "indeterminateCount": 0
  },
  "data": {
    "results": [
      {
        "index": 0,
        "resolved": true,
        "targetPath": "/repo/src/core/restructure",
        "status": "ok",
        "summary": {
          "targetPath": "/repo/src/core/restructure",
          "ownerFractalPath": "/repo/src/core/restructure",
          "chainLength": 2,
          "chainPaths": ["/repo/src/core/restructure", "/repo"],
          "nearestDetailPath": "/repo/src/core/restructure/DETAIL.md",
          "outputLanguage": "ko",
          "diagnosticsOutOfScope": 0
        },
        "resolution": {
          "targetPath": "/repo/src/core/restructure",
          "ownerFractalPath": "/repo/src/core/restructure",
          "chain": [
            {
              "fractalPath": "/repo/src/core/restructure",
              "intentPath": "/repo/src/core/restructure/INTENT.md",
              "detailPath": "/repo/src/core/restructure/DETAIL.md",
              "documentStatus": "valid"
            },
            {
              "fractalPath": "/repo",
              "intentPath": "/repo/INTENT.md",
              "detailPath": "/repo/DETAIL.md",
              "documentStatus": "valid"
            }
          ],
          "nearestDetailPath": "/repo/src/core/restructure/DETAIL.md",
          "outputLanguage": "ko"
        },
        "diagnostics": []
      }
    ]
  },
  "diagnostics": []
}
```

여러 target은 `requests`에 함께 넣는다. 한 호출은 document-only snapshot을 한 번 만들고 결과 순서와 개수를 보존한다. 일부 target 해석 실패는 해당 `resolved: false` item으로 남고 나머지 성공 결과는 유지된다. 단일 target도 길이 1의 배열을 사용한다.

### restructure_plan

```json
{
  "path": "/repo",
  "requests": [
    {
      "sourcePath": "/repo/src/shared/formatDate.ts",
      "contractIntent": "unknown"
    }
  ]
}
```

`consumerPaths`를 생략하면 dependency graph의 incoming edge로 계산한다. `contractIntent`가 생략되면 `unknown`이며, 독립성 증거가 없으면 `targetNodeType: "undetermined"`인 unresolved move로 남는다. `organNameHint`는 이름 제안일 뿐 LCA와 boundary 사후조건을 바꾸지 못한다.

**크기와 무관하게 항상 plan artifact를 남긴다.**

### structure_validate

```json
{
  "path": "/repo",
  "mode": "project",
  "scopes": ["documents", "dag"]
}
```

`mode`는 `project | plan-precondition | plan-postcondition`. plan mode에서는 `planPath`가 필수다. `scopes`를 생략하면 전부 검사한다.

### verification_scan

```json
{ "path": "/repo", "detail": "summary" }
```

summary는 `specDocument`와 `testRecord`별로 `fileCount`, `knownCaseCount`, `caseCap`을 분리하고 전체 `fragmentationCount`, `violationCount`, certainty를 함께 반환한다.

### review_state

```json
{
  "action": "prepare",
  "projectRoot": "/repo",
  "branchName": "feat/x",
  "baseRef": "main"
}
```

`prepare | checkpoint | scope | seal | cleanup | assess`. `scope`는 prepared state에서 커밋 변경 roster와 changed-scope FCA 후보를 모아 canonical `evidence.md`를 쓴다. `cleanup`은 리터럴 `confirm: true`를 요구한다.

---

## 트러블슈팅

### MCP 서버가 시작되지 않음

**증상**: 도구 호출 시 "MCP server not found" 또는 timeout.

1. `bridge/mcp-server.cjs` 미존재 → `yarn filid build:mcp`
2. Node.js < 20 → 업그레이드

> 1.0은 external 의존이 0개다. `typescript`나 `@ast-grep/napi` 전역 설치 문제로 서버가 뜨지 않는 상황은 더 이상 발생하지 않는다.

### Hook이 동작하지 않음

**증상**: INTENT.md 50줄을 넘겨도 차단되지 않음.

1. `bridge/*.mjs` 미존재 → `yarn filid build:hooks`
2. `hooks.json`의 `${CLAUDE_PLUGIN_ROOT}` 치환 확인
3. `libs/run.cjs` 미존재 → `yarn filid build`

### mutation이 한 번 거부됨

**증상**: `[filid:gate] First mutation in module '...' before its INTENT.md pointer was delivered this session.`

정상 동작이다. 블록의 `intent:` 경로에 있는 INTENT.md를 읽고 **같은 호출을 그대로 재시도하면 통과한다.**

### 빌드가 훅 크기로 실패

**증상**: `Hook bundle guards` 실패 또는 금지 모듈 감지.

훅 도달 코드가 배럴(`index.js`)을 import했을 가능성이 높다. esbuild가 배럴이 재노출하는 모듈 전체를 끌어온다. **구체 파일 경로로 직접 import**한다 (예: `../shared/shared.js`). typecheck는 이것을 잡지 못한다.

### config가 저장되지 않음

v1 config는 읽을 때 메모리에서만 v2로 변환된다. 디스크 기록은 `setup`에서 사용자가 저장을 승인할 때만 일어난다. `config-migration-required` 진단이 보이면 의도된 동작이다.

### scan 결과가 잘려 보임

16 KiB를 넘으면 `data`가 artifact로 이동한다. envelope의 `artifact.path`를 읽는다. artifact는 임시 자료다. 사라졌으면 snapshot을 다시 만들고 재실행한다.

### organ 파일 참조가 `external-import-boundary` 위반으로 잡힘

먼저 소비자가 **어디에 앉아 있는지**를 본다. 소유 프랙탈 subtree 안에서의 직접 참조는 위반이 아니다 — 그런데도 잡힌다면 소비자가 소유자 밖에 있는 것이다.

해소책은 셋이며 finding이 세 가지를 모두 제시한다.

1. **organ을 fractal로 승격** — 외부 계약이 실재한다면 문서와 진입점을 준다.
2. **소비자들의 lowest common fractal로 이동** — `restructure_plan`이 목표 경로를 계산한다.
3. **면책 선언** — 소유 프랙탈의 `DETAIL.md`에 조건부 섹션을 추가한다.

```md
## Boundary Exemptions

### /abs/path/to/owner/utils — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: allowed
- **Reason**: 훅 번들이 배럴을 import하면 배럴이 재수출하는 모듈 전체가 번들에 들어온다.
```

네 조건이 모두 맞아야 면책이 인정된다: organ path 일치 · `Direct import: allowed` · 소비자 glob 매치 · `Reason` 비어 있지 않음. **`Reason`을 비우면 면책이 무효가 될 뿐 아니라 `detail-document-contract` finding이 하나 더 붙는다.**

### 스킬·문서 디렉터리에 INTENT.md를 요구받음

1.0에서는 발생하지 않는다. 문서도 module index도 없는 디렉터리는 `organ`으로 분류되므로 문서 계약이 적용되지 않는다. 여전히 발생한다면 그 디렉터리에 `INTENT.md`/`DETAIL.md`가 이미 있거나, 어댑터가 `index.ts` 같은 module index를 인식한 것이다. `entryPointOverrides`에 `SKILL.md` 같은 항목을 넣어도 분류는 바뀌지 않는다.

---

## 관련 문서

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — 설정이 전체 구조에서 차지하는 위치
- [03-LIFECYCLE.md](./03-LIFECYCLE.md) — 각 스킬의 상세 워크플로우
- [05-COST-ANALYSIS.md](./05-COST-ANALYSIS.md) — 빌드 산출물 크기 분석
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 스킬이 시행하는 규칙 상세
- [08-API-SURFACE.md](./08-API-SURFACE.md) — 도구 입력 스키마와 DTO
