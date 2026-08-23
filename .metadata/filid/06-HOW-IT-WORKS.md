# 06. 내부 동작 메커니즘 상세

> `@ogham/filid` 1.0 기준. 훅 파이프라인, lexical scanner, snapshot과 hash, 의존성 그래프, LCA와 배치 계획, 검증 문서 계산, MCP 라우팅과 envelope.

---

## Hook 파이프라인

### 전체 이벤트 흐름

```
세션 시작
        │
        ▼
┌─ SessionStart (matcher: *, timeout 30s) ─────────────┐
│  setup.mjs                                            │
│  → 캐시 디렉터리 초기화                                │
│  → 만료 세션 파일 정리                                 │
│  → FCA 프로젝트 여부 감지                              │
│  → 항상 continue: true                                 │
└───────────────────────────────────────────────────────┘
        │
        ▼
사용자 프롬프트 입력
        │
        ▼
┌─ UserPromptSubmit (matcher: *, timeout 5s) ──────────┐
│  user-prompt-submit.mjs                               │
│  → 턴당 visit map 리셋                                 │
│  → 세션 첫 프롬프트에만 FCA 규칙 포인터 주입            │
│  → 항상 continue: true (차단 없음)                     │
└───────────────────────────────────────────────────────┘
        │
        ▼ (에이전트가 Read/Write/Edit 호출 시)
        │
┌─ PreToolUse (matcher: Read|Write|Edit, timeout 10s) ─┐
│  pre-tool-use.mjs — 두 관심사를 한 프로세스에서 처리    │
│                                                        │
│  1. context delivery                                   │
│     ├─ 소유 모듈 첫 접근 → [filid:ctx] 블록            │
│     │    ├─ INTENT.md 경로 + 읽기 지시 (본문 없음)      │
│     │    ├─ 부모 체인 INTENT.md 경로 (nearest > root)  │
│     │    └─ DETAIL.md 경로 힌트                        │
│     ├─ 재방문 → [filid:map]만 갱신 (방문 집합 변화 시)  │
│     └─ 전달 캐시가 중복 전달을 막는다                   │
│                                                        │
│  2. write gate                                         │
│     ├─ INTENT.md write → 50줄·3-tier 검증              │
│     ├─ DETAIL.md write → 필수 섹션·acceptance group     │
│     ├─ organ 안 INTENT.md → deny                       │
│     └─ 그 밖 → 통과                                    │
└───────────────────────────────────────────────────────┘
        │ (통과 시)
        ▼
   Tool 실행
```

1.0에는 `PostToolUse`와 `SubagentStart` 훅이 없다. change tracking과 고정 에이전트 역할 제한은 제품 경계에서 제거되었다.

### gate 재시도 계약

모듈 규칙이 아직 전달되지 않은 상태에서 첫 mutation이 들어오면, 훅은 그 호출을 한 번 거부하면서 읽어야 할 INTENT.md 경로와 읽기 지시를 함께 보낸다.

```text
[filid:gate] First mutation in module 'X' before its INTENT.md pointer was
             delivered this session. Read the file at the intent: path below
             now, then retry the same call — the retry will pass.
[filid:ctx]  src/x/file.ts
intent: src/x/INTENT.md
action: READ the intent file above with the Read tool before your next step in this module — its rules are binding and are not reproduced here.
```

**같은 호출을 그대로 재시도하면 통과한다.** 이 설계는 규칙의 위치를 모른 채 하는 첫 편집을 한 번 멈춰 세우면서도 에이전트를 막다른 길에 두지 않는다 — 읽었는지는 증명하지 않으며 읽기는 에이전트의 책임이다.

### Hook 입출력 프로토콜

입력 (stdin JSON):

```json
{
  "cwd": "/path/to/project",
  "session_id": "abc-123",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": { "file_path": "/path/to/INTENT.md", "content": "..." }
}
```

통과:

```json
{ "continue": true }
```

차단 — 해당 도구 호출 **하나만** 막고 턴은 계속된다:

```json
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "BLOCKED: INTENT.md exceeds the 50-line limit (142 lines)."
  }
}
```

