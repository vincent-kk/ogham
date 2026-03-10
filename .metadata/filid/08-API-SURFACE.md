# 08. 전체 공개 API 표면

> `src/index.ts`에서 export하는 모든 함수, 클래스, 타입과 MCP 도구 스키마의 종합 레퍼런스.

---

## Export 요약

| 카테고리       | 함수/클래스 | 타입   | 합계    |
| -------------- | ----------- | ------ | ------- |
| Core           | 30          | 9      | 39      |
| Metrics        | 4           | 7      | 11      |
| Compression    | 3           | 1      | 4       |
| AST            | 12          | 8      | 20      |
| Hooks          | 8           | 7      | 15      |
| Cache Manager  | 13          | 1      | 14      |
| MCP            | 16          | 0      | 16      |
| **합계**       | **86**      | **33** | **119** |

> `src/index.ts` 기준 실제 export 수. 함수/클래스와 타입 합산 94+ 심볼.

---

## Core 모듈

### document-validator

```typescript
function validateIntentMd(content: string): IntentMdValidation;
```

INTENT.md 내용을 검증한다. 50줄 제한 + 3-tier 경계 섹션 검사.

```typescript
function validateDetailMd(content: string, oldContent?: string): DetailMdValidation;
```

DETAIL.md 내용을 검증한다. `oldContent` 제공 시 append-only 감지.

### organ-classifier

```typescript
function classifyNode(input: ClassifyInput): NodeType;
```

디렉토리를 fractal / organ / pure-function으로 분류한다.

```typescript
function isInfraOrgDirectoryByPattern(dirName: string): boolean;
```

디렉토리명이 Organ 패턴에 매칭되는지 검사한다.

```typescript
const KNOWN_ORGAN_DIR_NAMES: readonly string[];
```

9개 Organ 디렉토리명 상수 배열.

### fractal-tree

```typescript
function buildFractalTree(entries: NodeEntry[]): FractalTree;
```

`NodeEntry` 배열로부터 프랙탈 트리를 구축한다. 경로 기반 부모-자식 관계 자동 추론.

```typescript
function findNode(tree: FractalTree, path: string): FractalNode | undefined;
```

경로로 노드를 탐색한다.

```typescript
function getAncestors(tree: FractalTree, path: string): FractalNode[];
```

주어진 경로의 조상 노드를 리프 → 루트 순서로 반환한다.

```typescript
function getDescendants(tree: FractalTree, path: string): FractalNode[];
```

주어진 경로의 모든 프랙탈/순수함수 자손을 반환한다 (organ 제외).

```typescript
function getFractalsUnderOrgans(tree: FractalTree): FractalNode[];
```

Organ 디렉토리 하위에 있는 프랙탈 노드를 반환한다 (구조 위반 감지용).

```typescript
async function scanProject(projectRoot: string, options?: ScanOptions): Promise<NodeEntry[]>;
```

프로젝트 루트를 재귀 탐색하여 `NodeEntry` 배열을 반환한다.

```typescript
function shouldExclude(name: string): boolean;
```

`node_modules`, `.git` 등 제외 대상 디렉토리명인지 검사한다.

### boundary-detector

```typescript
function findBoundary(filePath: string, projectRoot?: string): string | null;
```

파일 경로에서 가장 가까운 상위 프랙탈 경계(INTENT.md 보유 디렉토리)를 탐색한다.

```typescript
function buildChain(filePath: string, projectRoot?: string): ChainResult;
```

파일 경로에서 루트까지의 프랙탈 경계 체인을 구축한다.

### dependency-graph

```typescript
function buildDAG(edges: DependencyEdge[]): DependencyDAG;
```

엣지 배열로부터 DAG를 구축한다.

```typescript
function topologicalSort(dag: DependencyDAG): string[] | null;
```

Kahn 알고리즘 기반 위상 정렬. 사이클 존재 시 `null` 반환.

```typescript
function detectCycles(dag: DependencyDAG): string[][];
```

