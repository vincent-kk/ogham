

# Filid 플러그인 설계 핸드오프

> 이 문서는 설계 검증 세션의 결론을 다음 세션에서 이어받기 위한 핸드오프 문서입니다.

---

## 컨셉 요약

프로젝트 디렉토리 계층을 **프랙탈 단위**로 구분하고, 각 프랙탈의 개발 의도와 맥락을 `INTENT.md` / `DETAIL.md`로 관리.  
Claude Code가 파일에 접근할 때 **PreToolUse Hook**으로 해당 프랙탈 체인의 맥락을 자동 주입.

**플러그인명: Filid**  
**배포 형태**: Claude Code Hook (`.claude/hooks.json` 내장), 사용자 프로젝트에 Hook 파일 비노출

### 배경 (CLAUDE.md의 한계 해결)
- CLAUDE.md는 조상 방향으로만 계층적 누적 로딩
- 형제(sibling) 경로의 CLAUDE.md는 자동 로드되지 않음
- 플러그인 배포 시 사용자 프로젝트의 CLAUDE.md를 직접 수정 불가
- → Hook 기반으로 이를 재현하되, 형제 존재를 힌트 형태로 커버

---

## 파일 구조

```
project-root/
├── INTENT.md                ← 루트 프랙탈
├── DETAIL.md
├── src/
│   ├── INTENT.md
│   ├── payment/
│   │   ├── INTENT.md
│   │   ├── DETAIL.md
│   │   └── checkout/
│   │       ├── INTENT.md
│   │       └── handler.ts
│   └── billing/
│       ├── INTENT.md
│       └── invoice.ts
```

- 프로젝트에 노출되는 파일: `INTENT.md`, `DETAIL.md`만
- 캐시/런타임 파일: `~/.claude/plugin/filid/{project-hash}/cache.json` (프로젝트 비노출)

---

## 확정된 주입 원칙

검증 과정에서 단순화됨. **파일 접근 유형 구분 없이 단일 규칙 적용.**

| 대상 | 주입 방식 |
|------|-----------|
| 현재 디렉토리의 INTENT.md | **전문 주입** |
| 직계 조상의 INTENT.md | **경로 링크만** (Claude가 필요 시 직접 Read) |
| 형제 프랙탈의 INTENT.md | 주입 안 함 (필요 시 Claude가 직접 Read) |
| DETAIL.md | 경로 힌트만 |

### 단순화 이유 (폐기된 아이디어)

초기에 "엔트리 노드(첫 접근 파일)는 조상 전문 주입, 나머지는 링크만"이라는 차등 전략을 검토했으나 폐기.

**폐기 이유**:
1. Claude의 실제 작업 흐름에서 "첫 번째 읽힌 파일 = 작업 대상 파일"이 성립하지 않음
   - `CLAUDE.md`, `tsconfig.json` 등 메타 파일을 먼저 읽은 후 작업 파일에 접근
2. 주변 파일 접근 시 조상 전문을 주입하는 것이 컨텍스트 오염을 유발
3. 단일 규칙이 더 예측 가능하고 구현이 단순함

---

## 캐싱 전략

### 1차: 인메모리 경로 맵 (⚠️ 설계 수정 필요)

**원래 계획**: 세션 내 인메모리 캐시로 반복 fs 탐색 스킵

**검증 결과 - 전제 오류**:  
Hook은 매 실행마다 새 프로세스로 fork됨 → 프로세스 간 메모리 공유 불가.  
"세션 내 인메모리 캐시"는 **Daemon(상주 프로세스) + IPC 없이는 구현 불가**.

→ Daemon 채택 여부를 선행 결정해야 이 레이어가 의미를 가짐.

### 2차: 디스크 캐시 ✅ 유효

```
~/.claude/plugin/filid/{project-hash}/cache.json
```

```json
{
  "version": 1,
  "project_root": "/path/to/project",
  "built_at": "2026-03-09T09:00:00+09:00",
  "git_head": "abc1234",
  "tree": {
    "src/payment/checkout/": {
      "chain": ["./", "src/", "src/payment/", "src/payment/checkout/"],
      "mtimes": {
        "./INTENT.md": 1741478400,
        "src/INTENT.md": 1741478400,
        "src/payment/INTENT.md": 1741478400,
        "src/payment/checkout/INTENT.md": 1741478400
      }
    }
  }
}
```

- mtime 비교로 무효화 — **변경된 파일만 재읽기** (chain 전체 무효화 아님)
- git_head로 branch 전환 감지 → HEAD 변경 시 전체 무효화  
  (단, 전체 무효화가 과도하다면 `git diff --name-only`로 INTENT.md 변경 파일만 선택적 무효화 가능 — 구현 복잡도 트레이드오프)

