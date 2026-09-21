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

type AnalysisAxis = "dependencies" | "boundaries" | "verification";

interface ToolDiagnostic {
  code: string;
  message: string;
  path?: string;
  affects: AnalysisAxis[]; // axes whose conclusions it can change; [] = none
  nextAction: string; // what the caller does next: the fix, the delegated step, or who decides
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

- 모든 진단은 `affects`를 싣는다. structure·verification·restructure 판정은 그 축에 영향을 선언한 진단만 indeterminate 사유로 읽는다. `affects: []`는 판정을 바꾸지 않는다. `config-warning`은 버린 config 경로가 loosen-only 목록(`rules.*.exempt|enabled|severity`, `structure.additionalAllowedPeers`, `structure.generatedPaths`)에 있을 때만 `[]`이고, 그 밖의 잘못된 값·모르는 key·config 전체 fallback은 세 축 전부다. `$schema`, `$comment`, `_`로 시작하는 key는 경고 없이 무시한다. 저장된 review state의 진단은 `affects`가 없을 수 있고, 그때는 모든 축으로 읽는다.
- 기본 inline 예산은 UTF-8 **16 KiB**(`TOOL_INLINE_BUDGET_BYTES`).
- 초과 시 `data`를 빼고 전체 payload를 plugin cache의 `artifacts/<tool-name>/<sha256>.json`에 atomic write한다.
- artifact와 inline text는 같은 compact serializer를 쓴다. `Map`/`Set` 정규화, byte 계산, SHA-256 입력이 모두 그 직렬화 결과 기준이다.
- inline JSON은 들여쓰기 없이 직렬화한다.
- `data` 제거 후 실제 envelope를 **다시 byte-check**한다. diagnostics가 여전히 예산을 넘으면 full diagnostics는 artifact에만 두고 bounded diagnostic으로 바꾼다. summary와 artifact metadata만으로도 예산을 넘으면 안정적 structured tool error를 반환하며 16 KiB 상한을 깨지 않는다.
- artifact는 **임시 자료**이며 장기 원장이 아니다. 사라졌으면 snapshot을 다시 만들고 계획을 재생성한다.

---

## MCP 도구 5개

| 도구              | action                                               | 기본 반환                  |
| ----------------- | ---------------------------------------------------- | -------------------------- |
| `project_setup`   | init/rules-status/rules-manifest/rules-sync/settings | config·rules·settings 요약 |
| `fractal_inspect` | scan/validate/verification/resolve                   | FCA inspection 결과        |
| `restructure`     | plan/precondition/postcondition                      | plan 또는 validation 결과  |
| `review_state`    | prepare/checkpoint/validate/seal/cleanup/assess      | review artifact 상태       |
| `facts`           | status/submit/compare/adjudicate/discard-pending/discard-damaged | 사실 상태·제출·비교·판정·손상 shard 폐기 |

### fractal_inspect — scan

```typescript
interface FractalInspectScanInput {
  action: "scan";
  path: string;
  maxDepth?: number;
  detail?: "summary" | "paths" | "full";
  nameFilter?: string;
}
```

`summary`만 요청하면 대형 트리를 인라인하지 않는다.

### fractal_inspect — resolve

```typescript
interface FractalInspectResolveInput {
  action: "resolve";
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

### restructure — plan

```typescript
interface PlacementRequest {
  sourcePath: string;
  consumerPaths?: string[];
  contractIntent?: "internal" | "independent" | "unknown";
  organNameHint?: string;
}

interface RestructurePlanInput {
  action: "plan";
  path: string;
  requests: PlacementRequest[];
}
```

- `consumerPaths`를 생략하면 dependency graph의 incoming edge로 계산한다.
- `contractIntent`가 생략되면 `unknown`이다. 독립성 증거가 없으면 unresolved이며 자동으로 organ을 선택하지 않는다.
- `organNameHint`는 이름 제안일 뿐 LCA와 boundary 사후조건을 바꾸지 못한다.
- **프로젝트 파일을 쓰거나 옮기지 않는다.** 임시 artifact 저장만 허용한다.

### fractal_inspect — validate

```typescript
interface FractalInspectValidateInput {
  action: "validate";
  path: string;
  scopes?: Array<
    | "documents"
    | "nodes"
    | "entry-points"
    | "boundaries"
    | "dag"
    | "verification"
  >;
}
```

`scopes`를 생략하면 전부 검사한다.

### restructure — precondition / postcondition

```typescript
type RestructureValidationInput = {
  action: "precondition" | "postcondition";
  path: string;
  planPath: string;
};
```

두 action은 canonical full-payload artifact의 `data`에서 `RestructurePlan`을 읽고 summary에 canonical 여섯 scope를 보고한다.

`projectRoot`가 절대 경로가 아니거나 `readPaths`·`probePaths`에 `projectRoot` 밖 경로(경로 문자열로, 또는 symlink를 따라간 실제 위치로)가 있는 artifact는 아무 파일도 읽기 전에 `plan-artifact-invalid`로 거절한다. precondition은 `path`와 `projectRoot`가 다르면 아무것도 읽지 않고 `project-root-mismatch`만 반환한다.

### fractal_inspect — verification

```typescript
interface FractalInspectVerificationInput {
  action: "verification";
  path: string;
  filePaths?: string[];
  detail?: "summary" | "files";
}
```

summary는 `specDocument`와 `testRecord`별로 `fileCount`, `knownCaseCount`, `caseCap`을 분리하고 전체 `fragmentationCount`, `violationCount`, certainty를 함께 반환한다.

### review_state

prepare의 `effort?: auto | low | medium | high`는 config보다 우선한다. fresh 기본 auto는 reviewable group이 `review.autoLowEffortGroupThreshold`(기본 16) 이상이면 low, 미만이면 medium을 선택한다. `review.maxGroups` 기본 64, `review.concurrency` 기본 8이며 상한 초과는 actor 배정 전 오류다. group 구성은 effort와 독립적이다.

prepare summary에는 effective `effort`와 optional `effortMode`, `effortReason`, `autoLowEffortGroupThreshold`, `reviewableGroups`, `maxReviewerHandoffs`가 실린다. reason은 `fixed | auto-standard | auto-large | legacy-resume`이며 최대 handoff는 group rounds의 합(verify·retry 제외)이다. state v2는 effective effort와 optional 선택 metadata 및 validationPolicyVersion을 보존한다. fresh 정책 버전은 1이다. 같은 prepared identity의 effective effort 변경은 최초 validate 전에도 `review-effort-locked`, 구형·미지원 정책 재사용은 `review-validation-policy-outdated`로 차단한다. 두 MCP 오류는 verdict·handoff를 내보내지 않는다. 같은 effective effort의 metadata 변경은 재개되며 현재 정책의 sealed cache는 다시 열지 않는다. threshold와 effort는 project/user config 양쪽에서 제어할 수 있다.

seal의 `ReviewSealData`는 `reportPath`, nullable `blockersPath`, nullable `fixRequestsPath`, `prCommentPath`, `sessionPath`를 반환한다. 새 INCONCLUSIVE 결과는 report marker와 source/snapshot/branch/verdict가 결합된 `review-blockers.md`를 만들며, 사람 판단 요청·증거 보강·분류 필요를 일반 finding과 분리한다. 현재 정책이지만 marker가 없는 legacy seal은 `blockersPath: null`로 보존한다. marker가 있는 sidecar의 유실·불일치는 `review-blockers-missing` 또는 `review-blockers-invalid`로 멈추며 자동 force하지 않는다.

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
  schemaVersion: 2;
  validationPolicyVersion?: number;
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

interface ReviewSealData {
  reportPath: string;
  blockersPath: string | null;
  fixRequestsPath: string | null;
  prCommentPath: string;
  sessionPath: string;
}
```

- `prepare`: 새 state면 `fresh`, 같은 hash의 prepared state면 `resumable`, 같은 hash의 sealed state와 report가 있으면 `cached`. `force: true`는 캐시를 쓰지 않고 fresh prepared state를 쓴다.
- `checkpoint`: state 부재 `missing`, hash 불일치 `stale`, matching prepared `resumable`, matching sealed+report `cached`.
- `seal`: matching prepared hash와 review report가 있을 때만 `sealed`.
- `cleanup`: 리터럴 `confirm: true` 뒤 branch directory만 제거하고 `cleaned`.
- **`stale`과 `missing`은 `ok` status가 아니다.** 메시지 파싱 없이 안정적 disposition과 diagnostics로 판정할 수 있다.

### project_setup — rules actions

status / manifest에서 plugin root를 해석하지 못한 경우는 `ok`가 아니라 `unsupported`와 안정적 diagnostic을 반환한다.

### facts — status

```typescript
interface FactsStatusInput {
  action: "status";
  path: string;
}

interface FactsStatusSummary {
  projectState: "facts-uninitialized" | "ready";
  resolutionEpoch: string;
  coveredFiles: number;
  exact: number;
  missing: number;
  needsResolution: number;
  uncertain: number;
  toolError: number;
  unsupported: number;
  unadjudicatedItems: number;
  pendingAttestations: number;
  attestationRequirement: string;
  scopeSource: "config" | "default";
  outputRequirement: string;
  extractionList: { path: string; count: number; unrepresentable: number };
}
```

`data`는 상태별 경로 목록을 `{ paths, truncated }`로 싣는다: `missing`, `needsResolution`, `uncertain`, `toolError`, `indeterminate`. 목록은 상한까지만 인라인하고 나머지는 `truncated`로 센다.

`rejected`는 **항목 단위**다 — `{ items: RejectedClaim[]; truncated }`이고
`RejectedClaim`은 `{ path, code, nextAction, specifier?, inputPath?, lines? }`다. `uncertain`인 파일은
언제나 `rejected`·`indeterminate`·`unadjudicated`·`pendingAttestations` 중 하나에 나타난다.

`unadjudicated`만 **항목 단위**다 — `{ items: FactsOpenItem[]; truncated }`이고, `FactsOpenItem`은
`{ path, kind, reference, resolvedPath, origin, state, lines, contentHash, staleUnderNewContent, actor?, reason? }`다.
`adjudicate`가 요구하는 값이 전부 들어 있어 응답만으로 다음 호출을 만들 수 있다. 목록에는 **판정 가능한 항목만**
싣는다: 트리·범위를 벗어난 파일, 읽을 수 없는 파일, 판정 대상 줄이 바뀌어 만료한 항목은 뺀다.

`facts.covers`가 없으면 `projectState`는 `facts-uninitialized`이고 status는 `ok`가 아니라 `unsupported`다. **참조 기반 판정의 부재를 통과로 읽지 않는다.**

### facts — submit

```typescript
interface FactsSubmitInput {
  action: "submit";
  path: string;
  file: string;             // 추출 산출물(JSON `FileFacts[]`)의 절대 경로
  resolutionEpoch: string;
}

interface FactsSubmitSummary {
  resolutionEpoch: string;
  accepted: number;
  removed: number;
  rejectedRecords: number;
  rejectedClaims: number;
  epochMoved: boolean;
  openedItems: number;
  closedItems: number;
  removedAdjudicatedItems: number;
  attestationsPending: number;
  attestationsConfirmed: number;
}
```

- `file`은 절대 경로이고 **정규화한 실제 위치가 프로젝트 트리 밖**인 일반 파일이어야 하며 크기 상한 안이어야 한다. 경로를 먼저 정규화하므로 `$TMPDIR`처럼 symlink를 거쳐 프로젝트 밖에 닿는 경로는 통과하고, symlink로 프로젝트 안에 닿는 경로는 거절된다. 서버가 여는 모든 파일은 `O_NONBLOCK`이라 FIFO나 장치 파일은 서버를 멈추지 않고 거절된다.
- `facts status`의 `outputRequirement`는 경로가 아니라 **조건 문장**이다. 서버의 임시 디렉터리는 샌드박스 에이전트가 쓸 수 없으므로 서버는 디렉터리를 권하지 않는다.
- 레코드의 `provenance.resolutionInputs`는 **그 레코드만** 묶는다. 제출 시 현재 hash와 다르면 그 레코드가 거부되고, 나중에 달라지면 그 파일만 `needs-resolution`이 된다. 프로젝트 epoch에는 들어가지 않으므로 한 배치를 받아들여도 다음 배치의 epoch가 움직이지 않는다.
- epoch 검사는 **호출 전체에 all-or-nothing**이다. 다르면 아무것도 저장하지 않고 `facts-epoch-moved`와 새 epoch, `added`·`removed`·바뀐 해석 입력을 돌려준다.
- 같은 epoch 안에서 여러 번 호출할 수 있고 각 호출은 자기가 실은 파일의 레코드만 교체한다. 상한 초과는 `facts-file-too-large`와 분할 제출 안내다.
- schema 오류는 **JSON pointer만** 돌려준다. 값도, 그 항목이 주장한 `path`도 싣지 않는다.
- **레코드를 지우는 action은 없다.** 트리에서 사라지거나 범위에서 빠진 파일의 레코드는 다음 `submit`이 지운다. 그 파일의 부속 표 페이지도 함께 지워지며, 페이지가 담고 있던 판정 개수는 `removedAdjudicatedItems`와 `facts-adjudicated-items-removed`로 보고한다(막지 않는 보고).
- 레코드 shard나 부속 표 페이지를 다른 writer에게 빼앗기면 각각 `facts-record-changed`·`facts-side-table-changed`이고 둘 다 `indeterminate`다. 요약의 개수는 **실제로 저장된 것만** 센다.

### facts — compare

```typescript
interface FactsCompareInput {
  action: "compare";
  path: string;
  file: string;              // 후보 추출 산출물(절대 경로, 프로젝트 밖)
  generationId?: string;
}
```

- 후보를 **레코드로 저장하지 않고** 현재 레코드와 비교해 `{ missingInStore[], missingInCandidate[], resolutionDiffers[], informational[], sideTableItems[] }`를 돌려준다. `sideTableItems[]`는 비교한 파일의 페이지 **전체**를 `status`의 `FactsOpenItem` 모양으로 싣는다 — 이번 비교가 만든 차이만 실으면 다른 제출이 연 항목이 보이지 않는다.
- 프로젝트 안 경로로 해석된 불일치만 **부속 표**에 미판정 항목으로 남는다. 그 밖의 차이는 `informational[]`에만 실려 파일 상태를 바꾸지 않는다 — 과다 보고하는 도구가 표를 범람시키지 못한다.
- `file`은 `submit`의 `file`과 **같은 가드**를 지난다(정규화 → 보호된 열기 → 프로젝트 밖·일반 파일·상한).
- `generationId`를 주면 지금은 `facts-generation-not-frozen`을 돌려준다 — 사실의 generation 동결은 뒤 단계다.

### facts — adjudicate

```typescript
interface FactsAdjudicateInput {
  action: "adjudicate";
  path: string;
  sourcePath: string;        // 판정 대상 파일(프로젝트 상대 POSIX)
  contentHash: string;       // 판정을 내릴 때 읽은 byte
  actor: string;             // 자기 선언 — 서버는 확인할 수 없다
  items: {
    kind: "static" | "dynamic" | "re-export" | "framework";
    reference: string;       // sourceText ?? specifier
    resolvedPath: string;
    decision: "adopt" | "dismiss";
    reason?: string;         // dismiss에 필수
  }[];
}
```

- `adopt`는 **한 actor**로 확정하고 간선을 **더한다**(레코드의 참조를 가리지 않는다). `dismiss`는 `pending-dismiss`로 남고 **다른 actor**의 확인으로 확정되며, 다른 actor가 `adopt`를 내면 `adopt`로 확정된다 — 의견이 갈리면 간선을 남긴다.
- `contentHash`가 현재 byte와 다르면 **호출 전체**를 거부한다(`facts-adjudication-stale-content`). `actor`가 접기 뒤 비면 그것도 호출 전체를 거부하지만 **다른 코드**를 쓴다(`facts-adjudication-actor-required`) — byte를 다시 읽으라는 행동으로는 빈 actor가 고쳐지지 않는다. 항목이 표에 없거나 이유 없는 `dismiss`이면 그 항목만 거부하고 나머지는 적용한다.
- 이번 호출이 **판정한** 항목만 현재 `contentHash`로 다시 각인한다.
- 상태 기계 전체와 셀별 P5 검사는 `evidence/s3a-adjudication-states.md`에 있다.

### facts — attested 등급과 discard-pending

```typescript
interface FactsDiscardPendingInput {
  action: "discard-pending";
  path: string;
  sourcePaths: string[];     // 확정되지 않은 attested 제출을 버릴 파일들
}
```

- `submit`은 `actor?: string`을 함께 받는다. `provenance.tier: "attested"` 레코드가 있으면 필수이고,
  없으면 그 **레코드만** `facts-attested-actor-required`로 거부된다(같은 배치의 tool 레코드는 무사하다).
- attested 레코드는 §4.1–4.3을 그대로 지난 뒤 둘을 더 지난다. **계정**: 참조 패턴에 걸리는 모든 줄이
  레코드의 참조나 `nonReferences: { line, reason }[]`로 설명돼야 하고, 아니면
  `facts-attested-unaccounted-lines`와 **줄 번호 목록**으로 거부된다. **확인**: 첫 제출은 pending으로
  남고 파일은 `uncertain`이며, **다른 actor**의 두 번째 제출이 같은 간선 집합을 낼 때 레코드가 저장된다.
- 불일치한 두 번째 제출은 아무것도 저장하지 않고 pending도 바꾸지 않는다. `submit` 응답의 `attested[]`가
  결과 종류(`pending`·`replaced`·`confirmed`·`same-actor`·`mismatch`), 어느 쪽에만 있는 간선과 그 줄,
  다음 행동을 싣는다.
- `discard-pending`은 pending만 지운다. 저장된 레코드와 부속 표는 건드리지 않으므로 "레코드를 지우는
  action"이 아니고, 두 actor가 영원히 다른 답을 내는 파일의 유일한 출구다(P5). pending이 없는 경로는
  거부가 아니라 "이미 그 상태"로 보고한다. 이 action만 `facts-uninitialized` 분기를 두지 않는다 —
  지우는 동작을 막으면 지울 수 없는 상태가 생긴다.

---

## 1.0에서 제거된 도구

| 현행 도구                             | 결론                                             |
| ------------------------------------- | ------------------------------------------------ |
| `ast_analyze`                         | 제거 — 일반 코드 품질/AST 분석                   |
| `ast_grep_search`, `ast_grep_replace` | 제거 — 범용 LLM/검색 도구 영역                   |
| `fractal_navigate`                    | `fractal_inspect`의 scan + resolve로 대체        |
| `doc_compress`                        | 제거 — 입력 content가 토큰을 절약하지 않음       |
| `test_metrics`                        | `fractal_inspect`의 verification으로 의미 재설계 |
| `drift_detect`                        | `restructure`의 plan으로 대체                    |
| `lca_resolve`                         | MCP에서 제거, core의 multi-consumer LCA로 흡수   |
| `rule_query`                          | `fractal_inspect`의 validate와 rule 문서로 대체  |
| `config_patch_validate`               | settings / project-init 내부 검증으로 흡수       |
| `coverage_verify`                     | 제거 — 테스트 품질은 Seiri 영역                  |
| `debt_manage`                         | 제거 — FCA core가 아닌 별도 debt workflow        |
| `cache_manage`                        | 제거 — 내부 infra로만 유지                       |
| `review_manage`                       | 축소 후 `review_state`로 대체                    |

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
  affects: AnalysisAxis[];
  nextAction: string;
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
  /** The literal as the source spells it, only when escapes make it differ from rawSpecifier. */
  sourceText?: string;
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
  /** MANIFEST entry points only; a source surface comes from the file's record. */
  inspectEntryPoint(entryPointPath: string): Promise<EntryPointInspection>;
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
  /** Discovery by name and path; role, case count and contract groups come from the record. */
  discover(projectRoot: string): Promise<string[]>;
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

interface ImportRequirement {
  consumerPath: string;
  currentSpecifier: string;
  requiredResolvedPath: string; // the file the import must load after every move; the only thing postcondition checks
  suggestedSpecifier?: string; // present only when the current specifier names the file or its directory
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
  affectedImports: ImportRequirement[]; // imports the caller changes after every move
  preservedImports: ImportRequirement[]; // imports that keep resolving; postcondition still checks them
  requiresDecision: boolean;
  decisionReasons: string[];
  decisions: { reason: string; message: string; nextAction: string }[];
}

interface RestructurePlan {
  schemaVersion: 3;
  planId: string;
  projectRoot: string;
  snapshotHash: string;
  readPaths: string[]; // move sources, their consumers and the files they import (bytes hashed)
  probePaths: string[]; // each target and INTENT.md/DETAIL.md of every source and target ancestor (state hashed; may not exist)
  readHash: string; // precondition recomputes it over readPaths and probePaths
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
    affectedImportCount: number;
  };
}

