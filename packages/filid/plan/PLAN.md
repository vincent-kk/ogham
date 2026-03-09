<!-- claude --resume 70922cc7-8120-4364-9125-78ae25ade9ec   -->

# Filid Full Refactoring Plan — RALPLAN-DR (Deliberate Mode)

> 4개 Phase를 아우르는 통합 구현 계획.
> Phase 1(Rename) → Phase 2(Boundary) → Phase 3(Hook 통합) → Phase 4(Cache)

---

## RALPLAN-DR Summary

### Principles (5)

1. **점진적 안전성**: 매 Step/Phase 끝에서 `yarn typecheck` + `yarn filid test:run` 통과. 중간 상태에서도 컴파일 가능해야 한다.
2. **하위 호환**: deprecated alias + fallback으로 기존 사용자 CLAUDE.md/SPEC.md 프로젝트가 중단 없이 동작한다.
3. **단일 책임 분리**: 로직 파일(pre-tool-validator.ts, structure-guard.ts)은 유지하고, entry point만 통합한다.
4. **캐시 최소주의**: 변경 빈도가 낮은 것(boundary)만 캐싱. INTENT.md 내용은 매번 직접 읽는다.
5. **롤백 가능성**: 각 Phase는 독립 커밋 그룹으로, `git revert`로 Phase 단위 롤백 가능.

### Decision Drivers (Top 3)

1. **성능**: Write|Edit 시 2회 fork → 1회 fork (~200ms → ~100ms). Read 시 맥락 주입 추가 (~100ms 신규).
2. **자립성**: Claude Code의 CLAUDE.md/SPEC.md 명명 규약 종속에서 벗어나 INTENT.md/DETAIL.md 기반 독립 컨텍스트 트리 확립.
3. **유지보수성**: 3개 분산 hook → 1개 통합 entry + 분리된 로직 모듈 = 진입점 관리 비용 감소.

### Viable Options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. 순차 Phase 실행 (Selected)** | P1→P2→P3→P4 순서, 각 Phase 완료 후 다음 진행 | 의존 관계 자연스럽게 해소, 중간 검증 가능, 롤백 단위 명확 | 전체 완료까지 4 사이클 |
| **B. P1+P2 병렬 → P3→P4** | Rename과 Boundary를 동시 진행 | 전체 일정 단축 가능 | P2가 INTENT.md 이름을 전제하므로 P1 미완 시 하드코딩 이름 충돌, 머지 컨플릭트 위험 |
| **C. Big Bang (P1~P4 일괄)** | 전체를 단일 커밋 세트로 | 최소 반복 | 디버깅 불가, 실패 시 원인 특정 어려움, 770+ 참조 일괄 변경의 리스크 |

> Option B 기각 사유: P2의 `buildChain()`이 `existsSync('INTENT.md')`를 호출하므로 P1의 rename이 선행 필수. 병렬 시 naming 불일치로 양쪽 모두 테스트 실패.
> Option C 기각 사유: 100+ 파일 770+ 참조를 한 번에 변경하면 컴파일 에러 추적이 사실상 불가능.

### Pre-mortem (4 Failure Scenarios)

1. **Phase 1 중간 상태 컴파일 실패**: Step 2에서 core 모듈의 `hasClaudeMd` 참조를 전환하는 도중 테스트가 deprecated alias를 인식하지 못해 연쇄 에러 발생.
   - **완화**: Step 1에서 deprecated alias를 먼저 확립. Step 2는 alias가 존재하는 상태에서만 진행. 각 Step 완료 후 `yarn typecheck` 게이트.

2. **Phase 3 hook 통합 시 기존 동작 누락**: `pre-tool-validator`와 `structure-guard`의 미묘한 실행 순서/우선순위 차이가 통합 오케스트레이터에서 재현되지 않음.
   - **완화**: 기존 entry 테스트를 통합 entry 대상으로 1:1 포팅. `mergeResults()` 로직에 대한 단위 테스트 추가. continue=false가 하나라도 있으면 전체 차단 보장.

3. **Phase 4 boundary 캐시 stale 문제**: `package.json` 이동/삭제 후 캐시가 갱신되지 않아 잘못된 boundary 반환.
   - **완화**: git HEAD 변경 시 전체 무효화. 세션 종료 시 자동 정리. 캐시 미스 시 lazy 재탐지로 graceful degradation.

4. **SPEC.md fallback 누락으로 기존 SPEC.md 프로젝트에서 organ 오분류**: `isDetailMd()` fallback이 SPEC.md를 인식하지 못하면, 기존 SPEC.md가 있는 프로젝트에서 organ-classifier가 해당 디렉토리를 organ으로 잘못 분류할 수 있음.
   - **완화**: `isDetailMd()`에 SPEC.md fallback 필수 포함. `hasSpecMd` deprecated alias가 `hasDetailMd`로 매핑되는지 단위 테스트 검증. Phase 1 Step 1.3에서 fallback 테스트 추가.