### 3차: `filid build` 전체 프리빌드

- 프로젝트 전체 INTENT.md를 사전 스캔하여 캐시 일괄 구성
- CI/CD 또는 git hook (post-checkout, post-merge)에서 자동 실행 가능
- ⚠️ **배포 방식 미확정**: Hook 전용 배포라면 `filid` CLI를 별도로 설치해야 실행 가능 → CLI 배포 전략 결정 필요

---

## Boundary 감지

- `.git`, `package.json`, `tsconfig.json` 존재 디렉토리를 프로젝트 루트로 인식
- boundary를 넘어서는 조상 탐색 중단

### ⚠️ 모노레포 서브 boundary 미확정

```
monorepo/
├── package.json          ← 루트 boundary
└── packages/
    └── payment/
        ├── package.json  ← 서브 boundary
        └── src/
            └── handler.ts
```

`handler.ts` 접근 시 `packages/payment/package.json`을 서브 루트로 인식하면 루트 `INTENT.md`가 영영 주입되지 않음.  
**정책 결정 필요**: 서브 boundary에서 멈출 것인지, 루트까지 올라갈 것인지.

---

## 고속화 과제 현황

### Hook 실행 오버헤드

| 구현 방식 | Cold Start | 구현 복잡도 | 비고 |
|---|---|---|---|
| Node.js cold start | ~100ms | 낮음 | 프로토타입 단계 |
| Shell + jq | ~10ms | 중간 | 디스크 캐시 히트 시 충분 |
| **Daemon + IPC** | ~1ms | 높음 | 1차 인메모리 캐시 필수 시 |
| Rust/Go 바이너리 | ~5ms | 높음 | 배포 복잡도 증가 |

Daemon 미채택 시 폴백 전략 정의 필요 (Daemon 자동 기동 여부 등).

### 컨텍스트 윈도우 효율

- 깊은 체인(5+ depth)에서 링크 힌트만 주입하는 현재 전략으로 오염 최소화됨
- 동일 체인 재주입 시 중복 감지: Hook stdout은 tool result 블록으로 주입되므로 Claude 레벨의 중복 감지는 신뢰 불가 → 구현 레벨에서 대응 필요

### inotify/FSEvents 실시간 감지

Daemon 채택 시 자연스럽게 통합 가능. Daemon 없이는 구현 불가.  
→ **고속화 1·2번 과제가 Daemon 채택 여부에 종속**됨.

---

## 미결 결정 사항 (다음 세션에서 처리)

| # | 결정 필요 사항 | 선택지 |
|---|---|---|
| 1 | **Daemon 채택 여부** | 채택(IPC 기반 1차 캐시) vs 미채택(디스크 캐시만) |
| 2 | **모노레포 서브 boundary** | 서브에서 중단 vs 루트까지 올라감 |
| 3 | **`filid build` CLI 배포** | Hook 내 자동 실행 vs 별도 CLI 패키지 |
| 4 | **git HEAD 무효화 세분화** | 전체 무효화 vs 변경 파일만 선택적 무효화 |

---

## 구현 과정 — Phase 1: CLAUDE.md → INTENT.md 리네이밍

> RALPLAN 합의 기반. Planner→Architect(APPROVE)→Critic(APPROVE) 2라운드.

### ADR (Architecture Decision Record)

**결정**: `CLAUDE.md` → `INTENT.md`로 리네이밍. `SPEC.md`는 현재 이름 유지.

**근거**:
1. **의미 정합성**: `ClaudeMdSchema`의 필드(`purpose`, `boundaries`, `commands`)는 "의도 선언" 성격 → `INTENT.md`와 부합. 반면 `SpecMdSchema`의 필드(`requirements`, `apiContracts`)는 "기술 사양" → `SPEC`이 정확함
2. **자기참조 회피**: 본 문서(SPEC.md)가 이미 `INTENT.md`/`DETAIL.md`를 미래 비전으로 언급. `DETAIL.md`로 리네이밍하면 자기참조 루프 발생
3. **리스크 최소화**: ~80파일 ~500참조(CLAUDE.md 계열만)도 충분히 대규모. SPEC.md까지 동시 변경하면 중간 불일치로 컴파일 실패 연쇄 위험 급증

**대안 분석**:

| Option | 설명 | 판정 |
|--------|------|------|
| A. 둘 다 리네이밍 | CLAUDE→INTENT + SPEC→DETAIL | **기각** — 의미 충돌 + 스키마 재설계 필요 |
| B. CLAUDE만 리네이밍 | SPEC.md 유지 | **채택** |
| C. 리네이밍 없이 alias만 | 코드 변경 최소화 | **기각** — 정체성 확립 불가 |

**후속 작업**: SPEC.md → DETAIL.md 리네이밍은 `SpecMdSchema` 재설계와 함께 별도 Phase에서 수행.

### 구현 5단계

#### Step 1: Core Types + Shared Utilities (Foundation)

**대상**: 7 파일
**핵심 변경**:
- `src/types/documents.ts` — `ClaudeMdSchema` → `IntentMdSchema` (deprecated alias 유지)
- `src/types/fractal.ts` — `FractalNode.hasClaudeMd` → `hasIntentMd` (deprecated alias 유지)
- `src/types/index.ts` — re-export 업데이트 + deprecated alias
- `src/hooks/shared.ts` — `isClaudeMd()` → `isIntentMd()` + fallback (`CLAUDE.md`도 인식). `isFcaProject()`: `INTENT.md || CLAUDE.md` 양쪽 체크
- `src/core/organ-classifier.ts` — `ClassifyInput.hasClaudeMd` → `hasIntentMd`
- `src/core/document-validator.ts` — `validateClaudeMd` → `validateIntentMd`
- `src/index.ts` — 공개 API re-export

**Deprecated Alias 정책**: `@deprecated Use XXX instead. Will be removed in v0.2.0` JSDoc 태그 필수. 테스트에서는 alias 사용 금지.

#### Step 2: Core Logic + Hook Implementation (Business)

**대상**: ~15 파일
**핵심 변경**:
- `src/core/fractal-tree.ts` — `existsSync('CLAUDE.md')` → `existsSync('INTENT.md')` + fallback
- `src/core/rule-engine.ts` — `ORGAN_NO_CLAUDEMD` → `ORGAN_NO_INTENTMD` (규칙 ID alias 유지)
- `src/core/drift-detector.ts`, `fractal-validator.ts`, `project-analyzer.ts` — `hasClaudeMd` → `hasIntentMd`
- `src/hooks/context-injector.ts` — 하드코딩된 규칙 텍스트 전수 치환 (`'CLAUDE.md: max 50 lines'` → `'INTENT.md: max 50 lines'` 등)
- `src/hooks/structure-guard.ts` — `e.name === 'CLAUDE.md'` → 양방향 탐지
- `src/hooks/change-tracker.ts` — `fileName === 'CLAUDE.md'` → 양방향 탐지
- `src/hooks/pre-tool-validator.ts`, `agent-enforcer.ts`, `plan-gate.ts`

#### Step 3: Test Files Migration (Verification)

**대상**: ~15 테스트 파일, ~150 참조
**세분화 순서**:
1. **(a) 타입/인터페이스 참조** (~40건): `hasClaudeMd: true` → `hasIntentMd: true`
2. **(b) 파일명 리터럴** (~60건): `'CLAUDE.md'` → `'INTENT.md'`
3. **(c) 에러 메시지 assertion** (~30건): expect 문 업데이트
4. **(d) 테스트 설명 문자열** (~20건): describe/it 블록

각 카테고리 완료 후 `yarn filid test:run` 중간 검증.

**Fallback 테스트 3건 추가**:
- `isFcaProject()`: CLAUDE.md만 있을 때 `true` 반환
- `isIntentMd()`: `/CLAUDE.md` 경로도 인식
- `classifyNode`: deprecated `hasClaudeMd` 전달 시 동일 동작

#### Step 4: Documentation + Agent/Skill Markdown

**대상**: ~25 파일, ~120 참조
- 에이전트 5개 (`context-manager.md` 22건, `qa-reviewer.md` 12건 등)
- 스킬 15개 (SKILL.md, reference.md)
- 템플릿 (`rules/`, `hooks/`)
- filid 자체 `CLAUDE.md` 8개 → `INTENT.md`로 `git mv`

#### Step 5: Build Verification + Cleanup

1. `yarn build` 전체 빌드 통과
2. `bridge/` 산출물 grep 검증
3. `dist/` deprecated alias 존재 확인
4. `yarn filid test:run` 최종 통과
5. 전체 codebase grep: FCA 문서로서의 `CLAUDE.md` 잔존 0건 (허용 예외: 본 문서, fallback 로직, deprecated JSDoc)

### Rollback 전략

- 각 Step은 독립 커밋 → `git revert` 가능
- deprecated alias로 부분 적용에서도 컴파일 에러 없음
- 최악의 경우: `git revert HEAD~N..HEAD`로 전체 롤백