interface PlanValidationFinding {
  code: string;
  message: string;
  nextAction: string;
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
- import 변경 요구는 해석 결과(`requiredResolvedPath`)로 표현하고, postcondition은 소비자의 참조가 그 파일로 해석되는지만 본다. 문자열·stem·디렉터리 포함 비교는 하지 않는다 — 같은 이름의 파일이 디렉터리 index를 가로채도 specifier가 같다는 이유로 통과하던 거짓 통과를 막기 위해서다. `affectedImports`와 `preservedImports`는 같은 술어를 쓴다: 그 파일로 해석되는 참조가 하나 이상 있고, `currentSpecifier`로 남은 참조는 전부 그 파일이나 계획이 같은 소비자에게 요구한 다른 파일로 해석되며, unresolved로 남지 않아야 한다. 호출자가 쓴 specifier는 따지지 않는다.
- `suggestedSpecifier`는 현재 raw specifier가 대상 파일 또는 그 엄밀한 상위 디렉터리를 가리키는 path-like evidence일 때만 싣는 제안이다. 일치는 **마지막 세그먼트의 확장자를 제거한 stem**으로 판정한다 — TypeScript ESM이 `.ts` 파일을 `.js`로 참조하고 bundler 해석이 확장자를 생략하듯, specifier에 소스 확장자를 그대로 적을 수 없는 생태계가 있기 때문이다. 제안은 **소비자가 쓰던 확장자 표기를 보존한다.** stem이 어긋나는 디렉터리 index 참조는 제안 없이 싣고 호출자가 specifier를 쓴다.
- precondition은 `readPaths`의 byte와 `probePaths`의 상태(`missing | file | directory`, file이면 내용)로 다시 계산한 hash를 `readHash`와 비교한다. target 자리의 사전 점유나 조상 디렉터리의 `INTENT.md`·`DETAIL.md` 생성·변경도 불일치다. 두 집합 밖의 편집은 계획을 stale로 만들지 않는다.
- 계산된 target이 source와 같으면 `moves`가 아니라 `alreadyPlaced`로 간다. 옮길 것이 없는 요청이며, postcondition은 `alreadyPlaced`에 source 부재만 면제하고 exact target·node type·artifact·import 요구는 그대로 요구한다 — "source 부재"와 "target 존재"가 한 경로에 동시에 요구되지 않으면서, 계획이 지명한 적 없는 경로에 착지한 유닛도 잡힌다. 요청은 버려지지 않고 계산된 LCA·basis·consumer를 그대로 실어 돌려준다.

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
  facts?: {
    covers?: string[];
    excludes?: string[];
    provider?: string;
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
- `facts.covers`가 없으면 adapter의 소스 확장자로 만든 **기본 범위**가 적용된다(`scopeSource: "default"`). **서버는 프로젝트 설정 파일을 쓰지 않는다** — 리뷰 중에 쓰면 worktree가 `source-dirty`가 되어 seal을 막기 때문이다. `facts-uninitialized`는 유효 범위가 빈 경우(`covers: []`)에만 남는다. 제출은 범위를 넓히지 못한다.
- `facts.provider`는 해석의 권위를 가진 도구 이름이다. 저장 레코드가 그 도구에서 왔을 때에만 해석 불일치가 `informational[]`로 내려간다.

---

## 관련 문서

- [02-BLUEPRINT.md](./02-BLUEPRINT.md) — 모듈별 기술 청사진
- [04-USAGE.md](./04-USAGE.md) — 도구 호출 예시와 설정 사용법
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — envelope와 라우팅 내부 동작
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 상수 및 임계값 레퍼런스
