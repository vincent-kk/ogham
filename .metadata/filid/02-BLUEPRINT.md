# 02. 모듈별 기술 청사진

> 6개 도메인의 모든 모듈에 대한 목적, 핵심 알고리즘, 입출력 시그니처, 의존 관계 정리.

---

## 도메인 개요

```
src/
├── types/      7 파일   38 타입/인터페이스   ← 모든 모듈의 기반 (+review.ts, debt.ts)
├── core/       7 모듈   10 함수 + 1 클래스    순수 비즈니스 로직
├── ast/        5 모듈   7 함수               TypeScript AST 분석
├── metrics/    4 모듈   4 함수               소프트웨어 메트릭
├── compress/   2 모듈   3 함수               컨텍스트 압축
├── hooks/      8 모듈   8 함수 + 7 엔트리     Claude Code Hook 연동 (entries/ 하위 디렉토리)
└── mcp/tools/  15 모듈                       MCP tool 핸들러 (+ast-grep-search, ast-grep-replace, cache-manage)
```

---

## 1. types/ — 타입 정의

### fractal.ts (5 타입)

| 타입             | 용도                                                  |
| ---------------- | ----------------------------------------------------- |
| `NodeType`       | `'fractal' \| 'organ' \| 'pure-function'` 유니온      |
| `FractalNode`    | 트리 노드: path, name, type, parent, children, organs |
| `FractalTree`    | 루트 경로 + `Map<string, FractalNode>`                |
| `DependencyEdge` | from → to 방향 엣지 + type                            |
| `DependencyDAG`  | 노드 Set + 엣지 배열 + 인접 리스트                    |

### documents.ts (7 타입)

| 타입                  | 용도                                         |
| --------------------- | -------------------------------------------- |
| `ThreeTierBoundary`   | alwaysDo / askFirst / neverDo 문자열 배열    |
| `IntentMdSchema`      | INTENT.md 파싱 결과 구조                     |
| `DetailMdSchema`      | DETAIL.md 파싱 결과 구조                     |
| `CompressionMeta`     | 압축 메타데이터 (method, lines, recoverable) |
| `IntentMdValidation`  | 검증 결과 (valid + violations)               |
| `DetailMdValidation`  | 검증 결과 (valid + violations)               |
| `DocumentViolation`   | 위반 상세 (rule, message, severity)          |

### metrics.ts (7 타입)

| 타입                         | 용도                                              |
| ---------------------------- | ------------------------------------------------- |
| `LCOM4Result`                | 값, components, 메서드/필드 수                    |
| `CyclomaticComplexityResult` | 값, 함수별 CC, 파일 합계                          |
| `TestCaseCount`              | 파일별 테스트 카운트 (basic/complex)              |
| `ThreePlusTwelveResult`      | 위반 여부 + 위반 파일 목록                        |
| `DecisionAction`             | `'split' \| 'compress' \| 'parameterize' \| 'ok'` |
| `DecisionResult`             | 액션 + 근거 + 관련 메트릭                         |
| `PromotionCandidate`         | 승격 후보 정보 + eligible                         |

### hooks.ts (7 타입)

| 타입                    | 용도                                           |
| ----------------------- | ---------------------------------------------- |
| `HookBaseInput`         | 공통 입력 (cwd, session_id, hook_event_name)   |
| `PreToolUseInput`       | tool_name + tool_input (file_path, content 등) |
| `PostToolUseInput`      | tool_name + tool_input + tool_response         |
| `SubagentStartInput`    | agent_type + agent_id                          |
| `UserPromptSubmitInput` | prompt 텍스트                                  |
| `HookOutput`            | continue 플래그 + additionalContext            |
| `HookInput`             | 4개 입력 타입 유니온                           |

### ast.ts (8 타입)