`hookSpecificOutput`에는 항상 `hookEventName`이 포함되어야 한다. 이 필드 없이 `additionalContext`만 반환하면 Claude Code가 컨텍스트를 무시할 수 있다.

### 실행 패턴과 격리

모든 엔트리(`src/hooks/<name>/<name>.entry.ts`)는 동일한 형태다.

```
프로세스 시작 → stdin 수집 → JSON.parse → 핸들러 → JSON.stringify → stdout → 종료
```

엔트리 파일에는 로직을 두지 않는다. 그리고 **훅 도달 코드는 배럴(`index.js`)을 import하지 않는다.** 배럴을 거치면 esbuild가 배럴이 재노출하는 모듈 전체를 훅 번들로 끌어온다. typecheck는 이것을 잡지 못하므로 `scripts/buildHooks.mjs`의 바이트 캡과 금지 모듈 가드가 최종 방어선이다.

---

## Lexical scanner

1.0은 native parser도 TypeScript Compiler API도 쓰지 않는다. 어댑터는 작은 어휘 스캐너로 필요한 사실만 모은다.

```
소스 문자열
    │
    ▼  단일 패스 스캔
    │
    ├── 문자열 리터럴 / 템플릿 / 주석 구간 식별  → 그 안은 코드가 아님
    ├── 괄호·중괄호 nesting depth 추적           → top-level 여부 판정
    └── 관심 토큰만 수집
          ├─ import / export 선언과 specifier
          ├─ 진입점 후보의 export 이름
          └─ 검증 파일의 case 호출
    │
    ▼
{ 값, certainty }
```

핵심은 정확도가 아니라 **정직함**이다. 스캐너가 확정할 수 없는 구조를 만나면 값을 지어내지 않고 `indeterminate`를 붙인다.

| certainty       | 의미                                         |
| --------------- | -------------------------------------------- |
| `exact`         | 정적으로 확정된 값                           |
| `indeterminate` | 구조는 인식했으나 값을 확정할 수 없음        |
| `unsupported`   | 어느 어댑터도 이 파일의 소유를 주장하지 않음 |

두 값 모두 **절대 PASS로 변환되지 않는다.**

### 어댑터 소유권 해석

```
파일 → 등록된 어댑터들의 detect(projectRoot) → AdapterClaim { confidence, evidence }
    │
    ├── 최고 confidence 단일 어댑터 → 소유
    ├── 동률 다중 어댑터           → ambiguous-adapter-claim 오류 (임의 소유 금지)
    └── 주장 없음                  → unsupported
```

요청된 어댑터 ID가 등록되지 않았으면 config warning이 아니라 명시적 validation finding을 반환한다.

---

## ProjectSnapshot과 hash

모든 scan, validate, plan이 같은 snapshot을 소비한다.

```
projectRoot
    │
    ▼
1. adapter 선택 (auto: claim 기반 / explicit: config의 enabled)
    │
    ▼
2. 디렉터리 traversal (fs.readdirSync withFileTypes 재귀)
   → SCAN_SKIP_DIRS / exclude glob 적용
   → git이 무시하면서 추적하지도 않는 경로 제외 (traversal당 git 1회)
   → maxDepth는 traversal 절단이 아니라 검증 한계로 적용
     (초과 node도 진단 대상에 남는다)
    │
    ▼
3. node classification (분류 우선순위 1~8, 기본값 organ)
   → 5단계는 kind: "module" 진입점만 읽는다
    │
    ▼
4. adapter 증거 수집
   ├─ entry points (경로 + kind + surface)
   ├─ dependency references (raw specifier + resolved path + kind)
   └─ verification files (role + case count + contract group IDs)
    │
    ▼
5. document evidence (INTENT/DETAIL 상태 + 선언된 organ 면책)
   → boundaryExemptions의 targetPath는 소유 프랙탈 기준 절대 경로로 정규화된다
    │
    ▼
6. legacy evidence (.filid/criteria.md 존재 여부와 이관 대상 경로)
    │
    ▼
7. snapshotHash = SHA-256(정렬된 상대 경로 + 구조 판정에 쓰인 파일 내용)
    │
    ▼
ProjectSnapshot { tree, dependencyGraph, verification, diagnostics, ... }
```

