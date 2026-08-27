# 08. 전체 공개 API 표면

> `@ogham/filid` 1.0 기준. 1.0은 **npm 라이브러리 표면을 갖지 않는다** — `package.json`은 `private: true`이며 `exports` / `main` / `types`와 `dist` 빌드가 없다. 관찰 가능한 공개 계약은 **9개 MCP 도구**와 그 도구가 주고받는 DTO다.

---

## 표면 요약

| 카테고리         | 개수 | 비고                                               |
| ---------------- | ---- | -------------------------------------------------- |
| MCP 도구         | 9    | 이 목록이 곧 제품 표면이다                         |
| 훅 진입점        | 3    | `SessionStart` / `UserPromptSubmit` / `PreToolUse` |
| 공개 DTO 파일    | 12   | `src/types/*.ts`                                   |
| built-in rule ID | 15   | `constants/builtinRuleIds.ts`                      |

`src/index.ts` npm barrel과 `tsconfig.build.json`은 1.0에서 제거되었다.

---

## 공통 envelope

모든 도구가 같은 형태로 반환한다.

```typescript
type ToolStatus = "ok" | "violations" | "indeterminate" | "unsupported";

interface ToolArtifact {
  path: string;
  mediaType: "application/json" | "application/x-ndjson" | "text/markdown";
  sha256: string;
  bytes: number;
  ephemeral: true;
}

interface ToolDiagnostic {
  code: string;
  message: string;
  path?: string;
}

interface ToolPayload<Summary, Data> {
  projectRoot: string;
  status: ToolStatus;
  summary: Summary;
  data?: Data;
  diagnostics: ToolDiagnostic[];
  persistence?: "on-overflow" | "always";
}

interface ToolResultEnvelope<Summary, Data> {
  status: ToolStatus;
  summary: Summary;
  data?: Data;
  artifact?: ToolArtifact;
  diagnostics: ToolDiagnostic[];
}
```

- 기본 inline 예산은 UTF-8 **16 KiB**(`TOOL_INLINE_BUDGET_BYTES`).
- 초과 시 `data`를 빼고 전체 payload를 plugin cache의 `artifacts/<tool-name>/<sha256>.json`에 atomic write한다.
- artifact와 inline text는 같은 compact serializer를 쓴다. `Map`/`Set` 정규화, byte 계산, SHA-256 입력이 모두 그 직렬화 결과 기준이다.
- inline JSON은 들여쓰기 없이 직렬화한다.
- `data` 제거 후 실제 envelope를 **다시 byte-check**한다. diagnostics가 여전히 예산을 넘으면 full diagnostics는 artifact에만 두고 bounded diagnostic으로 바꾼다. summary와 artifact metadata만으로도 예산을 넘으면 안정적 structured tool error를 반환하며 16 KiB 상한을 깨지 않는다.
- artifact는 **임시 자료**이며 장기 원장이 아니다. 사라졌으면 snapshot을 다시 만들고 계획을 재생성한다.

---

## MCP 도구 9개

| 도구                 | 입력의 핵심                                | 기본 반환                      |
| -------------------- | ------------------------------------------ | ------------------------------ |
| `project_init`       | project path, output language, adapter IDs | 생성된 config 경로 요약        |
| `rule_docs_sync`     | status/sync/manifest, project path         | 배포 상태 요약                 |
| `open_settings`      | project path, bounded wait                 | saved / closed / pending       |
| `fractal_scan`       | path, depth, detail                        | summary                        |
| `context_resolve`    | project path, target requests              | ordered owner/document results |
| `restructure_plan`   | path, placement requests                   | 요약 + **항상** plan artifact  |
| `structure_validate` | path, mode, scopes, plan path              | 위반 요약 + 필요 시 artifact   |
| `verification_scan`  | path, optional file paths, detail          | 15/32/fragmentation 요약       |
| `review_state`       | prepare/checkpoint/seal/cleanup            | review artifact 상태           |

### fractal_scan

```typescript
interface FractalScanInput {
  path: string;
  depth?: number;
  detail?: "summary" | "paths" | "full";
}
```

`summary`만 요청하면 대형 트리를 인라인하지 않는다.

### context_resolve