| 타입             | 용도                                               |
| ---------------- | -------------------------------------------------- |
| `ImportInfo`     | 모듈 경로 + specifier + type-only + line           |
| `ExportInfo`     | 이름 + type-only + default + line                  |
| `CallInfo`       | callee 표현식 + line                               |
| `DependencyInfo` | 파일 전체 의존성 (imports/exports/calls)           |
| `MethodInfo`     | 메서드명 + 접근 필드 목록                          |
| `ClassInfo`      | 클래스명 + methods + fields                        |
| `TreeDiffChange` | 변경 종류 + 선언 kind/name + line                  |
| `TreeDiffResult` | 변경 목록 + hasSemanticChanges + formatting 카운트 |

---

## 2. core/ — 순수 비즈니스 로직

### fractal-tree.ts

**목적**: 프랙탈 트리 자료구조 구축 및 탐색

**핵심 알고리즘**:

- `buildFractalTree`: 경로 길이 오름차순 정렬 → 전체 노드 생성 → 가장 깊은 조상 매칭으로 부모-자식 관계 수립
- `findParentPath`: 모든 후보 경로 중 `path.startsWith(candidate + '/')` && 최장 매칭

**입출력**:

```
buildFractalTree(NodeEntry[]) → FractalTree
findNode(FractalTree, string) → FractalNode | undefined
getAncestors(FractalTree, string) → FractalNode[]  (leaf → root)
getDescendants(FractalTree, string) → FractalNode[] (BFS, organ 제외)
```

**의존**: `types/fractal`

### organ-classifier.ts

**목적**: 디렉토리 노드의 fractal / organ / pure-function 분류

**핵심 알고리즘**: 우선순위 기반 4단계 분류

1. INTENT.md 존재 → fractal
2. ORGAN_DIR_NAMES 매칭 → organ
3. 사이드이펙트 없음 → pure-function
4. 기본값 → fractal

**입출력**:

```
classifyNode(ClassifyInput) → NodeType
isOrganDirectory(string) → boolean
```

**의존**: `types/fractal` (NodeType만)

### document-validator.ts

**목적**: INTENT.md 및 DETAIL.md 문서 규칙 검증

**핵심 알고리즘**:

- `countLines`: 빈 문자열 = 0, 후행 `\n` 무시, `split('\n').length`
- `validateIntentMd`: 50줄 체크 + 3-tier regex 매칭
- `detectAppendOnly`: 기존 줄 1:1 비교 + 새 줄 추가만 존재 판별
- `validateDetailMd`: append-only 감지

**입출력**:

```
validateIntentMd(string) → IntentMdValidation
validateDetailMd(string, string?) → DetailMdValidation
countLines(string) → number
detectAppendOnly(string, string) → boolean
```

**의존**: `types/documents`

### dependency-graph.ts

**목적**: 모듈 간 의존 관계 DAG 구축 및 분석

**핵심 알고리즘**:

- `buildDAG`: 엣지 순회 → 노드 Set + 인접 리스트 구축
- `topologicalSort`: Kahn 알고리즘 (in-degree 0 큐)
- `detectCycles`: DFS 3색(WHITE/GRAY/BLACK) 사이클 감지

**입출력**:

```
buildDAG(DependencyEdge[]) → DependencyDAG
topologicalSort(DependencyDAG) → string[] | null
detectCycles(DependencyDAG) → string[][]
getDirectDependencies(DependencyDAG, string) → string[]
```

**의존**: `types/fractal` (DependencyEdge, DependencyDAG)

### boundary-detector.ts

**목적**: 파일 경로에서 패키지 경계(boundary) 탐색 및 INTENT.md/DETAIL.md 체인 구축

**핵심 알고리즘**:

- `findBoundary`: 파일 경로에서 위로 순회하며 `package.json` 존재 디렉토리 탐색
- `buildChain`: boundary까지 각 디렉토리의 INTENT.md/DETAIL.md 존재 여부를 Map으로 수집

**입출력**:

```
findBoundary(filePath: string) → string | null
buildChain(filePath: string) → ChainResult | null
```

```typescript
interface ChainResult {
  boundary: string;         // package.json 포함 디렉토리
  chain: string[];          // leaf → root 디렉토리 목록
  intents: Map<string, boolean>;  // INTENT.md 존재 여부
  details: Map<string, boolean>;  // DETAIL.md 존재 여부
}
```