hash 설계에서 중요한 두 가지:

- **root 경로에 독립적이다.** 같은 트리를 다른 위치에 clone해도 hash가 같다.
- **mtime을 쓰지 않는다.** checkout이나 touch가 거짓 무효화를 만들지 않는다. 내용이 바뀌어야 hash가 바뀐다.

legacy ledger가 존재하면 그 내용도 hash 입력에 포함된다 — ledger가 바뀌면 snapshot도 새로 만들어야 하기 때문이다. `documentEvidence` 역시 이미 hash 입력이므로, DETAIL.md의 면책 선언을 고치면 snapshot이 새로 만들어진다. 면책은 별도 hash 계약을 만들지 않고 문서 증거의 일부로 따라온다.

### git이 무시하는 경로는 증거가 아니다

빌드 캐시는 소스가 아니다. 그것이 트리에 남으면 `zero-peer-file` 같은 규칙이 `tsconfig.*.tsbuildinfo`를 계속 잡고, config의 allowed-peer 목록이 새 산출물마다 한 줄씩 자라는 두더지잡기가 된다.

판단은 git에게 맡긴다. `git ls-files --others --ignored --exclude-standard --directory -z`를 호출해 결과를 집합으로 들고, traversal의 모든 후보가 그 집합을 조회한다. filter는 traversal마다 한 번 만들어 그 traversal 동안 재사용한다 — 경로당이 아니다. 한 snapshot에는 tree scan·adapter source discovery·verification discovery의 traversal이 있어 호출은 그 수만큼 일어난다. `--others`가 미추적 항목만 반환하므로 "무시됨 **그리고** 미추적"이 구조적으로 보장된다 — force-add된 파일은 index에 있어 애초에 나오지 않으므로 별도 교차검증이 필요 없다. `--directory`는 통째로 무시된 디렉터리를 슬래시 하나로 접어, `node_modules/`가 있는 저장소도 밀리초 안에 답한다.

ADR-01이 glob 의존을 제거한 상태이므로 `.gitignore` 문법을 직접 해석하지 않는다. git이 없거나, work tree 밖이거나, 스캔 루트 자체가 무시된 디렉터리 안이어서 git이 질의를 거부하면 집합이 비고 필터는 상시 false가 되어, ignore 필터가 없던 때와 **동일한** 스캔이 된다. git의 부재가 보고 범위를 조용히 줄이는 일은 없다.

---

## 의존성 그래프와 cycle

```
adapter dependency references
    │
    ▼
각 reference의 sourceFile / resolvedPath를 소유 fractal로 승격
    │
    ▼
DependencyGraphEdge {
  fromFractalPath, toFractalPath,
  evidence: [{ sourceFile, rawSpecifier, resolvedPath }]
}
    │
    ▼
cycle adjacency 구성 — 소유 subtree 안의 organ 참조는 제외
    │
    ▼
cycle 탐지 — 실제 directed closed route를 반환
    │
    ▼
DependencyGraph { nodePaths, edges, cycles, certainty }
```

- `circular-dependency`는 placeholder PASS를 내지 않는다. 실제 경로를 증거로 준다.
- 그래프를 만들 수 없는 파일이 cycle 결론에 영향을 줄 수 있으면 **전체 결과가 `indeterminate`** 다. 일부만 확실할 때 확실한 척하지 않는다.
- 외부 package reference는 unresolved local evidence로 제외된다. 이것이 초기 어댑터의 계약이며, core가 생태계 해석을 하지 않는 이유다.

`buildDependencyGraph(nodePaths, references, certainty, { organPaths })`는 owned-organ 참조를 **edge로는 보존하되 cycle adjacency에서만 뺀다.** 자식 fractal이 부모 소유 organ을 참조하면 organ이 부모로 승격되면서 `부모 → 자식 → 부모` 왕복이 생기는데, 이는 승격 인공물이지 런타임 순환이 아니다. edge를 지우지 않는 이유는 `restructure_plan`이 incoming edge로 소비자를 계산하기 때문이다 — 지우면 LCA 배치가 내부 소비자에 눈이 먼다.

