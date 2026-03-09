# Phase 1: CLAUDE.md → INTENT.md + SPEC.md → DETAIL.md 리네이밍

> 상태: 계획 완료, 구현 대기 (Phase 5 통합)

## 목표

코드베이스 전체에서 FCA 문서명을 리네이밍하여 Claude Code 종속성을 제거한다.
- `CLAUDE.md` → `INTENT.md`
- `SPEC.md` → `DETAIL.md`

## 선행 조건

없음 (첫 번째 Phase)

## 범위

- CLAUDE.md 계열: ~80 파일, ~500 참조
- SPEC.md 계열: ~60 파일, ~260 참조
- 로직 변경 없음 — 순수 기계적 치환
- 스키마 구조 변경 없음 (필드명 유지, 타입명만 변경)

## 역할 정의

| 문서 | 역할 | 스키마 |
|------|------|--------|
| **INTENT.md** | 모듈의 목적, 경계, 규칙 (50줄 이하) | `IntentMdSchema` (= 기존 ClaudeMdSchema) |
| **DETAIL.md** | INTENT.md에 담기 어려운 상세 내용 (requirements, apiContracts, 구현 세부사항) | `DetailMdSchema` (= 기존 SpecMdSchema, 필드 동일) |

## ADR

**결정**: 두 문서 동시 리네이밍. 스키마 재설계 없음.

**근거**:
1. **의미 정합성**: `ClaudeMdSchema`의 필드(`purpose`, `boundaries`, `commands`)는 "의도 선언" 성격 → `INTENT.md`와 부합
2. **DETAIL.md 역할 확정**: INTENT.md의 50줄 제한에 담기 어려운 상세 내용을 보완 → `requirements`, `apiContracts` 필드가 이 역할에 부합
3. **스키마 재설계 불필요**: 필드명이 DETAIL.md의 "상세 문서" 역할과 자연스럽게 맞음

**대안 분석**:

| Option | 설명 | 판정 |
|--------|------|------|
| A. 둘 다 리네이밍 (스키마 유지) | CLAUDE→INTENT + SPEC→DETAIL, 필드 동일 | **채택** |
| B. CLAUDE만 리네이밍 | SPEC.md 유지, Phase 5에서 별도 처리 | **기각** — 동일 패턴이므로 합치는 게 효율적 |
| C. 리네이밍 없이 alias만 | 코드 변경 최소화 | **기각** — 정체성 확립 불가 |

## 구현 5단계

### Step 1: Core Types + Shared Utilities (Foundation)

**대상**: ~10 파일
- `src/types/documents.ts`:
  - `ClaudeMdSchema` → `IntentMdSchema` (deprecated alias 유지)
  - `SpecMdSchema` → `DetailMdSchema` (deprecated alias 유지)
- `src/types/fractal.ts` — `FractalNode.hasClaudeMd` → `hasIntentMd`
- `src/types/index.ts` — re-export 업데이트
- `src/hooks/shared.ts`:
  - `isClaudeMd()` → `isIntentMd()` + fallback
  - `isSpecMd()` → `isDetailMd()` + fallback
  - `isFcaProject()`: `INTENT.md || CLAUDE.md` 양쪽 체크
- `src/core/organ-classifier.ts` — `ClassifyInput.hasClaudeMd` → `hasIntentMd`
- `src/core/document-validator.ts` — `validateClaudeMd` → `validateIntentMd`, `validateSpecMd` → `validateDetailMd`
- `src/index.ts` — 공개 API re-export

**Deprecated Alias 정책**: `@deprecated Use XXX instead. Will be removed in v0.2.0`

### Step 2: Core Logic + Hook Implementation (Business)

**대상**: ~20 파일
- `src/core/fractal-tree.ts` — `existsSync('CLAUDE.md')` → `existsSync('INTENT.md')` + fallback
- `src/core/rule-engine.ts` — `ORGAN_NO_CLAUDEMD` → `ORGAN_NO_INTENTMD` (규칙 ID alias)
- `src/core/drift-detector.ts`, `fractal-validator.ts`, `project-analyzer.ts`
- `src/hooks/context-injector.ts` — 하드코딩 규칙 텍스트 전수 치환 (CLAUDE.md→INTENT.md, SPEC.md→DETAIL.md)
- `src/hooks/structure-guard.ts` — `e.name === 'CLAUDE.md'` → 양방향 탐지
- `src/hooks/change-tracker.ts` — `fileName === 'CLAUDE.md'` → 양방향 탐지
- `src/hooks/pre-tool-validator.ts` — `isSpecMd()` → `isDetailMd()` + fallback
- `src/hooks/agent-enforcer.ts`, `plan-gate.ts`

### Step 3: Test Files Migration (Verification)

**대상**: ~20 테스트 파일, ~200 참조
**세분화**: (a) 타입 참조 → (b) 파일명 리터럴 → (c) 에러 메시지 → (d) 테스트 설명
**Fallback 테스트 추가**: CLAUDE.md/SPEC.md 레거시 감지 테스트

### Step 4: Documentation + Agent/Skill Markdown

**대상**: ~30 파일, ~150 참조
- 에이전트 7개, 스킬 15개, 템플릿
- filid 자체 CLAUDE.md 8개 → INTENT.md (`git mv`)
- filid 자체 SPEC.md → DETAIL.md (`git mv`)
- 에이전트/스킬 마크다운 내 CLAUDE.md/SPEC.md 참조 치환

### Step 5: Build Verification + Cleanup

- `yarn typecheck` + `yarn test:run` 통과
- `bridge/`, `dist/` 빌드 출력물에서 잔존 참조 grep 검증
- deprecated alias 목록 정리 (v0.2.0 제거 예정)

## Rollback 전략

- 각 Step 독립 커밋 → `git revert` 가능
- deprecated alias로 부분 적용에서도 컴파일 에러 없음

## 산출물

- 코드/문서 전체에서 FCA 문서 = `INTENT.md` + `DETAIL.md`
- 기존 사용자 fallback: CLAUDE.md/SPEC.md도 인식 (deprecation 경고)
- deprecated alias: v0.2.0에서 제거
