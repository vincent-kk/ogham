# Phase 1: CLAUDE.md → INTENT.md 리네이밍

> 상태: 계획 완료, 구현 대기

## 목표

코드베이스 전체에서 FCA 문서명 `CLAUDE.md`를 `INTENT.md`로 리네이밍하여 Claude Code 종속성을 제거한다.
`SPEC.md`는 이 Phase에서 변경하지 않는다.

## 선행 조건

없음 (첫 번째 Phase)

## 범위

- ~80 파일, ~500 참조 (CLAUDE.md 계열만)
- 로직 변경 없음 — 순수 기계적 치환

## ADR

**결정**: `CLAUDE.md` → `INTENT.md`로 리네이밍. `SPEC.md`는 현재 이름 유지.

**근거**:
1. **의미 정합성**: `ClaudeMdSchema`의 필드(`purpose`, `boundaries`, `commands`)는 "의도 선언" 성격 → `INTENT.md`와 부합
2. **자기참조 회피**: PLAN.md가 이미 `INTENT.md`/`DETAIL.md`를 미래 비전으로 언급
3. **리스크 최소화**: ~500참조도 충분히 대규모. SPEC.md까지 동시 변경하면 컴파일 실패 연쇄 위험

**대안 분석**:

| Option | 설명 | 판정 |
|--------|------|------|
| A. 둘 다 리네이밍 | CLAUDE→INTENT + SPEC→DETAIL | **기각** — 의미 충돌 + 스키마 재설계 필요 |
| B. CLAUDE만 리네이밍 | SPEC.md 유지 | **채택** |
| C. 리네이밍 없이 alias만 | 코드 변경 최소화 | **기각** — 정체성 확립 불가 |

## 구현 5단계

### Step 1: Core Types + Shared Utilities (Foundation)

**대상**: 7 파일
- `src/types/documents.ts` — `ClaudeMdSchema` → `IntentMdSchema` (deprecated alias 유지)
- `src/types/fractal.ts` — `FractalNode.hasClaudeMd` → `hasIntentMd`
- `src/types/index.ts` — re-export 업데이트
- `src/hooks/shared.ts` — `isClaudeMd()` → `isIntentMd()` + fallback. `isFcaProject()`: `INTENT.md || CLAUDE.md` 양쪽 체크
- `src/core/organ-classifier.ts` — `ClassifyInput.hasClaudeMd` → `hasIntentMd`
- `src/core/document-validator.ts` — `validateClaudeMd` → `validateIntentMd`
- `src/index.ts` — 공개 API re-export

**Deprecated Alias 정책**: `@deprecated Use XXX instead. Will be removed in v0.2.0`

### Step 2: Core Logic + Hook Implementation (Business)

**대상**: ~15 파일
- `src/core/fractal-tree.ts` — `existsSync('CLAUDE.md')` → `existsSync('INTENT.md')` + fallback
- `src/core/rule-engine.ts` — `ORGAN_NO_CLAUDEMD` → `ORGAN_NO_INTENTMD` (규칙 ID alias)
- `src/core/drift-detector.ts`, `fractal-validator.ts`, `project-analyzer.ts`
- `src/hooks/context-injector.ts` — 하드코딩 규칙 텍스트 전수 치환
- `src/hooks/structure-guard.ts` — `e.name === 'CLAUDE.md'` → 양방향 탐지
- `src/hooks/change-tracker.ts` — `fileName === 'CLAUDE.md'` → 양방향 탐지
- `src/hooks/pre-tool-validator.ts`, `agent-enforcer.ts`, `plan-gate.ts`

### Step 3: Test Files Migration (Verification)

**대상**: ~15 테스트 파일, ~150 참조
**세분화**: (a) 타입 참조 → (b) 파일명 리터럴 → (c) 에러 메시지 → (d) 테스트 설명
**Fallback 테스트 3건 추가**

### Step 4: Documentation + Agent/Skill Markdown

**대상**: ~25 파일, ~120 참조
에이전트 5개, 스킬 15개, 템플릿, filid 자체 CLAUDE.md 8개 → INTENT.md git mv

### Step 5: Build Verification + Cleanup

빌드 통과, bridge/dist grep 검증, 잔존 확인

## Rollback 전략

- 각 Step 독립 커밋 → `git revert` 가능
- deprecated alias로 부분 적용에서도 컴파일 에러 없음

## 산출물

- 코드/문서 전체에서 FCA 문서 = `INTENT.md`
- 기존 사용자 fallback: CLAUDE.md도 인식 (deprecation 경고)
- deprecated alias: v0.2.0에서 제거