### Expanded Test Plan

#### Unit Tests
- `isIntentMd()` fallback: CLAUDE.md 경로도 true 반환
- `isDetailMd()` fallback: SPEC.md 경로도 true 반환
- `isFcaProject()` fallback: INTENT.md 없이 CLAUDE.md만 있을 때 true
- `validateIntentMd()`: 50줄 제한 + 3-tier boundary 검증
- `validateDetailMd()`: DETAIL.md 검증 + SPEC.md fallback
- `classifyNode()`: `hasIntentMd` 프로퍼티 동작 + deprecated `hasClaudeMd` 호환
- `classifyNode()`: `hasDetailMd` 프로퍼티 동작 + deprecated `hasSpecMd` 호환
- `buildChain()`: depth 1~5 체인 구성, boundary 경계에서 중단
- `mergeResults()`: continue 조합(true+true, true+false, false+false), additionalContext 합산
- `readBoundary()`/`writeBoundary()`: 캐시 히트/미스/만료

#### Integration Tests
- INTENT.md 기반 프로젝트 전체 스캔 (`scanProject`) → FractalTree 정상 구성
- PreToolUse(Read) → intent 주입 정상 동작 + 중복 주입 방지
- PreToolUse(Write INTENT.md in organ) → 차단 메시지에 "INTENT.md" 표기
- PreToolUse(Write|Edit) → validator + guard + injector 모두 실행

#### E2E Tests
- `fca-init` 실행 → INTENT.md + DETAIL.md 생성 (CLAUDE.md/SPEC.md 아님)
- `fca-scan` 실행 → `organ-no-intentmd` 규칙으로 위반 검출
- Hook 차단 → organ 디렉토리에 INTENT.md Write 시도 → 차단

#### Observability
- 각 Phase 완료 후 `yarn build` + bridge/ 산출물 grep 검증
- deprecated alias가 `dist/*.d.ts`에 정상 export 확인
- 벤치마크 회귀 없음 (±5% 이내)

---

## ADR (Architecture Decision Record)

### Decision
4개 Phase를 순차적으로 실행하여 filid를 Claude Code 종속에서 독립시킨다.
- P1: CLAUDE.md → INTENT.md + SPEC.md → DETAIL.md 동시 리네이밍
- P2: Boundary 감지 + Context Chain 구성
- P3: PreToolUse 3-hook → 1-hook 통합 + Intent 주입
- P4: Boundary 캐싱 (cache-manager.ts 확장)

### Drivers
1. filid의 정체성 확립 (Claude Code 무관한 범용 프랙탈 아키텍처 도구)
2. hook 실행 성능 개선 (2 fork → 1 fork)
3. 자동 맥락 주입으로 사용자 경험 향상

### Alternatives Considered
- 전체 일괄 변경 → 기각 (디버깅 불가)
- P1+P2 병렬 → 기각 (naming 의존성)
- SPEC.md도 동시 리네이밍 → **채택** (동일 패턴이므로 합치는 게 효율적, 스키마 필드명이 DETAIL.md 역할과 자연스럽게 부합)

### Why Chosen
순차 Phase 실행이 가장 안전하고, deprecated alias로 중간 상태 안전성 확보, 각 Phase가 독립 롤백 가능. SPEC.md → DETAIL.md를 Phase 1에 포함하여 동일한 기계적 치환 패턴을 한 번에 처리.

### Consequences
- 전체 완료까지 4 사이클 소요 (각 Phase 1~3시간 executor 시간)
- Phase 1 범위 증가: SPEC.md 계열 ~60파일 ~260참조 추가 (총 ~770+ 참조)
- Phase 3 이후 Read 이벤트에 ~100ms 오버헤드 추가 (맥락 주입)

### Follow-ups
- Daemon 기반 고속화 (Phase 6, 실측 후 필요 시)
- CLI 배포 전략 (`filid build` 프리빌드)

---

## Phase 1: CLAUDE.md → INTENT.md + SPEC.md → DETAIL.md Rename

### Scope
- ~100+ 파일, ~770+ 참조 (CLAUDE.md 계열 ~500 + SPEC.md 계열 ~260)
- 두 문서 동시 리네이밍: CLAUDE.md → INTENT.md, SPEC.md → DETAIL.md
- 로직 변경 없음 — 순수 기계적 치환
- 스키마 구조 변경 없음 (필드명 유지, 타입명만 변경)

### Step 1.1: Core Types + Shared Utilities (Foundation)

**대상 파일 (~10개)**:

| File | 변경 내용 |
|------|-----------|
| `src/types/documents.ts` | `ClaudeMdSchema` → `IntentMdSchema`, `ClaudeMdValidation` → `IntentMdValidation` + deprecated alias. `SpecMdSchema` → `DetailMdSchema` + deprecated alias |
| `src/types/fractal.ts` | `FractalNode.hasClaudeMd` → `hasIntentMd` + deprecated alias. `FractalNode.hasSpecMd` → `hasDetailMd` + deprecated alias |
| `src/types/index.ts` | re-export 업데이트 + deprecated alias export (INTENT + DETAIL 양쪽) |
| `src/hooks/shared.ts` | `isClaudeMd()` → `isIntentMd()` (fallback: CLAUDE.md도 인식). `isSpecMd()` → `isDetailMd()` (fallback: SPEC.md도 인식). `isFcaProject()`: INTENT.md \|\| CLAUDE.md 양쪽 체크 |
| `src/core/organ-classifier.ts` | `ClassifyInput.hasClaudeMd` → `hasIntentMd` + deprecated alias. `ClassifyInput.hasSpecMd` → `hasDetailMd` + deprecated alias |
| `src/core/document-validator.ts` | `validateClaudeMd` → `validateIntentMd` + deprecated alias. `validateSpecMd` → `validateDetailMd` + deprecated alias. 에러 메시지 내 'CLAUDE.md' → 'INTENT.md', 'SPEC.md' → 'DETAIL.md' |
| `src/index.ts` | 공개 API re-export: 신규 이름 + deprecated alias (INTENT + DETAIL 양쪽) |

**Deprecated Alias 패턴**:
```typescript
/** @deprecated Use IntentMdSchema instead. Will be removed in v0.2.0 */
export type ClaudeMdSchema = IntentMdSchema;

/** @deprecated Use DetailMdSchema instead. Will be removed in v0.2.0 */
export type SpecMdSchema = DetailMdSchema;
```

**Acceptance Criteria**:
- [ ] `yarn typecheck` 통과
- [ ] `yarn filid test:run` 통과 (deprecated alias로 기존 테스트 호환)
- [ ] 모든 deprecated alias에 JSDoc `@deprecated` 태그 포함
- [ ] `isDetailMd()`, `validateDetailMd()`, `hasDetailMd` deprecated alias 모두 존재

---

### Step 1.2: Core Logic + Hook Implementation (Business)

**대상 파일 (~20개)**:

| File | Refs | 변경 내용 |
|------|------|-----------|
| `src/core/fractal-tree.ts` | 6 hasClaudeMd, 1 'CLAUDE.md' | `existsSync('CLAUDE.md')` → `existsSync('INTENT.md')` + `existsSync('CLAUDE.md')` fallback. `hasClaudeMd` → `hasIntentMd`. `existsSync('SPEC.md')` → `existsSync('DETAIL.md')` + fallback. `hasSpecMd` → `hasDetailMd` |
| `src/core/rule-engine.ts` | 5 refs | `ORGAN_NO_CLAUDEMD` 규칙: 텍스트 내 'CLAUDE.md' → 'INTENT.md'. 규칙 ID alias. SPEC.md 관련 규칙 텍스트 → DETAIL.md |
| `src/core/drift-detector.ts` | 2 refs | `hasClaudeMd` → `hasIntentMd`. `hasSpecMd` → `hasDetailMd` |
| `src/core/fractal-validator.ts` | 1 ref | `hasClaudeMd` → `hasIntentMd`. `hasSpecMd` → `hasDetailMd` |
| `src/core/project-analyzer.ts` | (간접) | `hasClaudeMd` → `hasIntentMd`. `hasSpecMd` → `hasDetailMd` |
| `src/hooks/context-injector.ts` | 7 refs | 하드코딩 규칙 텍스트 전수 치환. CATEGORY_GUIDE + buildFcaContext 리터럴. CLAUDE.md→INTENT.md, SPEC.md→DETAIL.md 양쪽 |
| `src/hooks/pre-tool-validator.ts` | 6 refs | `isClaudeMd` → `isIntentMd` import 변경 + 에러 메시지. `isSpecMd` → `isDetailMd` import 변경 + 에러 메시지 |
| `src/hooks/structure-guard.ts` | 6 refs | `e.name === 'CLAUDE.md'` → 양방향 탐지 (`'INTENT.md' \|\| 'CLAUDE.md'`). `e.name === 'SPEC.md'` → 양방향 탐지 (`'DETAIL.md' \|\| 'SPEC.md'`). 에러 메시지 |
| `src/hooks/change-tracker.ts` | 4 refs | `fileName === 'CLAUDE.md'` → 양방향 탐지. `fileName === 'SPEC.md'` → 양방향 탐지. `e.name` 비교도 양방향 |
| `src/hooks/agent-enforcer.ts` | 8 refs | PLANNING_GUIDANCE, IMPLEMENTATION_REMINDER 내 하드코딩 문자열. CLAUDE.md→INTENT.md, SPEC.md→DETAIL.md |
| `src/hooks/plan-gate.ts` | 4 refs | PLAN_EXIT_CHECKLIST 내 하드코딩 문자열. CLAUDE.md→INTENT.md, SPEC.md→DETAIL.md |
| `src/mcp/server.ts` | 1 ref | `hasClaudeMd` 참조. `hasSpecMd` 참조 |
| `src/mcp/tools/fractal-navigate.ts` | 2 refs | `hasClaudeMd` 참조. `hasSpecMd` 참조 |
| `src/types/rules.ts` | 1 ref | `ORGAN_NO_CLAUDEMD` ID 상수 → alias 추가 |