### 경계 판정

대상이 organ인지 fractal인지가 먼저 갈린다. `resolveOwningOrganPath(organPaths, ownerPath, resolvedPath)`가 소유자 안에 있으면서 그 파일을 담는 가장 깊은 organ을 돌려주고, 결과가 `null`이면 fractal 경로로 간다.

```
edge (from → to), evidence 단위로 판정
    │
    ├─ to의 owned organ을 가리킴
    │     ├─ 소비자가 소유 subtree 안       → OK (LCA 배치가 만드는 정상 형태)
    │     ├─ DETAIL.md 면책이 인정됨        → OK
    │     └─ 그 밖                          → 위반 (organ 경로·소유자·해소책 3안 제시)
    │
    └─ to의 fractal 경계
          ├─ from과 to가 같은 fractal       → 내부 참조. 구체 파일 직접 참조가 정상.
          ├─ to의 진입점을 참조             → OK
          ├─ to의 내부 파일을 외부에서 참조 → 위반
          └─ 부모 barrel을 경유한 형제 참조 → 위반 (부모가 나를 재노출 → 순환)
```

organ에 "진입점을 경유하라"를 적용할 수 없는 이유는 정의상 organ이 진입점을 갖지 않기 때문이다. 존재하지 않는 경유지를 요구하면 organ의 모든 파일 참조가 자동으로 위반이 된다.

---

## LCA와 배치 계획

### multi-consumer lowest common fractal

문자열 공통 prefix가 아니다. **소비자들을 소유 프랙탈로 올린 뒤** 교집합을 구한다.

```
1. 각 consumer file/directory → resolveOwningFractal()로 소유 fractal 승격
2. 모든 소유 fractal의 ancestor chain 교집합
3. 교집합에서 가장 깊은 fractal 선택   ← organ은 LCA가 될 수 없다
4. 소비자 중 하나라도 owner를 알 수 없으면 → null (root fallback 금지)
```

경로 비교·containment는 `@ogham/cross-platform`의 portable API로 수행한다. 현재 host가 POSIX든 Windows든 같은 결과가 나오며, Windows 경로 alias(구분자·대소문자)도 정규화된다.

### 배치 결정

```
LCA 확정
    │
    ├─ 독립 공개 계약 증거 있음 → LCA 아래 새 fractal 제안
    │                              + required artifacts (INTENT/DETAIL/entry point)
    ├─ 독립 계약 없음           → LCA 아래 organ 제안
    ├─ 단일 소비자              → 그 소비자의 소유 fractal 아래 organ (기본)
    └─ 의미 있는 organ 이름을 구조 증거로 결정 불가
                                → requiresDecision: true
                                  (`shared`, `common` 같은 grab-bag 자동 생성 금지)
```

### 읽기 전용 계획과 사후조건

`restructure_plan`은 프로젝트 파일을 쓰거나 옮기지 않는다. 임시 artifact 저장만 한다. 실행은 외부 도구가 한다.

```
계획 생성 (read-only)
    │
    ▼
plan-precondition   ← snapshot hash 일치, unresolved decision 없음
    │
    ▼
외부 실행 (파일 이동 + import 편집)
    │
    ▼
plan-postcondition  ← source 부재, target 존재, node type, 필수 문서,
                       진입점, import rewrite/boundary, DAG, graph certainty
```

사후 snapshot hash가 달라지는 것은 정상이다 — 이동했으니 당연하다. postcondition은 pre-execution hash 일치를 요구하지 않는다. 그러나 **계획과 다른 target으로 옮긴 경우 기능이 동작해도 FAIL이다.**

import rewrite는 현재 raw specifier가 source machine path를 exact하게 지시하는 path-like evidence일 때만 산출한다. alias나 runtime-extension mapping처럼 어댑터 의미가 필요한 경우에는 추측하지 않고 해당 move를 unresolved로 남긴다.

---

## 검증 문서 계산