---

## 테스트 절차 — 리팩토링 검증

> CLAUDE.md → INTENT.md 리네이밍 후 시스템 무결성 검증을 위한 단계별 테스트 절차.

### T1: 정적 분석 검증

```bash
# TypeScript 컴파일 에러 없음
yarn typecheck

# 기대 결과: exit 0, 에러 0건
```

### T2: 단위 테스트 전체 통과

```bash
# 전체 테스트 실행
yarn filid test:run

# 기대 결과: 모든 테스트 PASS
# 특히 다음 테스트 파일 주의:
#   - organ-classifier.test.ts (hasIntentMd 분류)
#   - rule-engine.test.ts (organ-no-intentmd 규칙)
#   - document-validator.test.ts (validateIntentMd)
#   - pre-tool-validator.test.ts (INTENT.md 50줄 제한)
#   - structure-guard.test.ts (organ 디렉토리 INTENT.md 차단)
#   - fractal-tree.test.ts (INTENT.md 파일 탐지)
```

### T3: Fallback 동작 검증 (하위 호환)

기존 사용자의 `CLAUDE.md`만 있는 프로젝트에서도 filid가 정상 작동하는지 검증:

```typescript
// 테스트 1: isFcaProject() fallback
// CLAUDE.md만 존재하는 디렉토리 → true 반환
expect(isFcaProject('/path/with/only/CLAUDE.md')).toBe(true);

// 테스트 2: isIntentMd() fallback
// '/some/path/CLAUDE.md' 경로도 인식
expect(isIntentMd('/project/CLAUDE.md')).toBe(true);
expect(isIntentMd('/project/INTENT.md')).toBe(true);

// 테스트 3: INTENT.md 우선순위
// INTENT.md와 CLAUDE.md 모두 존재 시 INTENT.md 사용
// (fractal-tree.ts의 탐지 로직 검증)
```

### T4: 참조 무결성 검증 (grep)

```bash
# FCA 문서로서의 CLAUDE.md 잔존 확인
grep -rn "CLAUDE\.md" packages/filid/src/ --include="*.ts" | \
  grep -v "// @deprecated" | \
  grep -v "fallback" | \
  grep -v "CLAUDE\.md.*||.*INTENT\.md"

# 기대 결과: 0건 (허용 예외 제외)
# 허용 예외:
#   - deprecated alias의 JSDoc 설명
#   - isFcaProject/isIntentMd fallback 로직 내 'CLAUDE.md' 리터럴
#   - 본 문서(SPEC.md) 내 역사적 언급

# 에이전트/스킬 마크다운 잔존 확인
grep -rn "CLAUDE\.md" packages/filid/agents/ packages/filid/skills/ packages/filid/templates/

# 기대 결과: 0건 (FCA 문서 참조로서의 CLAUDE.md 잔존 없음)
```

### T5: 빌드 산출물 검증

```bash
# 전체 빌드
yarn build

# bridge/ 산출물 검증
grep -rn "INTENT\.md" packages/filid/bridge/
# 기대 결과: INTENT.md 참조 존재 (규칙 텍스트 등)

grep -rn "CLAUDE\.md" packages/filid/bridge/ | grep -v fallback
# 기대 결과: fallback 외 잔존 0건

# dist/ 타입 정의 검증
grep "IntentMdSchema" packages/filid/dist/types/documents.d.ts
# 기대 결과: IntentMdSchema export 존재

grep "@deprecated" packages/filid/dist/types/documents.d.ts
# 기대 결과: deprecated alias 존재
```

### T6: 통합 시나리오 검증

INTENT.md 기반 프로젝트에서 filid 전체 워크플로우 테스트:

1. **초기화**: `fca-init` 실행 → `INTENT.md` 생성 확인 (CLAUDE.md가 아님)
2. **스캔**: `fca-scan` 실행 → `organ-no-intentmd` 규칙으로 위반 검출
3. **동기화**: `fca-sync` 실행 → `INTENT.md` 파일 기준 drift 감지
4. **Hook 차단**: organ 디렉토리에 `INTENT.md` Write 시도 → 차단 메시지에 "INTENT.md" 표기
5. **컨텍스트 주입**: `UserPromptSubmit` 훅 → 주입 텍스트에 "INTENT.md" 포함

### T7: 벤치마크 회귀 없음

```bash
yarn bench:run

# 기대 결과: 기존 벤치마크 대비 ±5% 이내
# (리네이밍은 로직 변경 없으므로 성능 차이 없어야 함)
```