DFS 기반 사이클 감지. 사이클 경로 배열 반환.

```typescript
function getDirectDependencies(dag: DependencyDAG, node: string): string[];
```

노드의 직접 의존성 (나가는 엣지) 반환. 중복 제거.

### drift-detector

```typescript
function detectDrift(projectRoot: string): Promise<DriftReport>;
```

프로젝트 내 코드-문서 드리프트(구조 불일치)를 감지한다.

```typescript
function compareCurrent(node: FractalNode, projectRoot: string): Promise<DriftItem[]>;
```

단일 노드의 현재 상태와 INTENT.md/DETAIL.md 선언을 비교한다.

```typescript
function calculateSeverity(drift: DriftItem): DriftSeverity;
```

드리프트 항목의 심각도(`critical` | `high` | `medium` | `low`)를 계산한다.

```typescript
function generateSyncPlan(drifts: DriftItem[]): SyncPlan;
```

드리프트 목록으로부터 동기화 계획을 생성한다.

### project-analyzer

```typescript
function analyzeProject(projectRoot: string): Promise<ProjectReport>;
```

프로젝트 전체 구조를 분석하여 건강도 보고서를 생성한다.

```typescript
function calculateHealthScore(report: ProjectReport): number;
```

프로젝트 건강도 점수(0-100)를 계산한다.

```typescript
function generateReport(report: ProjectReport): string;
```

프로젝트 분석 보고서를 마크다운 문자열로 생성한다.

### rule-engine

```typescript
function loadBuiltinRules(): Rule[];
```

빌트인 FCA-AI 규칙 목록을 로드한다.

```typescript
function evaluateRules(rules: Rule[], context: RuleContext): RuleViolation[];
```

규칙 목록을 컨텍스트에 대해 평가하고 위반 목록을 반환한다.

```typescript
function evaluateRule(rule: Rule, context: RuleContext): RuleViolation | null;
```

단일 규칙을 평가한다.

```typescript
function getActiveRules(rules: Rule[]): Rule[];
```

활성화된 규칙만 필터링하여 반환한다.

### module-main-analyzer

```typescript
function analyzeModule(modulePath: string): Promise<ModuleInfo>;
```

모듈 디렉토리를 분석하여 진입점, import, 공개 API를 추출한다.

```typescript
function findEntryPoint(modulePath: string): Promise<string | null>;
```

모듈의 진입점 파일(`index.ts` 등)을 찾는다.

```typescript
function extractImports(filePath: string): ImportInfo[];
```

파일의 import 목록을 추출한다.

```typescript
function extractPublicApi(filePath: string): string[];
```

파일의 공개 export 심볼 목록을 추출한다.

### index-analyzer

```typescript
function analyzeIndex(indexPath: string): Promise<IndexAnalysis>;
```

index 파일을 분석하여 re-export 구조를 파악한다.

```typescript
function extractModuleExports(indexPath: string): string[];
```

index 파일에서 모듈 export 목록을 추출한다.

### lca-calculator

```typescript
function findLCA(tree: FractalTree, pathA: string, pathB: string): string | null;
```

두 모듈 경로의 최저 공통 조상(LCA) 프랙탈을 찾는다.

```typescript
function getModulePlacement(tree: FractalTree, modulePath: string): PlacementInfo;
```

모듈의 프랙탈 트리 내 위치 정보를 반환한다.

```typescript
function getAncestorPaths(path: string): string[];
```

경로의 모든 상위 경로를 루트까지 배열로 반환한다.

### change-queue

```typescript
class ChangeQueue {
  enqueue(record: ChangeRecord): void;
  drain(): ChangeRecord[];
  peek(): ChangeRecord[];
  getChangesByPath(): Map<string, ChangeRecord[]>;
  getAffectedFractals(): string[];
  clear(): void;
  size(): number;
  isEmpty(): boolean;
}
```

PR 시점 배치 동기화를 위한 변경 큐. 누적된 파일 변경 기록을 관리한다.