**의존**: 없음 (Node.js `fs`, `path` 내장)

### cache-manager.ts

**목적**: 세션별 컨텍스트 캐시 관리 (`~/.claude/plugins/filid/{cwdHash}/`)

**핵심 알고리즘**: SHA-256 기반 cwd 해시로 프로젝트별 격리. 세션 ID 해시로 세션별 파일 분리. TTL 24h 초과 파일 자동 정리.

**캐시 파일 종류**:

| 파일 패턴 | 용도 |
| --------- | ---- |
| `session-context-{hash}` | 세션 시작 마커 |
| `prompt-context-{hash}` | FCA 규칙 텍스트 캐시 |
| `boundary-{hash}` | 디렉토리 → boundary 경로 매핑 (JSON) |
| `fmap-{hash}.json` | FractalMap (reads/intents/details) |
| `guide-{hash}` | `[filid:guide]` 주입 완료 마커 |
| `run-{skillName}.hash` | 스킬 증분 실행용 해시 |

**주요 함수**:

```
getCacheDir(cwd) → string
readBoundary/writeBoundary(cwd, sessionId, dir, ...) → string|null/void
readFractalMap/writeFractalMap/removeFractalMap(cwd, sessionId, ...) → FractalMap/void
hasGuideInjected/markGuideInjected(sessionId, cwd) → boolean/void
pruneOldSessions(cwd) → void
```

**의존**: Node.js `fs`, `crypto`, `os`

### change-queue.ts

**목적**: PR 시점까지 파일 변경 이력을 누적하는 큐

**핵심 알고리즘**: 단순 배열 기반 큐. `enqueue`로 추가, `drain`으로 전체 소비.
`getAffectedFractals`는 경로에서 디렉토리를 추출하여 중복 제거.

**입출력**:

```
enqueue(ChangeRecord) → void
drain() → ChangeRecord[]
peek() → ChangeRecord[]
getChangesByPath() → Map<string, ChangeRecord[]>
getAffectedFractals() → string[]
clear/size/isEmpty → void/number/boolean
```

**의존**: 없음 (자체 `ChangeRecord` 인터페이스)

---

## 3. ast/ — TypeScript AST 분석

### parser.ts

**목적**: TypeScript Compiler API 기반 소스 코드 파싱

**핵심 알고리즘**: `ts.createSourceFile()` 래퍼. 확장자에 따라 `ScriptKind.JS`/`TS` 자동 결정. `setParentNodes: true`로 부모 노드 참조 활성화.

**입출력**:

```
parseSource(string, string?) → ts.SourceFile
parseFile(string) → ts.SourceFile
```

**의존**: `typescript` (외부)

### dependency-extractor.ts

**목적**: import/export/call 3종 의존성 추출

**핵심 알고리즘**: AST 재귀 순회 (`ts.forEachChild`):

- `ImportDeclaration` → moduleSpecifier + named/default/namespace 바인딩
- `ExportDeclaration` + `hasExportModifier` → function/class/variable/type/interface
- `CallExpression` → `getCalleeText` (identifier + property access 재귀)

**입출력**:

```
extractDependencies(string, string?) → DependencyInfo
```

**의존**: `ast/parser`, `types/ast`

### lcom4.ts

**목적**: LCOM4 (Lack of Cohesion of Methods) 계산

**핵심 알고리즘**:

1. `extractClassInfo`: 클래스 선언 탐색 → 필드(PropertyDeclaration) + 메서드(MethodDeclaration) 수집 → 메서드별 `this.field` 접근 추출
2. `calculateLCOM4`: 무방향 그래프 구축 (메서드 = 노드, 공유 필드 = 엣지) → BFS connected components → 개수 = LCOM4 값

```
LCOM4 = 1 → 높은 응집도 (양호)
LCOM4 >= 2 → 분리된 책임 (split 권고)
LCOM4 = 0 → 분석 대상 메서드 없음
```

**입출력**:

```
extractClassInfo(string, string) → ClassInfo | null
calculateLCOM4(string, string) → LCOM4Result
```

**의존**: `ast/parser`, `types/metrics`, `types/ast`

### cyclomatic-complexity.ts

**목적**: 함수별/파일별 Cyclomatic Complexity 계산

**핵심 알고리즘**: `CC = 1 (base) + 결정 포인트 수`

결정 포인트 목록:
| AST 노드 | 설명 |
|-----------|------|
| `IfStatement` | if 분기 |
| `ForStatement` / `ForInStatement` / `ForOfStatement` | for 루프 |
| `WhileStatement` / `DoStatement` | while/do-while 루프 |
| `CaseClause` | switch case (default 제외) |
| `ConditionalExpression` | 삼항 연산자 `?:` |
| `BinaryExpression(&&)` | 논리 AND |
| `BinaryExpression(\|\|)` | 논리 OR |

**입출력**:

```
calculateCC(string, string?) → CyclomaticComplexityResult
```

**의존**: `ast/parser`, `types/metrics`

### tree-diff.ts

**목적**: 두 소스 버전 간 의미론적 diff

**핵심 알고리즘**:

1. `extractDeclarations`: 최상위 선언(function, class, variable, interface, type) 추출
2. `normalize`: 노드 텍스트에서 `\s+` → `''` (공백 제거)
3. 비교: 이름 기반 old→new 매핑 → removed/modified/added 분류
4. 포맷팅 전용 변경: 선언 diff 없지만 원본 텍스트가 다른 경우 카운트

**입출력**:

```
computeTreeDiff(string, string, string?) → TreeDiffResult
```

**의존**: `ast/parser`, `types/ast`

---

## 4. metrics/ — 소프트웨어 메트릭

### test-counter.ts

**목적**: 테스트 파일의 케이스 수 카운팅

**핵심 알고리즘**: 줄 단위 스캔:

- `describe` 패턴 → depth++
- `it`/`test` 패턴 → depth <= 1이면 basic++, 아니면 complex++
- `});` 패턴 → depth-- (depth > 0일 때만)

**입출력**:

```
countTestCases(RawTestFile) → TestCaseCount
```

**의존**: `types/metrics`

### three-plus-twelve.ts

**목적**: 3+12 규칙 (spec 파일당 최대 15 테스트) 검증

**핵심 알고리즘**: `fileType === 'spec'` 필터 → `total > 15` 필터 → 위반 파일 수집

**입출력**:

```
check312Rule(TestCaseCount[]) → ThreePlusTwelveResult
```

**의존**: `types/metrics`

### decision-tree.ts

**목적**: FCA-AI 의사결정 트리 (모듈 액션 결정)

**핵심 알고리즘**: 4단계 파이프라인

```
testCount <= 15? ──YES──→ ok
       │ NO
       ▼
LCOM4 >= 2? ──YES──→ split
       │ NO
       ▼
CC > 15? ──YES──→ compress
       │ NO
       ▼
parameterize
```

**입출력**:

```
decide(DecisionInput) → DecisionResult
```

**의존**: `types/metrics`

### promotion-tracker.ts

**목적**: test.ts → spec.ts 승격 자격 판별

**핵심 알고리즘**: `stableDays >= threshold (90) && lastFailure === null`

**입출력**:

```
checkPromotionEligibility(PromotionInput, number?) → PromotionCandidate
```

**의존**: `types/metrics`

---

## 5. compress/ — 컨텍스트 압축

### reversible-compactor.ts

**목적**: 파일 내용을 3줄 레퍼런스로 압축 (복원 가능)

**핵심 알고리즘**: 파일 경로 + 내보내기 심볼 + 줄 수를 3줄 텍스트로 변환

```
[REF] /path/to/file.ts
[EXPORTS] functionA, functionB
[LINES] 150
```

**입출력**:

```
compactReversible(CompactInput) → CompactResult
restoreFromCompacted(string) → RestoredReference
```

**의존**: `types/documents` (CompressionMeta)