```typescript
interface ContextResolveInput {
  path: string;
  requests: ContextResolveRequest[];
}

interface ContextResolveRequest {
  targetPath: string;
  comparePaths?: string[];
}

interface ContextDocumentRef {
  fractalPath: string;
  intentPath: string | null;
  detailPath: string | null;
  intentLines?: number;
  documentStatus: "valid" | "violations" | "missing";
}

interface ContextResolution {
  targetPath: string;
  ownerFractalPath: string;
  chain: ContextDocumentRef[];
  nearestDetailPath: string | null;
  outputLanguage: string;
}

interface ContextResolveSummary {
  projectRoot: string;
  requestCount: number;
  resolvedCount: number;
  failedCount: number;
  indeterminateCount: number;
}

interface ContextResolveItemSummary {
  targetPath: string;
  ownerFractalPath: string;
  chainLength: number;
  chainPaths: string[];
  nearestDetailPath: string | null;
  outputLanguage: string;
  diagnosticsOutOfScope: number;
  lowestCommonFractalPath?: string | null;
}

type ContextResolveResult =
  | {
      index: number;
      resolved: true;
      targetPath: string;
      status: ToolStatus;
      summary: ContextResolveItemSummary;
      resolution: ContextResolution;
      diagnostics: ToolDiagnostic[];
    }
  | {
      index: number;
      resolved: false;
      targetPath: string;
      status: ToolStatus;
      diagnostics: ToolDiagnostic[];
    };

interface ContextResolveData {
  results: ContextResolveResult[];
}
```

`requests`는 최소 1개이며 단일 target도 배열 한 item으로 전달한다. 호출당 document-only snapshot은 한 번만 만들고 `results`는 입력 순서와 cardinality를 보존한다. chain 순서는 owner에서 root 방향이다. **문서 본문은 반환하지 않는다.** target이 project root 밖이거나 owner를 결정할 수 없으면 해당 item은 `resolved: false`이고 다른 성공 item은 유지된다. 하나 이상의 item이 indeterminate이면 top-level status도 `indeterminate`다. 큰 batch의 `data`는 artifact로 이동할 수 있지만 top-level summary는 고정된 count 필드만 가진다.

### restructure_plan

```typescript
interface PlacementRequest {
  sourcePath: string;
  consumerPaths?: string[];
  contractIntent?: "internal" | "independent" | "unknown";
  organNameHint?: string;
}

interface RestructurePlanInput {
  path: string;
  requests: PlacementRequest[];
}
```

- `consumerPaths`를 생략하면 dependency graph의 incoming edge로 계산한다.
- `contractIntent`가 생략되면 `unknown`이다. 독립성 증거가 없으면 unresolved이며 자동으로 organ을 선택하지 않는다.
- `organNameHint`는 이름 제안일 뿐 LCA와 boundary 사후조건을 바꾸지 못한다.
- **프로젝트 파일을 쓰거나 옮기지 않는다.** 임시 artifact 저장만 허용한다.

### structure_validate

```typescript
type StructureValidationMode =
  "project" | "plan-precondition" | "plan-postcondition";

interface StructureValidateInput {
  path: string;
  mode?: StructureValidationMode;
  scopes?: Array<
    | "documents"
    | "nodes"
    | "entry-points"
    | "boundaries"
    | "dag"
    | "verification"
  >;
  planPath?: string;
}
```

`scopes`를 생략하면 전부 검사한다. plan mode에서는 `planPath`가 필수다. `structure_validate`는 canonical full-payload artifact의 `data`에서 `RestructurePlan`을 읽는다.

### verification_scan

```typescript
interface VerificationScanInput {
  path: string;
  filePaths?: string[];
  detail?: "summary" | "files";
}
```

summary는 `specDocument`와 `testRecord`별로 `fileCount`, `knownCaseCount`, `caseCap`을 분리하고 전체 `fragmentationCount`, `violationCount`, certainty를 함께 반환한다.

### review_state