---

## Metrics 모듈

### test-counter

```typescript
function countTestCases(file: RawTestFile): TestCaseCount;
```

테스트 파일의 `it`/`test`/`it.each`/`test.each` 케이스를 카운트한다.
`describe` 중첩 깊이에 따라 basic/complex 분류.

### three-plus-twelve

```typescript
function check312Rule(files: TestCaseCount[]): ThreePlusTwelveResult;
```

spec 파일들의 3+12 규칙 위반을 검사한다. `test` 파일은 무시.

### decision-tree

```typescript
function decide(input: DecisionInput): DecisionResult;
```

FCA-AI 의사결정 트리. `testCount` → `LCOM4` → `CC` 순서로 평가하여
`ok` / `split` / `compress` / `parameterize` 액션 반환.

### promotion-tracker

```typescript
function checkPromotionEligibility(
  input: PromotionInput,
  stabilityThreshold?: number,
): PromotionCandidate;
```

test.ts → spec.ts 승격 자격을 검사한다. 기본 안정 기간 90일.

---

## Compression 모듈

### reversible-compactor

```typescript
function compactReversible(input: CompactInput): CompactResult;
```

파일 내용을 3줄 레퍼런스(`[REF]`, `[EXPORTS]`, `[LINES]`)로 압축한다.
원본 파일은 디스크에 유지되므로 완전 복원 가능.

```typescript
function restoreFromCompacted(compacted: string): RestoredReference;
```

압축된 레퍼런스 문자열을 파싱하여 `filePath`와 `exports` 추출.

### lossy-summarizer

```typescript
function summarizeLossy(entries: ToolCallEntry[]): LossySummaryResult;
```

도구 호출 이력을 집계 통계로 압축한다. 개별 엔트리는 복원 불가능.
`toolCounts`, `uniqueFiles`, `timeRange` 반환.

---

## AST 분석 모듈

### parser

```typescript
function parseSource(source: string, filePath?: string): ts.SourceFile;
```

소스 코드 문자열을 TypeScript AST `SourceFile`로 파싱한다.
`filePath` 확장자에 따라 JS/TS `ScriptKind` 자동 결정.

```typescript
function parseFile(filePath: string): ts.SourceFile;
```

디스크에서 파일을 읽어 AST로 파싱한다.

### dependency-extractor

```typescript
function extractDependencies(source: string, filePath?: string): DependencyInfo;
```

소스 코드에서 import/export/call 3종 의존성을 추출한다.

- `imports`: 모듈 경로, specifier 목록, type-only 여부, 줄 번호
- `exports`: 이름, type-only, default 여부, 줄 번호
- `calls`: callee 표현식 (`path.dirname` 형식), 줄 번호

### lcom4

```typescript
function extractClassInfo(source: string, className: string): ClassInfo | null;
```

클래스의 필드와 메서드, 메서드별 필드 접근 정보를 추출한다.

```typescript
function calculateLCOM4(source: string, className: string): LCOM4Result;
```

LCOM4를 계산한다. 메서드 간 공유 필드 기반 무방향 그래프 → BFS → connected components 개수.

### cyclomatic-complexity

```typescript
function calculateCC(
  source: string,
  filePath?: string,
): CyclomaticComplexityResult;
```

모든 함수의 Cyclomatic Complexity를 계산한다.
결정 포인트: `if`, `for`, `for-in`, `for-of`, `while`, `do-while`, `case`, `?:`, `&&`, `||`.

### tree-diff

```typescript
function computeTreeDiff(
  oldSource: string,
  newSource: string,
  filePath?: string,
): TreeDiffResult;
```

두 소스 버전의 의미론적 diff를 계산한다.
최상위 선언(function, class, variable, interface, type) 대상.
공백 정규화로 포맷팅 변경은 무시.

---

## Hooks 모듈

### pre-tool-use (통합 브릿지)

```typescript
function handlePreToolUse(input: PreToolUseInput): HookOutput;
```