```
파일 → VerificationAdapter.classify() → spec-document | test-record | unsupported
                                     → count()        → VerificationCaseCount
                                     → extractContractGroupIds()
    │
    ▼
policy 평가
    ├─ spec-document  > 15 → spec-document-case-cap
    ├─ test-record    > 32 → test-record-case-cap
    ├─ 한 프랙탈에 spec 여러 개 → DETAIL group link 검사
    │     ├─ DETAIL.md 부재            → spec-contract-link
    │     ├─ group ID 미선언           → spec-contract-link
    │     ├─ 파일 간 ID 집합 겹침      → spec-fragmentation
    │     └─ 선언 ID가 DETAIL에 부재    → spec-contract-link
    └─ certainty 전파
```

case 계산 규칙은 [07-RULES-REFERENCE](./07-RULES-REFERENCE.md#case-계산-규칙) 참조. 계약 연결 토큰 `filid:contract <acceptance-group-id>`에서 core가 아는 것은 토큰과 ID뿐이고, 주석 문법 해석은 어댑터가 한다.

---

## MCP 라우팅과 envelope

### 서버 구조

```
serverEntry/  startServer()
    │
    ▼
server/createServer()
    │
    ├── tools/list → 정확히 9개
    └── registerTool(name, schema, wrapHandler(name, exactSchema, handler))
            ├── project_init        → handleProjectInitTool
            ├── rule_docs_sync      → handleRuleDocsSyncTool
            ├── open_settings       → handleOpenSettingsTool
            ├── fractal_scan        → handleFractalScan
            ├── context_resolve     → handleContextResolve
            ├── restructure_plan    → handleRestructurePlan
            ├── structure_validate  → handleStructureValidate
            ├── verification_scan   → handleVerificationScan
            └── review_state        → handleReviewState
```

`wrapHandler`는 SDK에 광고하는 input schema를 object 형태로 유지하면서, 내부에서 exact schema 검증을 수행한다. parse failure까지 공통 `toolError` envelope로 바뀌므로 호출자는 예외 형태를 두 가지로 나눠 처리하지 않아도 된다.

### 공통 envelope와 16 KiB 예산

```
ToolPayload { projectRoot, status, summary, data?, diagnostics, persistence? }
    │
    ▼  toolResult(toolName, payload)
    │
    ├─ compact serialize (들여쓰기 없음, Map/Set 정규화)
    │
    ├─ 크기 ≤ 16 KiB → data 인라인
    │
    └─ 크기 > 16 KiB
         ├─ 전체 payload를 artifacts/<tool>/<sha256>.json 에 atomic write
         │    (lexical containment + symlink-descendant 검사 통과 후에만)
         ├─ envelope에서 data 제거
         ├─ 축소된 envelope를 다시 byte-check
         │    └─ diagnostics가 여전히 초과 → bounded diagnostic으로 교체
         └─ summary + artifact metadata만으로도 초과
              → 안정적 structured error (16 KiB 상한은 깨지 않음)
```

- artifact와 인라인 텍스트는 **같은 serializer**를 쓴다. byte 계산과 SHA-256 입력이 모두 그 직렬화 결과 기준이다.
- `persistence: always`인 restructure plan은 크기와 무관하게 artifact를 남기고 인라인 `data`는 생략한다. `structure_validate`는 그 artifact의 `data`에서 canonical plan을 읽는다.
- artifact는 임시 자료이며 장기 원장이 아니다. 사라졌으면 snapshot을 다시 만들고 계획을 재생성한다.

### status

```typescript
type ToolStatus = "ok" | "violations" | "indeterminate" | "unsupported";
```

`indeterminate`와 `unsupported`는 `ok`가 아니다. 예를 들어 rule 문서의 plugin root를 해석하지 못한 `rule_docs_sync`는 `ok`가 아니라 `unsupported`와 안정적 diagnostic을 반환한다.

---

## 관련 문서

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — 레이어와 ADR
- [02-BLUEPRINT.md](./02-BLUEPRINT.md) — 모듈별 알고리즘 요약
- [03-LIFECYCLE.md](./03-LIFECYCLE.md) — 스킬 워크플로에서의 동작
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 상수 및 임계값
- [08-API-SURFACE.md](./08-API-SURFACE.md) — 도구 입력 스키마와 DTO