```typescript
type ReviewStateInput =
  | {
      action: "prepare";
      projectRoot: string;
      branchName: string;
      baseRef: string;
      force?: boolean;
    }
  | {
      action: "checkpoint" | "seal";
      projectRoot: string;
      branchName: string;
      baseRef?: string;
    }
  | {
      action: "cleanup";
      projectRoot: string;
      branchName: string;
      confirm: true;
    };

type ReviewStatePhase = "prepared" | "sealed";
type ReviewStateDisposition =
  "fresh" | "resumable" | "cached" | "stale" | "missing" | "sealed" | "cleaned";

interface ReviewStateRecord {
  schemaVersion: 1;
  projectRoot: string;
  branchName: string;
  normalizedBranch: string;
  baseRef: string;
  baseCommit: string;
  sourceHash: string;
  fileHashes: Record<string, string>;
  phase: ReviewStatePhase;
  preparedAt: string;
  sealedAt?: string;
}
```

- `prepare`: 새 state면 `fresh`, 같은 hash의 prepared state면 `resumable`, 같은 hash의 sealed state와 report가 있으면 `cached`. `force: true`는 캐시를 쓰지 않고 fresh prepared state를 쓴다.
- `checkpoint`: state 부재 `missing`, hash 불일치 `stale`, matching prepared `resumable`, matching sealed+report `cached`.
- `seal`: matching prepared hash와 review report가 있을 때만 `sealed`.
- `cleanup`: 리터럴 `confirm: true` 뒤 branch directory만 제거하고 `cleaned`.
- **`stale`과 `missing`은 `ok` status가 아니다.** 메시지 파싱 없이 안정적 disposition과 diagnostics로 판정할 수 있다.

### rule_docs_sync

status / manifest에서 plugin root를 해석하지 못한 경우는 `ok`가 아니라 `unsupported`와 안정적 diagnostic을 반환한다.

---

## 1.0에서 제거된 도구

| 현행 도구                             | 결론                                           |
| ------------------------------------- | ---------------------------------------------- |
| `ast_analyze`                         | 제거 — 일반 코드 품질/AST 분석                 |
| `ast_grep_search`, `ast_grep_replace` | 제거 — 범용 LLM/검색 도구 영역                 |
| `fractal_navigate`                    | `fractal_scan` + `context_resolve`로 대체      |
| `doc_compress`                        | 제거 — 입력 content가 토큰을 절약하지 않음     |
| `test_metrics`                        | `verification_scan`으로 의미 재설계            |
| `drift_detect`                        | `restructure_plan`으로 대체                    |
| `lca_resolve`                         | MCP에서 제거, core의 multi-consumer LCA로 흡수 |
| `rule_query`                          | `structure_validate`와 rule 문서로 대체        |
| `config_patch_validate`               | settings / project-init 내부 검증으로 흡수     |
| `coverage_verify`                     | 제거 — 테스트 품질은 Seiri 영역                |
| `debt_manage`                         | 제거 — FCA core가 아닌 별도 debt workflow      |
| `cache_manage`                        | 제거 — 내부 infra로만 유지                     |
| `review_manage`                       | 축소 후 `review_state`로 대체                  |

---

## 핵심 DTO

### 노드와 트리 (`types/fractal.ts`)

```typescript
type NodeType = "fractal" | "organ" | "pure-function" | "hybrid";
type AnalysisCertainty = "exact" | "indeterminate" | "unsupported";

interface EntryPointDescriptor {
  path: string;
  kind: "module" | "executable" | "framework";
  adapterId: string;
  surface: "enumerated" | "opaque" | "unsupported";
}

interface FractalDocumentEvidence {
  intentPath: string | null;
  detailPath: string | null;
  intentLines?: number;
  status: "valid" | "violations" | "missing";
  findings: DocumentContractFinding[];
  /** 소유자 기준 절대 경로로 정규화된 organ 면책. 섹션이 없으면 부재. */
  boundaryExemptions?: BoundaryExemptionDeclaration[];
}

interface FractalNode {
  path: string;
  name: string;
  type: NodeType;
  parentFractalPath: string | null;
  childFractalPaths: string[];
  organPaths: string[];
  hasIntentMd: boolean;
  hasDetailMd: boolean;
  entryPoints: EntryPointDescriptor[];
  entryPointSurfaces?: EntryPointSurfaceEvidence[];
  documentEvidence?: FractalDocumentEvidence;
  depth: number;
  peerFiles: string[];
}
```

core의 노드는 **진입점 파일명을 직접 알지 않는다.** 어댑터가 정확한 파일 경로와 종류를 제공한다.