`PreToolUse` 이벤트의 통합 핸들러. intent-injector + pre-tool-validator + structure-guard 로직을 순차 실행한다.

```typescript
function mergeResults(results: HookOutput[]): HookOutput;
```

여러 Hook 결과를 병합한다. 하나라도 차단이면 차단, additionalContext는 연결.

### intent-injector

```typescript
function injectIntent(input: PreToolUseInput): HookOutput;
```

INTENT.md/DETAIL.md 파일 수정 전 관련 컨텍스트를 주입한다.

```typescript
function compressPaths(paths: string[]): string;
```

경로 목록을 공통 접두어 기반으로 압축하여 토큰 효율을 높인다.

### pre-tool-validator

```typescript
function validatePreToolUse(
  input: PreToolUseInput,
  oldDetailContent?: string,
): HookOutput;
```

`PreToolUse` 이벤트 핸들러. Write 도구로 INTENT.md/DETAIL.md 수정 시 검증.
INTENT.md: 50줄 초과 → 차단, 3-tier 누락 → 경고.
DETAIL.md: append-only 감지 → 차단.

### structure-guard

```typescript
function guardStructure(input: PreToolUseInput): HookOutput;
```

Organ 디렉토리 내 INTENT.md 생성을 차단한다.
경로의 모든 부모 세그먼트를 `KNOWN_ORGAN_DIR_NAMES`와 비교.

> **Note**: 이전 명칭 `organ-guard` / `guardOrganWrite`에서 `structure-guard` / `guardStructure`로 리네임됨.

### change-tracker _(disabled)_

```typescript
function trackChange(input: PostToolUseInput, queue: ChangeQueue): HookOutput;
```

Write/Edit 후 파일 경로를 ChangeQueue에 기록한다.
Write → `created`, Edit → `modified`.

> **Note**: hooks.json에서 제거됨. 코드는 유지되지만 런타임에 실행되지 않음.

### agent-enforcer

```typescript
function enforceAgentRole(input: SubagentStartInput): HookOutput;
```

서브에이전트 시작 시 역할별 도구 제한을 주입한다.
4개 역할: architect(RO), qa-reviewer(RO), implementer(SPEC scope), context-manager(docs only).

### context-injector

```typescript
function injectContext(input: UserPromptSubmitInput): HookOutput;
```

매 사용자 프롬프트에 FCA-AI 규칙 리마인더를 주입한다. 차단하지 않음.

### setup

```typescript
function processSetup(input: HookBaseInput): HookOutput;
```

세션 시작 시 캐시 초기화 및 오래된 세션 파일 정리를 수행한다.

---

## Cache Manager 모듈

```typescript
function cwdHash(cwd: string): string;
```

작업 디렉토리 경로의 해시를 생성한다 (캐시 디렉토리 이름으로 사용).

```typescript
function getCacheDir(cwd: string): string;
```

주어진 작업 디렉토리에 대응하는 캐시 디렉토리 경로를 반환한다.

```typescript
function readPromptContext(cwd: string): PromptContext | null;
```

캐시에서 프롬프트 컨텍스트를 읽는다.

```typescript
function writePromptContext(cwd: string, context: PromptContext): void;
```

프롬프트 컨텍스트를 캐시에 저장한다.

```typescript
function hasPromptContext(cwd: string): boolean;
```

캐시에 프롬프트 컨텍스트가 존재하는지 확인한다.

```typescript
function sessionIdHash(sessionId: string): string;
```

세션 ID의 해시를 생성한다.

```typescript
function isFirstInSession(cwd: string, sessionId: string): boolean;
```

현재 세션에서 첫 번째 주입 여부를 확인한다.

```typescript
function pruneOldSessions(cwd: string, maxAgeDays?: number): void;
```

오래된 세션 캐시 파일을 정리한다.

```typescript
function removeSessionFiles(cwd: string, sessionId: string): void;
```

특정 세션의 캐시 파일을 삭제한다.