### lossy-summarizer.ts

**목적**: 도구 호출 이력을 집계 통계로 압축 (복원 불가)

**핵심 알고리즘**: 엔트리 배열 → 도구별 카운트 + 고유 파일 + 시간 범위 집계

**입출력**:

```
summarizeLossy(ToolCallEntry[]) → LossySummaryResult
```

**의존**: `types/documents` (CompressionMeta)

---

## 6. hooks/ — Claude Code Hook 연동

### 로직 모듈 (8개)

| 모듈                 | Hook 이벤트      | 동작                                              |
| -------------------- | ---------------- | ------------------------------------------------- |
| `pre-tool-validator` | PreToolUse       | INTENT.md/DETAIL.md Write 검증                    |
| `structure-guard`    | PreToolUse       | Organ 디렉토리 INTENT.md 차단                     |
| `intent-injector`    | PreToolUse       | 파일 접근 시 INTENT.md 컨텍스트 + 프랙탈맵 주입  |
| `change-tracker`     | _(disabled)_     | ChangeQueue에 변경 기록 (hooks.json에서 제거됨)   |
| `agent-enforcer`     | SubagentStart    | 에이전트 역할 제한 주입                           |
| `context-injector`   | UserPromptSubmit | 세션 첫 프롬프트에 FCA-AI 규칙 리마인더 주입      |
| `setup`              | SessionStart     | 캐시 디렉토리 초기화 + 만료 세션 파일 정리        |
| `shared`             | _(유틸)_         | `isFcaProject`, `isIntentMd`, `isDetailMd` 공용 헬퍼 |

### 엔트리 스크립트 (7개: `hooks/entries/*.entry.ts`)

각 엔트리는 동일한 패턴:

```typescript
const chunks: Buffer[] = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk as Buffer);
}
const input = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
const result = handler(input);
process.stdout.write(JSON.stringify(result));
```

stdin에서 JSON 읽기 → 핸들러 호출 → stdout에 JSON 쓰기.

빌드 결과물은 ESM `.mjs` 파일로 생성 (`scripts/build-hooks.mjs` 사용). 후크 실행기는 `find-node.sh` 대신 `libs/run.cjs`를 통해 Node.js를 직접 호출한다.

---

## 데이터 흐름 다이어그램

```
[Source Code]
      │
      ▼
┌──────────┐    ┌───────────────┐    ┌─────────────┐
│  parser   │───→│ dependency-   │───→│ DependencyDAG│
│ (AST)     │    │ extractor     │    │ (buildDAG)   │
└──────────┘    └───────────────┘    └─────────────┘
      │
      ├──────────→ lcom4 ──────────→ LCOM4Result
      │
      ├──────────→ cyclomatic-complexity → CCResult
      │
      └──────────→ tree-diff ────→ TreeDiffResult
                                        │
                          ┌─────────────┤
                          ▼             ▼
                   ┌──────────┐  ┌───────────┐
                   │ decision  │  │ change-   │
                   │ -tree     │  │ queue     │
                   └──────────┘  └───────────┘
                          │             │
                          ▼             ▼
                   ┌──────────┐  ┌───────────┐
                   │ ok/split/ │  │ PR-time   │
                   │ compress/ │  │ sync      │
                   │ param.    │  │           │
                   └──────────┘  └───────────┘
```

---

---

## 7. 거버넌스 모듈 — 코드 리뷰 스킬

### skills/code-review/

**목적**: 다중 페르소나 합의체 기반 코드 리뷰 거버넌스

**구조**:

```
skills/code-review/
├── SKILL.md                      # 의장 오케스트레이터 (~105줄)
├── reference.md                  # 출력 포맷, MCP tool 맵, 부채 바이어스 테이블
├── state-machine.md              # PROPOSAL→DEBATE→VETO/SYNTHESIS/ABSTAIN→CONCLUSION
├── phases/
│   ├── phase-a-analysis.md       # Phase A subagent: git diff, 위원회 선출
│   └── phase-b-verification.md   # Phase B subagent: MCP 기술 검증
└── personas/                     # 6개 페르소나 프레임워크 (각 ≤70줄)
    ├── engineering-architect.md
    ├── knowledge-manager.md
    ├── operations-sre.md
    ├── business-driver.md
    ├── product-manager.md
    └── design-hci.md
```