**핵심 하드코딩 지점 (structure-guard.ts)**:
- Line 32-33: `e.name === 'CLAUDE.md'` → `(e.name === 'INTENT.md' || e.name === 'CLAUDE.md')`
- Line 43: `ce.name === 'CLAUDE.md'` → `(ce.name === 'INTENT.md' || ce.name === 'CLAUDE.md')`
- Line 127-128: 에러 메시지 `"Cannot create CLAUDE.md"` → `"Cannot create INTENT.md"`
- SPEC.md 관련 동일 패턴: `e.name === 'SPEC.md'` → `(e.name === 'DETAIL.md' || e.name === 'SPEC.md')`

**Acceptance Criteria**:
- [ ] `yarn typecheck` 통과
- [ ] `yarn filid test:run` 통과
- [ ] `context-injector.ts` 내 사용자 대면 문자열에 'CLAUDE.md', 'SPEC.md' 잔존 0건
- [ ] `isFcaProject()`가 CLAUDE.md만 있는 디렉토리도 true 반환
- [ ] `change-tracker.ts`, `structure-guard.ts`에서 SPEC.md→DETAIL.md 양방향 탐지 동작

---

### Step 1.3: Test Files Migration (Verification)

**대상 파일 (~20개, ~200+ refs)**:

세분화 순서:
1. **(a) 타입/인터페이스 참조** (~60건): `hasClaudeMd: true` → `hasIntentMd: true`, `hasSpecMd: true` → `hasDetailMd: true`
2. **(b) 파일명 리터럴** (~80건): `'CLAUDE.md'` → `'INTENT.md'`, `'SPEC.md'` → `'DETAIL.md'`
3. **(c) 에러 메시지 assertion** (~40건): expect 문 업데이트
4. **(d) 테스트 설명 문자열** (~20건): describe/it 블록

**주요 파일** (참조 수 순):
| File | ClaudeMd refs | hasClaudeMd refs | SpecMd refs |
|------|---------------|------------------|-------------|
| `__tests__/integration/fractal-init.test.ts` | 5 | 24 | (확인) |
| `__tests__/unit/core/organ-classifier.test.ts` | 4 | 23 | (확인) |
| `__tests__/unit/hooks/pre-tool-validator.test.ts` | 15 | - | (확인) |
| `__tests__/unit/hooks/structure-guard.test.ts` | 13 | - | (확인) |
| `__tests__/unit/core/fractal-tree.test.ts` | 12 | 3 | (확인) |
| `__tests__/unit/core/document-validator.test.ts` | 2 | - | (확인) |
| `__tests__/unit/mcp/fractal-navigate.test.ts` | - | 8 | (확인) |
| `__tests__/bench/hooks/pre-tool-validator.bench.ts` | 7 | - | (확인) |
| `__tests__/unit/core/rule-engine.test.ts` | 3 | 4 | (확인) |
| `__tests__/unit/core/drift-detector.test.ts` | 2 | 2 | (확인) |

**추가 테스트 (6건)**:
- `isFcaProject()` fallback: CLAUDE.md만 있을 때 true
- `isIntentMd()` fallback: '/CLAUDE.md' 경로도 true
- `isDetailMd()` fallback: '/SPEC.md' 경로도 true
- `validateDetailMd()`: DETAIL.md 검증 정상 동작 + SPEC.md 경로 fallback
- `classifyNode()`: deprecated `hasClaudeMd` 전달 시 동일 동작
- `classifyNode()`: deprecated `hasSpecMd` 전달 시 `hasDetailMd`와 동일 동작

**Acceptance Criteria**:
- [ ] `yarn filid test:run` 전체 통과
- [ ] deprecated alias 사용 테스트 0건 (전부 신규 이름)
- [ ] fallback 검증 테스트 6건 추가 (INTENT 3건 + DETAIL 3건)

---

### Step 1.4: Documentation + Agent/Skill Markdown

**대상**: ~45 markdown 파일, ~350+ 참조

**작업 그룹**:

**(a) CLAUDE.md 파일 리네이밍 (git mv, 8개)**:
- `packages/filid/CLAUDE.md` → `INTENT.md`
- `packages/filid/src/CLAUDE.md` → `INTENT.md`
- `packages/filid/src/core/CLAUDE.md` → `INTENT.md`
- `packages/filid/src/ast/CLAUDE.md` → `INTENT.md`
- `packages/filid/src/mcp/CLAUDE.md` → `INTENT.md`
- `packages/filid/src/mcp/tools/CLAUDE.md` → `INTENT.md`
- `packages/filid/src/compress/CLAUDE.md` → `INTENT.md`
- `packages/filid/src/metrics/CLAUDE.md` → `INTENT.md`

**(a-2) SPEC.md 파일 리네이밍 (git mv)**:
- `packages/filid/` 내 SPEC.md 파일들 → `DETAIL.md` (해당 파일 목록은 executor가 `find` 로 확인)

**(b) 에이전트 마크다운 (6개)**:
- `agents/context-manager.md` (28 refs) — 최다 참조
- `agents/qa-reviewer.md` (15 refs)
- `agents/implementer.md` (15 refs)
- `agents/fractal-architect.md` (5 refs)
- `agents/code-surgeon.md` (1 ref)
- `agents/drift-analyzer.md` (확인 필요)

**(c) 스킬 마크다운 (~15개)**:
- `fca-init/`, `fca-scan/`, `fca-update/`, `fca-context-query/` 등 SKILL.md + reference.md
- CLAUDE.md → INTENT.md, SPEC.md → DETAIL.md 양쪽 치환

**(d) 템플릿 (~6개)**:
- `templates/rules/*.md`, `templates/hooks/README.md`, `templates/deliverables.json`

**(e) README (2개)**:
- `README.md`, `README-ko_kr.md`

**주의**: "Claude Code" 제품명 참조는 보존. FCA 문서명으로서의 "CLAUDE.md"만 "INTENT.md"로, "SPEC.md"만 "DETAIL.md"로 치환.

**Acceptance Criteria**:
- [ ] 에이전트/스킬/템플릿에서 FCA 문서로서의 `CLAUDE.md`, `SPEC.md` 잔존 0건 (grep 검증)
- [ ] "Claude Code" 제품명 참조 보존
- [ ] CLAUDE.md → INTENT.md, SPEC.md → DETAIL.md git mv 완료

---

### Step 1.5: Build Verification + Cleanup

**작업 항목**:
1. `yarn build` 전체 빌드 (tsc + esbuild)
2. `bridge/` 산출물에서 FCA 문서명 CLAUDE.md/SPEC.md 잔존 0건 확인 (fallback 제외)
3. `dist/` 타입 정의(.d.ts)에 deprecated alias 존재 확인 (INTENT + DETAIL 양쪽)
4. `yarn filid test:run` 최종 통과
5. `yarn typecheck` 최종 통과
6. 전체 codebase grep: `packages/filid/` 내 잔존 확인
   - 허용 예외: deprecated JSDoc, fallback 로직
7. changeset 항목 추가

**Acceptance Criteria**:
- [ ] `yarn build` exit 0
- [ ] `yarn filid test:run` 전체 통과
- [ ] grep 검증: 허용 예외 외 잔존 0건 (CLAUDE.md + SPEC.md 양쪽)
- [ ] bridge/ 산출물이 INTENT.md + DETAIL.md 참조 포함

---

## Phase 2: Boundary Detection + Context Chain

### 선행 조건
- Phase 1 완료 (INTENT.md/DETAIL.md 이름 확정)

### Boundary 정의
**채택: 가장 먼저 만나는 `package.json`에서 멈춤** (위로 탐색)

> Note: phase-2-boundary.md에서 `.git`, `tsconfig.json`도 언급되었으나, 최종 결정은 **`package.json` 단독**. 모노레포에서 각 패키지는 독립된 프랙탈 트리로 취급하며, `package.json`이 가장 신뢰할 수 있는 패키지 boundary marker.

### Step 2.1: BoundaryDetector 구현

**신규 파일**: `src/core/boundary-detector.ts`

**핵심 함수**:
```typescript
/** 가장 먼저 만나는 package.json 위치를 반환 (위로 탐색) */
findBoundary(filePath: string): string | null

/** filePath에서 boundary까지의 INTENT.md 경로 목록 반환 */
buildChain(filePath: string): ChainResult
```

**ChainResult 타입**:
```typescript
interface ChainResult {
  boundary: string;           // package.json이 있는 디렉토리
  chain: string[];            // 조상 디렉토리 목록 (leaf → root)
  intents: Map<string, boolean>;  // 각 디렉토리의 INTENT.md 존재 여부
  details: Map<string, boolean>;  // 각 디렉토리의 DETAIL.md(SPEC.md) 존재 여부
}
```

**기존 코드 활용**:
- `src/core/fractal-tree.ts`의 `scanProject()` — 전체 스캔 로직 참조
- `src/hooks/shared.ts`의 `isFcaProject()` — 루트 판별 패턴