```typescript
function markSessionInjected(cwd: string, sessionId: string): void;
```

세션에 이미 컨텍스트가 주입되었음을 표시한다.

```typescript
function saveRunHash(cwd: string, hash: string): void;
```

현재 실행 해시를 캐시에 저장한다.

```typescript
function getLastRunHash(cwd: string): string | null;
```

마지막 실행 해시를 캐시에서 읽는다.

```typescript
function readBoundary(cwd: string): BoundaryInfo | null;
```

캐시에서 경계 정보를 읽는다.

```typescript
function writeBoundary(cwd: string, boundary: BoundaryInfo): void;
```

경계 정보를 캐시에 저장한다.

```typescript
function readFractalMap(cwd: string): FractalMap | null;
```

캐시에서 프랙탈 맵을 읽는다.

```typescript
function writeFractalMap(cwd: string, map: FractalMap): void;
```

프랙탈 맵을 캐시에 저장한다.

```typescript
function computeProjectHash(projectRoot: string): Promise<string>;
```

프로젝트 구조의 해시를 계산한다 (캐시 무효화 기준).

---

## MCP 도구

### createServer / startServer

```typescript
function createServer(): Server;
```

FCA-AI MCP 서버를 생성하고 14개 도구를 등록한다.

```typescript
async function startServer(): Promise<void>;
```

stdio 트랜스포트로 MCP 서버를 시작한다.

### MCP 도구 핸들러

```typescript
function handleAstAnalyze(input: AstAnalyzeInput): Record<string, unknown>;
function handleFractalNavigate(
  input: FractalNavigateInput,
): FractalNavigateOutput;
function handleDocCompress(input: DocCompressInput): DocCompressOutput;
function handleTestMetrics(input: TestMetricsInput): TestMetricsOutput;
function handleFractalScan(input: FractalScanInput): Promise<FractalScanOutput>;
function handleDriftDetect(input: DriftDetectInput): Promise<DriftDetectOutput>;
function handleLcaResolve(input: LcaResolveInput): Promise<LcaResolveOutput>;
function handleRuleQuery(input: RuleQueryInput): Promise<RuleQueryOutput>;
function handleStructureValidate(
  input: StructureValidateInput,
): Promise<StructureValidateOutput>;
function handleReviewManage(
  input: ReviewManageInput,
): Promise<ReviewManageOutput>;
function handleDebtManage(input: DebtManageInput): Promise<DebtManageOutput>;
function handleAstGrepSearch(input: AstGrepSearchInput): Promise<AstGrepSearchOutput>;
function handleAstGrepReplace(input: AstGrepReplaceInput): Promise<AstGrepReplaceOutput>;
function handleCacheManage(input: CacheManageInput): Promise<CacheManageOutput>;
```

### review-format 유틸리티

```typescript
function formatPrComment(report: ReviewReport): string;
```

리뷰 보고서를 PR 코멘트 형식의 마크다운으로 포맷한다.

```typescript
function formatRevalidateComment(report: ReviewReport): string;
```

재검증 요청 코멘트를 마크다운으로 포맷한다.

### ast-grep-shared 유틸리티

```typescript
function getSgModule(): SgModule | null;
```

`@ast-grep/napi` 모듈을 반환한다. 로드 실패 시 `null`.

```typescript
function getSgLoadError(): Error | null;
```

`@ast-grep/napi` 로드 에러를 반환한다. 성공 시 `null`.

```typescript
function getFilesForLanguage(dir: string, lang: string): Promise<string[]>;
```

디렉토리에서 특정 언어에 해당하는 파일 목록을 반환한다.

```typescript
function formatMatch(match: SgMatch): FormattedMatch;
```

ast-grep 매칭 결과를 가독성 좋은 형식으로 변환한다.

```typescript
function toLangEnum(ext: string): string | null;
```

파일 확장자를 ast-grep 언어 열거형으로 변환한다.

```typescript
const AST_GREP_LANGUAGES: readonly string[];
```