**MCP tool 의존**: `review_manage` (5 actions), `debt_manage` (1 action: calculate-bias), 기존 12개 MCP tool

### skills/resolve-review/

**목적**: 수정 사항 수용/거부 + 소명 + ADR 정제 + 부채 기록

**구조**:

```
skills/resolve-review/
├── SKILL.md       # 6-step 워크플로우 (~119줄)
└── reference.md   # justifications.md 포맷, ADR 가이드라인, AskUserQuestion 패턴
```

**MCP tool 의존**: `review_manage` (normalize-branch), `debt_manage` (create)

### skills/re-validate/

**목적**: Delta 기반 경량 재검증, PASS/FAIL 최종 판정

**구조**:

```
skills/re-validate/
├── SKILL.md       # 7-step 워크플로우 (~126줄)
└── reference.md   # re-validate.md 포맷, PR 코멘트 포맷, 비협상 규칙
```

**MCP tool 의존**: `review_manage` (normalize-branch), `debt_manage` (list, resolve), 기존 MCP tool (재검증용)

---

## 8. 거버넌스 MCP tool 모듈

### src/mcp/tools/review_manage.ts (217줄)

**목적**: 리뷰 세션 결정론적 관리

| Action             | 핵심 알고리즘                                                 |
| ------------------ | ------------------------------------------------------------- |
| `normalize-branch` | `/` → `--`, 특수문자 → `_`, 연속 `--` 보존                    |
| `ensure-dir`       | `.filid/review/<normalized>/` 재귀 생성                       |
| `checkpoint`       | session.md/verification.md/review-report.md 존재로 Phase 판정 |
| `elect-committee`  | 복잡도(LOW/MED/HIGH) → 위원 수(2/4/6) + 적대적 짝짓기         |
| `cleanup`          | 리뷰 디렉토리 재귀 삭제                                       |

**의존**: `types/review.ts`

### src/mcp/tools/debt_manage.ts (301줄)

**목적**: 기술 부채 결정론적 관리

| Action           | 핵심 알고리즘                                                   |
| ---------------- | --------------------------------------------------------------- |
| `create`         | YAML frontmatter + markdown 본문으로 `.filid/debt/<id>.md` 생성 |
| `list`           | glob 패턴으로 부채 파일 수집 + 가중치 합계                      |
| `resolve`        | 부채 파일 삭제 (규칙 충족 시)                                   |
| `calculate-bias` | `base × 2^touch_count` (cap=16) + `last_review_commit` 멱등성   |

**의존**: `types/debt.ts`

### src/types/review.ts (66줄)

| 타입                 | 용도                                       |
| -------------------- | ------------------------------------------ |
| `ReviewSession`      | 브랜치, 복잡도, 위원회, 변경 프랙탈 목록   |
| `VerificationResult` | 통과 여부, 치명적 실패 목록, 부채 바이어스 |
| `CommitteeElection`  | 복잡도 판정, 위원 배열, 적대적 짝짓기      |
| `CheckpointStatus`   | phase(A/B/C/DONE), 존재 파일 목록          |

### src/types/debt.ts (66줄)

| 타입         | 용도                                      |
| ------------ | ----------------------------------------- |
| `DebtItem`   | 프랙탈 경로, 규칙 위반, 가중치, 소명, ADR |
| `DebtWeight` | base, touch_count, calculated, capped     |
| `BiasLevel`  | LOW_PRESSURE / MODERATE / HIGH / CRITICAL |
| `BiasResult` | 수준, 총점, 갱신된 부채 목록              |

---

## 관련 문서

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — 전체 아키텍처
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — 내부 동작 메커니즘
- [08-API-SURFACE.md](./08-API-SURFACE.md) — API 레퍼런스