**대상 파일**:
| File | Action |
|------|--------|
| `src/core/boundary-detector.ts` | 신규 생성 |
| `src/types/fractal.ts` | `ChainResult` 타입 추가 |
| `src/index.ts` | `findBoundary`, `buildChain` re-export |

**Acceptance Criteria**:
- [ ] `findBoundary()`: 모노레포 내 서브 패키지에서 가장 가까운 `package.json` 반환
- [ ] `buildChain()`: depth 1~5 체인 정상 구성
- [ ] boundary 경계에서 탐색 중단 확인
- [ ] `yarn typecheck` + `yarn filid test:run` 통과

---

### Step 2.2: BoundaryDetector 단위 테스트

**신규 파일**: `src/__tests__/unit/core/boundary-detector.test.ts`

**테스트 케이스**:
1. 단일 프로젝트: root/src/module/ → boundary = root/
2. 모노레포: monorepo/packages/pkg/src/ → boundary = packages/pkg/
3. 프로젝트 루트에서 호출: boundary = 현재 디렉토리
4. INTENT.md 있는 디렉토리/없는 디렉토리 혼재 체인
5. boundary 없는 경로 (package.json 미존재) → null 반환

**Acceptance Criteria**:
- [ ] 5개 테스트 케이스 전체 통과
- [ ] edge case: symlink, 빈 디렉토리 처리

---

## Phase 3: PreToolUse Unified Hook + Context Injection

### 선행 조건
- Phase 1 완료 (INTENT.md/DETAIL.md 이름)
- Phase 2 완료 (buildChain 함수)

### Step 3.1: Intent Injector 로직 구현

**신규 파일**: `src/hooks/intent-injector.ts`

**핵심 함수**:
```typescript
/** PreToolUse 입력에서 대상 파일의 INTENT.md 맥락을 구성 */
injectIntent(input: PreToolUseInput): Promise<HookOutput>
```

**주입 포맷**:
```
[filid] Context for {relativePath}

## Current Module ({dirPath})
{INTENT.md 전문 내용 — 최대 50줄}

## Ancestor Chain
- ./INTENT.md (project root)
- src/INTENT.md
- src/payment/INTENT.md

## Detail Available
- src/payment/checkout/DETAIL.md
```

**의존**:
- `buildChain()` (Phase 2)
- `isIntentInjected()` / `markIntentInjected()` (Phase 4, 이 Step에서 stub 사용)
- `isFcaProject()` (Phase 1)

**대상 파일**:
| File | Action |
|------|--------|
| `src/hooks/intent-injector.ts` | 신규 생성 |
| `src/hooks/shared.ts` | `isIntentMd()` 이미 존재 (Phase 1) |

**Acceptance Criteria**:
- [ ] FCA 프로젝트가 아닌 경우 `{ continue: true }` 즉시 반환
- [ ] 대상 파일 디렉토리에 INTENT.md 없으면 주입 스킵
- [ ] 주입 포맷이 설계 명세와 일치
- [ ] 중복 주입 방지 (같은 세션 + 같은 디렉토리)

---

### Step 3.2: Unified Orchestrator + Entry Point

**신규 파일**:
- `src/hooks/pre-tool-use.ts` — 통합 오케스트레이터
- `src/hooks/entries/pre-tool-use.entry.ts` — 통합 진입점

**통합 오케스트레이터 로직**:
```typescript
export async function handlePreToolUse(input: PreToolUseInput): Promise<HookOutput> {
  const results: HookOutput[] = [];

  // 1. INTENT.md 맥락 주입 (Read|Write|Edit 전체)
  results.push(await injectIntent(input));

  // 2. Write|Edit 전용 검증
  if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
    // validatePreToolUse는 DETAIL.md(SPEC.md) 내용을 읽어야 하므로
    // oldDetailContent를 미리 파일에서 읽어 input에 추가
    const oldDetailContent = await readFileIfExists(
      resolveDetailPath(input.tool_input.file_path)
    );
    results.push(validatePreToolUse(input, { oldDetailContent }));
    results.push(guardStructure(input));
  }

  return mergeResults(results);
}
```

**주의: `oldDetailContent` (기존 `oldSpecContent`) I/O 책임**
- 오케스트레이터가 `validatePreToolUse` 호출 전에 대상 파일의 기존 DETAIL.md(SPEC.md) 내용을 직접 읽어야 함
- `pre-tool-validator.ts`는 내용을 전달받아 검증만 수행 (파일 I/O 없음)
- 이는 단일 책임 분리 원칙에 부합하며, 테스트에서 mock이 용이함

**mergeResults 규칙**:
- `continue`: 하나라도 false면 전체 false
- `additionalContext`: 모든 non-empty 컨텍스트를 `\n\n` 구분자로 결합
- `hookSpecificOutput`: 첫 번째 차단(continue=false)의 출력 우선