지원되는 ast-grep 언어 목록 상수.

```typescript
const EXT_TO_LANG: Record<string, string>;
```

파일 확장자 → ast-grep 언어 매핑 상수.

---

## MCP 도구 스키마

### ast_analyze

```json
{
  "name": "ast_analyze",
  "required": ["source", "analysisType"],
  "properties": {
    "source": "string — 분석할 소스 코드",
    "filePath": "string — 가상 파일 경로",
    "analysisType": "enum: dependency-graph | lcom4 | cyclomatic-complexity | tree-diff | full",
    "className": "string — lcom4 분석 시 필수",
    "oldSource": "string — tree-diff 시 이전 소스"
  }
}
```

### fractal_navigate

```json
{
  "name": "fractal_navigate",
  "required": ["action", "path", "entries"],
  "properties": {
    "action": "enum: classify | sibling-list | tree",
    "path": "string — 대상 경로",
    "entries": "array — { name, path, type, hasIntentMd, hasDetailMd }[]"
  }
}
```

### doc_compress

```json
{
  "name": "doc_compress",
  "required": ["mode"],
  "properties": {
    "mode": "enum: reversible | lossy | auto",
    "filePath": "string — reversible 모드용",
    "content": "string — reversible 모드용",
    "exports": "string[] — reversible 모드용",
    "toolCallEntries": "array — lossy 모드용 { tool, path, timestamp }[]"
  }
}
```

### test_metrics

```json
{
  "name": "test_metrics",
  "required": ["action"],
  "properties": {
    "action": "enum: count | check-312 | decide",
    "files": "array — count/check-312용 { filePath, content }[]",
    "decisionInput": "object — decide용 { testCount, lcom4, cyclomaticComplexity }"
  }
}
```

### fractal_scan

```json
{
  "name": "fractal_scan",
  "required": ["path"],
  "properties": {
    "path": "string — 프로젝트 루트 디렉토리 (절대 경로)",
    "depth": "number — 최대 스캔 깊이 (1-20, 기본: 10)",
    "includeModuleInfo": "boolean — 모듈 진입점 분석 포함 여부 (기본: false)"
  }
}
```

### drift_detect

```json
{
  "name": "drift_detect",
  "required": ["path"],
  "properties": {
    "path": "string — 프로젝트 루트 디렉토리 (절대 경로)",
    "severity": "enum: critical | high | medium | low — 이 심각도 이상만 필터링",
    "generatePlan": "boolean — SyncPlan 생성 여부 (기본: false)"
  }
}
```

### lca_resolve

```json
{
  "name": "lca_resolve",
  "required": ["path", "moduleA", "moduleB"],
  "properties": {
    "path": "string — 프로젝트 루트 디렉토리 (절대 경로)",
    "moduleA": "string — 첫 번째 모듈 상대 경로 (예: src/features/auth)",
    "moduleB": "string — 두 번째 모듈 상대 경로 (예: src/features/payment)"
  }
}
```

### rule_query

```json
{
  "name": "rule_query",
  "required": ["action", "path"],
  "properties": {
    "action": "enum: list | get | check",
    "path": "string — 프로젝트 루트 디렉토리 (절대 경로)",
    "ruleId": "string — 규칙 ID (action=get 시 필수)",
    "category": "enum: naming | structure | dependency | documentation | index | module — action=list 시 필터",
    "targetPath": "string — 대상 경로 (action=check 시 필수)"
  }
}
```

### structure_validate

```json
{
  "name": "structure_validate",
  "required": ["path"],
  "properties": {
    "path": "string — 프로젝트 루트 디렉토리 (절대 경로)",
    "rules": "string[] — 검사할 규칙 ID 목록 (생략 시 전체 활성 규칙)",
    "fix": "boolean — 안전한 위반 자동 수정 여부 (기본: false, 현재 미구현)"
  }
}
```

### review_manage