`kind`는 표면 정보이자 **분류 입력**이다. `classifyNode`는 `kind: "module"`만 fractal 신호로 읽는다. `executable`·`framework`와 config `entryPointOverrides`로 주입된 경로는 진입점 목록에는 들어가지만 노드 타입을 바꾸지 않는다. override가 `executable` / `surface: "enumerated"`로 보고되는 이유도 여기 있다 — `framework`를 쓰면 `surface`가 `opaque`로 파생되어 정당한 override마다 영구적인 `entry-point-surface` 경고가 생긴다.

### snapshot과 그래프

```typescript
interface DependencyEvidence {
  sourceFile: string;
  rawSpecifier: string;
  resolvedPath: string;
}

interface DependencyGraphEdge {
  fromFractalPath: string;
  toFractalPath: string;
  evidence: DependencyEvidence[];
}

interface DependencyGraph {
  nodePaths: string[];
  edges: DependencyGraphEdge[];
  cycles: string[][];
  certainty: AnalysisCertainty;
}

interface LegacyCriteriaLedgerEvidence {
  path: string;
  targetDetailPath: string;
}

interface SnapshotDiagnostic {
  code: string;
  message: string;
  path?: string;
}

interface ProjectSnapshot {
  schemaVersion: 1;
  projectRoot: string;
  outputLanguage: string;
  snapshotHash: string;
  tree: FractalTree;
  dependencyGraph: DependencyGraph;
  adapterIds: string[];
  verification: VerificationProjectAnalysis;
  legacyCriteriaLedger: LegacyCriteriaLedgerEvidence | null;
  diagnostics: SnapshotDiagnostic[];
  createdAt: string;
}
```

snapshot hash는 정렬된 상대 경로와 구조 판정에 사용된 파일 내용의 SHA-256을 결합한다. **mtime만으로 판정하지 않으며 root 경로에 독립적이다.**

### 어댑터 계약 (`types/adapters.ts`)

```typescript
interface AdapterClaim {
  confidence: number;
  evidence: string[];
}

interface DependencyReference {
  sourceFile: string;
  rawSpecifier: string;
  resolvedPath: string | null;
  kind: "static" | "dynamic" | "re-export" | "framework";
}

interface EntryPointInspection {
  entryPoint: EntryPointDescriptor;
  exportedNames: string[];
  hasDirectDeclarations: boolean;
  certainty: AnalysisCertainty;
}

interface StructureAdapter {
  id: string;
  detect(projectRoot: string): Promise<AdapterClaim>;
  discoverSourceFiles(projectRoot: string): Promise<string[]>;
  findEntryPoints(directoryPath: string): Promise<EntryPointDescriptor[]>;
  inspectEntryPoint(entryPointPath: string): Promise<EntryPointInspection>;
  extractDependencies(filePath: string): Promise<DependencyReference[]>;
  isFrameworkOwnedPeer(filePath: string): Promise<boolean>;
  suggestEntryPointPath(directoryPath: string): Promise<string>;
}

interface AdapterRegistry {
  registerStructure(adapter: StructureAdapter): void;
  registerVerification(adapter: VerificationAdapter): void;
  resolveStructure(projectRoot: string): Promise<StructureAdapter[]>;
  resolveVerification(projectRoot: string): Promise<VerificationAdapter[]>;
}
```

**새 어댑터 추가로 core types, policy rule, MCP schema가 바뀌면 설계 위반이다.**

### 검증 문서 (`types/verification.ts`)

```typescript
type VerificationRole = "spec-document" | "test-record";

interface VerificationCaseCount {
  certainty: AnalysisCertainty;
  exactCount?: number;
  knownLowerBound: number;
  reasons: string[];
}

interface VerificationFileAnalysis {
  path: string;
  adapterId: string;
  role: VerificationRole;
  count: VerificationCaseCount;
  ownerFractalPath: string;
  contractGroupIds: string[];
}

interface VerificationViolation {
  ruleId:
    | "spec-document-case-cap"
    | "test-record-case-cap"
    | "spec-fragmentation"
    | "spec-contract-link";
  path: string;
  severity: "error" | "warning";
  message: string;
}

interface VerificationAdapter {
  id: string;
  detect(projectRoot: string): Promise<AdapterClaim>;
  discover(projectRoot: string): Promise<string[]>;
  classify(filePath: string): Promise<VerificationRole | "unsupported">;
  count(filePath: string): Promise<VerificationCaseCount>;
  extractContractGroupIds(filePath: string): Promise<string[]>;
}
```