**변경 파일**:
| File | Action |
|------|--------|
| `src/hooks/pre-tool-use.ts` | 신규 생성 |
| `src/hooks/entries/pre-tool-use.entry.ts` | 신규 생성 |
| `src/hooks/entries/pre-tool-validator.entry.ts` | 삭제 |
| `src/hooks/entries/structure-guard.entry.ts` | 삭제 |
| `hooks/hooks.json` | PreToolUse matcher 통합: `Write\|Edit` 2 hooks → `Read\|Write\|Edit` 1 hook |
| `scripts/build-hooks.mjs` | hookEntries 배열: `pre-tool-validator`, `structure-guard` 제거, `pre-tool-use` 추가 |

**hooks.json 변경 후**:
```json
{
  "PreToolUse": [
    {
      "matcher": "Read|Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "... bridge/pre-tool-use.mjs",
        "timeout": 3
      }]
    },
    {
      "matcher": "ExitPlanMode",
      "hooks": [{
        "type": "command",
        "command": "... bridge/plan-gate.mjs",
        "timeout": 3
      }]
    }
  ]
}
```

**Acceptance Criteria**:
- [ ] Write|Edit 시: validator + guard + injector 모두 실행
- [ ] Read 시: injector만 실행 (validator/guard 스킵)
- [ ] continue=false 시 차단 메시지 정상 전달
- [ ] `yarn build` 후 `bridge/pre-tool-use.mjs` 생성
- [ ] `bridge/pre-tool-validator.mjs`, `bridge/structure-guard.mjs` 제거 확인
- [ ] `yarn filid test:run` 통과

---

### Step 3.3: 통합 Hook 테스트

**신규/변경 파일**:
- `src/__tests__/unit/hooks/pre-tool-use.test.ts` — 통합 오케스트레이터 테스트
- `src/__tests__/unit/hooks/intent-injector.test.ts` — 주입 로직 테스트

**테스트 케이스 (pre-tool-use)**:
1. Read 이벤트 → injector만 호출, validator/guard 미호출
2. Write INTENT.md in organ → 차단 (guard), 주입 (injector) 모두 실행, 최종 continue=false
3. Write 일반 파일 → injector + validator + guard 모두 실행, continue=true
4. Edit INTENT.md 20줄 초과 → validator 경고 + injector 주입, continue=true
5. mergeResults: additionalContext 합산 검증
6. Write|Edit 시 oldDetailContent 파일 읽기 → validatePreToolUse에 정상 전달

**테스트 케이스 (intent-injector)**:
1. FCA 프로젝트 아닌 경우 → 스킵
2. INTENT.md 있는 디렉토리 → 전문 주입
3. 조상 INTENT.md → 경로 링크만
4. 중복 주입 방지 → 두 번째 호출 시 스킵
5. DETAIL.md(SPEC.md) 존재 시 경로 힌트 포함

**Acceptance Criteria**:
- [ ] 11개 테스트 케이스 전체 통과
- [ ] 기존 `pre-tool-validator.test.ts`, `structure-guard.test.ts` 테스트가 여전히 개별 로직 파일 대상으로 통과

---

## Phase 4: Boundary Caching

### 선행 조건
- Phase 3 완료 (intent-injector가 캐시 소비자)

### Step 4.1: cache-manager.ts 확장

**변경 파일**: `src/core/cache-manager.ts`

**추가 함수 (4개)**:
```typescript
/** boundary 위치 캐시 읽기 */
readBoundary(cwd: string, sessionId: string, dir: string): string | null

/** boundary 위치 캐시 쓰기 */
writeBoundary(cwd: string, sessionId: string, dir: string, boundaryPath: string): void

/** 디렉토리별 intent 주입 여부 확인 */
isIntentInjected(cwd: string, sessionId: string, dir: string): boolean

/** 디렉토리별 intent 주입 마커 생성 */
markIntentInjected(cwd: string, sessionId: string, dir: string): void
```

**캐시 파일 레이아웃**:
```
~/.claude/plugins/filid/{cwdHash}/
├── session-context-{hash}                ← 기존
├── prompt-context-{hash}                 ← 기존
├── run-{skillName}.hash                  ← 기존
├── boundary-{sessionIdHash}              ← 신규: JSON
└── injected-{sessionIdHash}-{dirHash}    ← 신규: 빈 마커
```

**무효화 정책**:
- git HEAD 변경 → boundary 파일 전체 삭제 (lazy 재빌드)
- 세션 종료 → `removeSessionFiles()` 확장으로 자동 정리