```json
{
  "name": "review_manage",
  "required": ["action", "projectRoot"],
  "properties": {
    "action": "enum: normalize-branch | ensure-dir | checkpoint | elect-committee | cleanup",
    "projectRoot": "string — 프로젝트 루트 디렉토리 (절대 경로)",
    "branchName": "string — Git 브랜치명 (elect-committee 제외 모든 액션)",
    "changedFilesCount": "number — 변경 파일 수 (elect-committee용)",
    "changedFractalsCount": "number — 변경 프랙탈 수 (elect-committee용)",
    "hasInterfaceChanges": "boolean — 인터페이스 변경 여부 (elect-committee용)"
  }
}
```

### debt_manage

```json
{
  "name": "debt_manage",
  "required": ["action", "projectRoot"],
  "properties": {
    "action": "enum: create | list | resolve | calculate-bias",
    "projectRoot": "string — 프로젝트 루트 디렉토리 (절대 경로)",
    "debtItem": "object — 부채 항목 (action=create용, DebtItemCreate 스키마)",
    "fractalPath": "string — 프랙탈 경로 필터 (action=list용)",
    "debtId": "string — 부채 ID (action=resolve용)",
    "debts": "array — 부채 목록 (action=calculate-bias용)",
    "changedFractalPaths": "string[] — 변경된 프랙탈 경로 (action=calculate-bias용)",
    "currentCommitSha": "string — 현재 커밋 SHA (멱등성, action=calculate-bias용)"
  }
}
```

### ast_grep_search

```json
{
  "name": "ast_grep_search",
  "required": ["pattern", "path"],
  "properties": {
    "pattern": "string — ast-grep 패턴 (예: `console.log($ARG)`)",
    "path": "string — 검색할 디렉토리 또는 파일 경로 (절대 경로)",
    "language": "string — 언어 지정 (생략 시 확장자 자동 감지)",
    "ruleYaml": "string — YAML 형식의 ast-grep 규칙 (pattern 대신 사용 가능)"
  }
}
```

### ast_grep_replace

```json
{
  "name": "ast_grep_replace",
  "required": ["pattern", "rewrite", "path"],
  "properties": {
    "pattern": "string — 매칭할 ast-grep 패턴",
    "rewrite": "string — 교체 템플릿 (메타변수 사용 가능)",
    "path": "string — 대상 디렉토리 또는 파일 경로 (절대 경로)",
    "language": "string — 언어 지정 (생략 시 확장자 자동 감지)",
    "dryRun": "boolean — true 시 파일 변경 없이 결과만 반환 (기본: false)"
  }
}
```

### cache_manage

```json
{
  "name": "cache_manage",
  "required": ["action", "projectRoot"],
  "properties": {
    "action": "enum: read | write | clear | prune | status",
    "projectRoot": "string — 프로젝트 루트 디렉토리 (절대 경로)",
    "key": "string — 캐시 키 (action=read/write용)",
    "value": "unknown — 저장할 값 (action=write용)",
    "maxAgeDays": "number — 정리 기준 일수 (action=prune용, 기본: 7)"
  }
}
```

---

## 타입 정의

### Fractal 타입 (`types/fractal.ts`)

```typescript
type NodeType = 'fractal' | 'organ' | 'pure-function';

interface FractalNode {
  path: string;
  name: string;
  type: NodeType;
  parent: string | null;
  children: string[];
  organs: string[];
  hasIntentMd: boolean;
  hasDetailMd: boolean;
}

interface FractalTree {
  root: string;
  nodes: Map<string, FractalNode>;
}
type FractalMap = Map<string, FractalNode>;

interface ChainResult {
  chain: string[];
  root: string | null;
  boundary: string | null;
}

interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'export' | 'call' | 'inheritance';
}
interface DependencyDAG {
  nodes: Set<string>;
  edges: DependencyEdge[];
  adjacency: Map<string, string[]>;
}
```

### Document 타입 (`types/documents.ts`)