### 배치 계획 (`types/restructure.ts`)

```typescript
type PlacementBasis =
  | "single-owner"
  | "lowest-common-fractal"
  | "public-contract"
  | "boundary-rule";

interface RequiredArtifact {
  role: "intent-document" | "detail-document" | "entry-point";
  path: string;
  adapterId?: string;
}

interface ImportRewrite {
  consumerPath: string;
  currentSpecifier: string;
  requiredSpecifier: string;
}

interface MoveInstruction {
  sourcePath: string;
  targetPath: string;
  unitKind: "file" | "organ" | "fractal";
  targetNodeType: "organ" | "fractal" | "pure-function" | "undetermined";
  basis: PlacementBasis;
  consumerPaths: string[];
  lowestCommonFractalPath?: string;
  reason: string;
  requiredArtifacts: RequiredArtifact[];
  affectedImports: ImportRewrite[];
  requiresDecision: boolean;
  decisionReasons: string[];
}

interface RestructurePlan {
  schemaVersion: 1;
  planId: string;
  projectRoot: string;
  snapshotHash: string;
  createdAt: string;
  moves: MoveInstruction[];
  alreadyPlaced: MoveInstruction[];
  unresolved: MoveInstruction[];
  summary: {
    moveCount: number;
    fractalsCreated: number;
    organsCreated: number;
    alreadyPlacedCount: number;
    decisionsRequired: number;
  };
}

interface PlanValidationFinding {
  code: string;
  message: string;
  path?: string;
  sourcePath?: string;
}

interface PlanValidationResult {
  valid: boolean;
  findings: PlanValidationFinding[];
}
```

- 모든 machine path는 **정규화된 절대 경로**다. 비교·containment·relative/join/ resolve는 `@ogham/cross-platform`의 portable API를 쓴다.
- `requiredArtifacts`는 역할과 실제 경로를 함께 반환한다. **core DTO에는 특정 언어의 진입점 파일명이 없다.**
- 새 fractal의 entry point artifact는 snapshot에 이미 보존된 adapter-reported entry point 경로 형태에서만 파생한다. exact evidence가 없으면 이름을 추측하지 않고 해당 move를 unresolved로 반환한다.
- `affectedImports.requiredSpecifier`는 현재 raw specifier가 source machine path를 지시하는 path-like evidence일 때만 산출한다. 일치는 **마지막 세그먼트의 확장자를 제거한 stem**으로 판정한다 — TypeScript ESM이 `.ts` 파일을 `.js`로 참조하고 bundler 해석이 확장자를 생략하듯, specifier에 소스 확장자를 그대로 적을 수 없는 생태계가 있기 때문이다. byte 단위로 비교하면 그런 생태계에서는 rewrite가 하나도 나오지 않는다.
- 산출된 specifier는 **소비자가 쓰던 확장자 표기를 보존한다.** core는 어느 확장자가 유효한지 알지 못하므로 원래 표기를 되돌려 준다. stem이 어긋나는 디렉터리 index 참조는 여전히 `import-rewrite-unsupported`다.
- 계산된 target이 source와 같으면 `moves`가 아니라 `alreadyPlaced`로 간다. 옮길 것이 없는 요청이며, postcondition은 `alreadyPlaced`에 source 부재만 면제하고 exact target·node type·artifact·import rewrite는 그대로 요구한다 — "source 부재"와 "target 존재"가 한 경로에 동시에 요구되지 않으면서, 계획이 지명한 적 없는 경로에 착지한 유닛도 잡힌다. 요청은 버려지지 않고 계산된 LCA·basis·consumer를 그대로 실어 돌려준다.

### 문서 (`types/documents.ts`)