**Acceptance Criteria**:
- [ ] `readBoundary()`: 캐시 히트 시 즉시 반환, 미스 시 null
- [ ] `writeBoundary()`: JSON 형식으로 boundary 위치 저장
- [ ] `isIntentInjected()` + `markIntentInjected()`: 마커 기반 중복 방지
- [ ] `removeSessionFiles()`: boundary + injected 마커 포함 정리
- [ ] `yarn typecheck` + `yarn filid test:run` 통과

---

### Step 4.2: Intent Injector → Cache 통합

**변경 파일**: `src/hooks/intent-injector.ts`

Step 3.1에서 stub으로 구현한 중복 방지 로직을 실제 cache-manager 함수로 교체:
- `isIntentInjected()` → 캐시 마커 조회
- `markIntentInjected()` → 캐시 마커 생성
- `findBoundary()` → `readBoundary()` 캐시 히트 시 fs 탐색 스킵

**session-cleanup.ts 확장**:
- `removeSessionFiles()` 호출 시 boundary + injected 마커도 정리

**Acceptance Criteria**:
- [ ] 캐시 히트 시 `findBoundary()` 호출 0회 (성능 검증)
- [ ] 캐시 미스 시 정상 탐지 + 캐시 저장
- [ ] 세션 종료 시 마커 파일 정리 확인
- [ ] `yarn filid test:run` 통과

---

### Step 4.3: Cache 단위 테스트

**신규 파일**: `src/__tests__/unit/core/cache-manager-boundary.test.ts`

**테스트 케이스**:
1. `writeBoundary()` → `readBoundary()` 왕복
2. `markIntentInjected()` → `isIntentInjected()` true
3. `removeSessionFiles()` 후 → 모든 마커 삭제 확인
4. 다른 세션 ID → 마커 격리
5. 캐시 디렉토리 미존재 시 자동 생성

**Acceptance Criteria**:
- [ ] 5개 테스트 케이스 전체 통과

---

## Phase 간 빌드 검증 (공통)

각 Phase 완료 후 반드시 실행:
```bash
yarn typecheck        # 타입 체크
yarn filid test:run   # 단위/통합 테스트
yarn build            # 전체 빌드 (tsc + esbuild)
```

Phase 1 완료 후 추가:
```bash
# FCA 문서로서의 CLAUDE.md/SPEC.md 잔존 grep
grep -rn "CLAUDE\.md" packages/filid/src/ --include="*.ts" | \
  grep -v "@deprecated" | grep -v "fallback" | grep -v "CLAUDE\.md.*||.*INTENT\.md"
grep -rn "SPEC\.md" packages/filid/src/ --include="*.ts" | \
  grep -v "@deprecated" | grep -v "fallback" | grep -v "SPEC\.md.*||.*DETAIL\.md"
```

Phase 3 완료 후 추가:
```bash
# bridge/ 산출물 확인
ls packages/filid/bridge/pre-tool-use.mjs          # 존재
ls packages/filid/bridge/pre-tool-validator.mjs     # 미존재
ls packages/filid/bridge/structure-guard.mjs        # 미존재
```

---

## Rollback Strategy

| Phase | 롤백 방법 | 영향 |
|-------|-----------|------|
| Phase 1 | `git revert` (5 Step 커밋) | deprecated alias로 부분 적용에서도 안전 |
| Phase 2 | `git revert` (2 Step 커밋) | 신규 파일만 추가, 기존 코드 미변경 |
| Phase 3 | `git revert` (3 Step 커밋) + hooks.json 복원 + `yarn build` | entry 파일 복원 필요. bridge/는 git-tracked가 아니므로 revert 후 반드시 `yarn build`로 bridge/ 산출물 재생성 |
| Phase 4 | `git revert` (3 Step 커밋) | cache 함수 제거, intent-injector stub 복원 |

---

## Success Criteria (Overall)

1. filid 내 FCA 문서명이 CLAUDE.md → INTENT.md, SPEC.md → DETAIL.md로 전환 완료
2. 기존 사용자의 CLAUDE.md/SPEC.md만 있는 프로젝트가 여전히 FCA로 인식됨 (fallback)
3. Write|Edit 시 hook 실행이 ~200ms → ~100ms로 개선
4. Read 시 해당 프랙탈 체인의 INTENT.md 맥락이 자동 주입됨
5. Boundary 캐싱으로 반복적인 디렉토리 순회 회피
6. 전체 빌드 + 테스트 + 타입체크 통과
7. 각 Phase가 독립 커밋 그룹으로 롤백 가능

---

## Estimated Complexity

- **VERY HIGH** (100+ 기존 파일 변경, ~10 신규 파일, 770+ 참조, 4 Phases, 13 Steps)
- Estimated effort: 10-14 hours executor time (Phase 1: 4h, Phase 2: 1.5h, Phase 3: 2.5h, Phase 4: 1.5h)
- Risk: MEDIUM (deprecated alias + 순차 Phase로 중간 상태 안전성 확보)