```typescript
interface ThreeTierBoundary {
  alwaysDo: string[];
  askFirst: string[];
  neverDo: string[];
}
interface IntentMdSchema {
  name: string;
  purpose: string;
  commands: Record<string, string>;
  structure: Record<string, string>;
  boundaries: ThreeTierBoundary;
  dependencies: string[];
  lineCount: number;
}
interface DetailMdSchema {
  title: string;
  requirements: string[];
  apiContracts: string[];
  lastUpdated: string;
  compressionMeta?: CompressionMeta;
}
interface CompressionMeta {
  method: 'reversible' | 'lossy';
  originalLines: number;
  compressedLines: number;
  timestamp: string;
  recoverable: boolean;
}
interface IntentMdValidation {
  valid: boolean;
  violations: DocumentViolation[];
}
interface DetailMdValidation {
  valid: boolean;
  violations: DocumentViolation[];
}
interface DocumentViolation {
  rule:
    | 'line-limit'
    | 'deduplication'
    | 'append-only'
    | 'missing-boundaries'
    | 'missing-section';
  message: string;
  severity: 'error' | 'warning';
}
```

### Metrics 타입 (`types/metrics.ts`)

```typescript
interface LCOM4Result {
  value: number;
  components: string[][];
  methodCount: number;
  fieldCount: number;
}
interface CyclomaticComplexityResult {
  value: number;
  perFunction: Map<string, number>;
  fileTotal: number;
}
interface TestCaseCount {
  filePath: string;
  fileType: 'spec' | 'test';
  total: number;
  basic: number;
  complex: number;
}
interface ThreePlusTwelveResult {
  violated: boolean;
  files: TestCaseCount[];
  violatingFiles: string[];
}
type DecisionAction = 'split' | 'compress' | 'parameterize' | 'ok';
interface DecisionResult {
  action: DecisionAction;
  reason: string;
  metrics: { testCount: number; lcom4: number; cyclomaticComplexity: number };
}
interface PromotionCandidate {
  testFilePath: string;
  specFilePath: string;
  stableDays: number;
  lastFailure: string | null;
  eligible: boolean;
  caseCount: number;
}
```

### Hook 타입 (`types/hooks.ts`)

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
interface PostToolUseInput extends HookBaseInput {
  tool_name: string;
  tool_input: { file_path?: string; path?: string; [key: string]: unknown };
  tool_response: { [key: string]: unknown };
}
interface SubagentStartInput extends HookBaseInput {
  agent_type: string;
  agent_id: string;
}
interface UserPromptSubmitInput extends HookBaseInput {
  prompt?: string;
}
interface HookOutput {
  continue: boolean;
  hookSpecificOutput?: { additionalContext?: string };
}
type HookInput =
  | PreToolUseInput
  | PostToolUseInput
  | SubagentStartInput
  | UserPromptSubmitInput;
```

### AST 타입 (`types/ast.ts`)

```typescript
interface ImportInfo {
  source: string;
  specifiers: string[];
  isTypeOnly: boolean;
  line: number;
}
interface ExportInfo {
  name: string;
  isTypeOnly: boolean;
  isDefault: boolean;
  line: number;
}
interface CallInfo {
  callee: string;
  line: number;
}
interface DependencyInfo {
  filePath: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  calls: CallInfo[];
}
interface MethodInfo {
  name: string;
  accessedFields: string[];
}
interface ClassInfo {
  name: string;
  methods: MethodInfo[];
  fields: string[];
}
interface TreeDiffChange {
  type: 'added' | 'removed' | 'modified';
  kind: string;
  name: string;
  oldLine?: number;
  newLine?: number;
}
interface TreeDiffResult {
  changes: TreeDiffChange[];
  hasSemanticChanges: boolean;
  formattingOnlyChanges: number;
}
```

---

## 관련 문서

- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 상수 및 임계값 레퍼런스
- [02-BLUEPRINT.md](./02-BLUEPRINT.md) — 모듈별 기술 청사진
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — 내부 동작 메커니즘