```typescript
interface ThreeTierBoundary {
  alwaysDo: string[];
  askFirst: string[];
  neverDo: string[];
}

interface DetailAcceptanceGroup {
  id: string;
  title: string;
  line: number;
}

interface BoundaryExemptionDeclaration {
  /** 선언된 그대로의 organ path. 저장 시 소유자 기준으로 정규화된다. */
  targetPath: string;
  title: string;
  /** 소비자 glob. barrel 경유 접근이면 리터럴 `entry-point`. */
  consumers: string[];
  /** 명시적 `Direct import: allowed` 일 때만 true. */
  directImport: boolean;
  reason: string;
  line: number;
}

interface BoundaryExemptionValidation {
  exemptions: BoundaryExemptionDeclaration[];
  violations: DocumentViolation[];
}

interface DetailMdValidation {
  valid: boolean;
  violations: DocumentViolation[];
  acceptanceGroups: DetailAcceptanceGroup[];
  /** 이 프랙탈이 선언한 organ 면책. 섹션이 없으면 빈 배열. */
  boundaryExemptions: BoundaryExemptionDeclaration[];
}

interface DocumentViolation {
  rule: string;
  message: string;
  severity: "error" | "warning";
}
```

DETAIL.md 필수 섹션은 `## Requirements`, `## API Contracts`, `## Acceptance Criteria`, `## Last Updated` 넷이다. acceptance group은 `### <stable-id> — <title>` 형식이며 그 문서 안에서 ID가 고유해야 한다.

`## Boundary Exemptions`는 **조건부 섹션**이다. 면책을 실제로 부여하는 프랙탈만 갖고, 부재가 정상이며 그 자체로는 위반이 아니다. 항목 heading은 acceptance group과 같은 `### <target path> — <title>` 형태를 쓰지만 ID 문자 집합은 공유하지 않는다 — 경로에는 구분자가 온다. target은 organ 경로일 수도, fractal 내부 경로일 수도 있으며 자기 자신과 그 아래 전부를 가리킨다. `reason`이 비면 면책이 아니라 미충족 계약으로 보고된다.

### 훅 (`types/hooks.ts`)

```typescript
interface HookBaseInput {
  cwd: string;
  session_id: string;
  hook_event_name: string;
}

interface PreToolUseInput extends HookBaseInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    path?: string;
    content?: string;
    old_string?: string;
    new_string?: string;
    [key: string]: unknown;
  };
}

interface UserPromptSubmitInput extends HookBaseInput {
  prompt?: string;
}

interface HookOutput {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
    permissionDecision?: "deny";
    permissionDecisionReason?: string;
  };
}
```

`SubagentStartInput`과 `PostToolUseInput` 기반 훅은 1.0에 등록되어 있지 않다.

---

## 설정 계약 (`.filid/config.json`)

```typescript
interface FilidConfigV2 {
  version: "2.0";
  language?: string;
  adapters: {
    mode: "auto" | "explicit";
    enabled: string[];
  };
  rules: Record<string, RuleOverride>;
  structure?: {
    maxDepth?: number;
    additionalOrganNames?: string[];
    additionalAllowedPeers?: AllowedPeerOverride[];
    entryPointOverrides?: Record<string, string[]>;
  };
}

interface RuleOverride {
  enabled?: boolean;
  severity?: "error" | "warning" | "info";
  exempt?: string[];
}

interface AllowedPeerOverride {
  basename: string;
  paths?: string[];
  adapterId?: string;
}
```

- `language`는 **문서 출력 언어**이며 프로그래밍 언어 선택값이 아니다.
- `explicit` 모드에서 `enabled`가 빈 배열이면 validation error다.
- `entryPointOverrides`의 key는 **adapter ID**다. core가 파일명 의미를 해석하지 않고 해당 어댑터에 전달한다. 주입된 경로는 `kind: "executable"`로 보고되므로 **노드 분류를 바꾸지 않는다.** `zero-peer-file`과 `entry-point-surface`의 입력일 뿐이다.
- v1 config는 읽을 때 메모리에서 v2로 변환하고 `config-migration-required` 진단을 낸다. **자동으로 파일을 쓰지 않는다.**
- 스키마는 `strict`다. 알 수 없는 key는 무시되지 않고 거부된다.

---

## 관련 문서

- [02-BLUEPRINT.md](./02-BLUEPRINT.md) — 모듈별 기술 청사진
- [04-USAGE.md](./04-USAGE.md) — 도구 호출 예시와 설정 사용법
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — envelope와 라우팅 내부 동작
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 상수 및 임계값 레퍼런스
