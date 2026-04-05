# 03. 플러그인 라이프사이클 & 워크플로우

> 16개 스킬 기반 라이프사이클 단계, 에이전트 협업 시퀀스, Hook 이벤트 타임라인, 거버넌스 파이프라인.

---

## 라이프사이클 개요

### 기본 워크플로우 (6개 스킬)

```
┌──────────┐    ┌───────────┐    ┌───────────┐    ┌──────────────────┐    ┌─────────┐    ┌───────────────┐
│ /filid:filid-setup │───→│ /filid:filid-scan │───→│ /filid:filid-sync │───→│ /filid:filid-review       │───→│ /filid:filid-promote │───→│ /filid:filid-context-query    │
│          │    │           │    │           │    │                  │    │             │    │               │
│ 초기화    │    │ 검증       │    │ 동기화     │    │ PR 구조 리뷰     │    │ 테스트      │    │ 질의           │
│          │    │           │    │           │    │                  │    │ 승격        │    │               │
└──────────┘    └───────────┘    └───────────┘    └──────────────────┘    └─────────────┘    └───────────────┘
  1회성           수시             drift 감지        PR 시점               안정화 후           수시
```

### 거버넌스 파이프라인 (4개 스킬)

```
┌────────────────┐    ┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ /filid:filid-pipeline   │───→│ /filid:filid-review   │───→│ /filid:filid-resolve      │───→│ /filid:filid-revalidate   │
│                │    │               │    │                  │    │                  │
│ 전체 파이프라인  │    │ 다중 페르소나  │    │ 수정 해결/소명     │    │ Delta 재검증      │
│ 오케스트레이션  │    │ 합의 리뷰      │    │ + 부채 관리       │    │ + PASS/FAIL      │
└────────────────┘    └───────────────┘    └──────────────────┘    └──────────────────┘
  PR 시점               PR 시점              리뷰 완료 후              수정 적용 후
```

### 보조 스킬 (6개)

```
┌───────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐
│ /filid:filid-guide     │    │ /filid:filid-restructure  │    │ /filid:filid-migrate │    │ /filid:filid-pull-request│    │ /filid:filid-update      │    │ /filid:filid-revalidate│
│           │    │              │    │             │    │                 │    │                 │    │ (단독 실행)   │
│ 구조 가이드 │    │ 프랙탈 구조   │    │ 구조 마이그  │    │ PR 생성         │    │ 문서/구조 갱신   │    │ Delta 재검증   │
│ 생성       │    │ 리팩토링      │    │ 레이션      │    │ 자동화          │    │                 │    │               │
└───────────┘    └──────────────┘    └─────────────┘    └─────────────────┘    └─────────────────┘    └──────────────┘
  수시               필요 시            마이그레이션 시    PR 준비 시            구조 변경 후            수정 적용 후
```

---

## 단계 1: /filid:filid-setup — 프로젝트 초기화

### 트리거 조건

- 프로젝트에 FCA-AI 구조가 없을 때 (최초 1회)
- 사용자가 `/filid:filid-setup [path]` 명령 실행

### 관여 에이전트

- **architect** (주도): 디렉토리 분석 및 프랙탈 경계 설계
- **context-manager** (보조): INTENT.md/DETAIL.md 생성

### 사용 MCP 도구

- `fractal_scan`: 전체 계층 구조 스캔 (파일시스템 직접 읽기)
- `fractal_navigate` (action: `classify`): 개별 디렉토리 분류

### 워크플로우

```
1. 디렉토리 트리 스캔
   fractal_scan(path: <project_root>)
       │
       ▼
2. 각 디렉토리 분류
   ├── INTENT.md 존재 → fractal (유지)
   ├── Organ 패턴 매칭 → organ (INTENT.md 생성 안 함)
   ├── 사이드이펙트 없음 → pure-function
   └── 기본 → fractal (INTENT.md 생성 필요)
       │
       ▼
3. fractal 디렉토리에 INTENT.md 생성
   - 50줄 이내
   - 3-tier 경계 섹션 포함 (Always do / Ask first / Never do)
   - 프로젝트 구조 및 명령어 기록
       │
       ▼
4. 필요 시 DETAIL.md 생성
   - 모듈의 기능 요구사항
   - API 인터페이스 정의
       │
       ▼
5. 초기화 요약 보고
   - 스캔된 디렉토리 수
   - 생성된 INTENT.md 수
   - 경고/이슈
```

### 입출력

- **입력**: 대상 디렉토리 경로 (기본: cwd)
- **출력**: 초기화 보고서 (디렉토리 수, 생성 파일 수, 경고)

---

## 단계 2: /filid:filid-scan — 규칙 위반 검출

### 트리거 조건

- 개발 중 수시로 실행
- 사용자가 `/filid:filid-scan [path] [--fix]` 명령 실행

### 관여 에이전트

- **qa-reviewer** (주도): 규칙 위반 검출 및 보고
- **context-manager** (--fix 시): 자동 수정 가능한 위반 해결

### 사용 MCP 도구

- `fractal_scan`: 프로젝트 구조 스캔 (파일시스템 직접 읽기)
- `test_metrics` (action: `check-312`): 3+12 규칙 검사

### 워크플로우

```
1. 프로젝트 트리 구축
   fractal_scan(path: <project_root>)
       │
       ▼
2. INTENT.md 검증
   각 fractal 노드의 INTENT.md에 대해:
   ├── 50줄 초과 검사
   └── 3-tier 경계 섹션 존재 검사
       │
       ▼
3. Organ 디렉토리 검증
   각 organ 노드에 대해:
   └── INTENT.md 존재 여부 검사 (있으면 위반)
       │
       ▼
4. 테스트 파일 검증
   test_metrics(action: 'check-312', files: [...])
   └── spec.ts 파일별 15 케이스 초과 검사
       │
       ▼
5. 위반 보고서 생성
   - 총 검사 수
   - 위반 수 (severity별)
   - 자동 수정 가능 수 (--fix 시 실행)
```

---

## 단계 3: /filid:filid-sync — 구조 Drift 감지 & 동기화

### 트리거 조건

- 구조적 이탈이 의심될 때
- 사용자가 `/filid:filid-sync [--dry-run] [--severity=<level>]` 명령 실행

### 관여 에이전트

- **drift-analyzer** (Stage 1-3 주도): drift 감지, 계획 생성
- **fractal-architect** (보조): 구조 분석 자문
- **restructurer** (Stage 4): 승인된 수정 실행

### 사용 MCP 도구

- `fractal_scan`: 프로젝트 구조 스캔
- `drift_detect`: 프랙탈 원칙 이탈 감지
- `lca_resolve`: 이동 대상 LCA 계산
- `structure_validate`: 실행 후 구조 검증

### 워크플로우

```
1. 프로젝트 스캔
   fractal_scan(path) → FractalTree
       │
       ▼
2. Drift 감지
   drift_detect(path, severity?) → DriftItem[]
   ├── 각 이탈 항목: expected, actual, severity, correction
   └── --severity 필터 적용
       │
       ▼
3. 수정 계획 수립
   drift_detect(path, generatePlan: true) → SyncPlan
   ├── 파일 이동, 디렉토리 재분류
   └── lca_resolve로 최적 배치 경로 결정
       │
       ▼
4. 수정 실행 (승인 후)
   restructurer가 SyncPlan 실행
   ├── 파일 이동/이름 변경
   ├── index.ts 재생성
   └── import 경로 갱신
       │
       ▼
5. 검증
   structure_validate(path) → 위반 0건 확인
```

### 설계 배경

> **Note**: 초기 설계에서는 PostToolUse hook 기반 ChangeQueue로 변경을 추적했으나,
> hook 프로세스 간 상태 비공유 문제로 MCP 기반 drift 감지로 재설계되었다.
> ChangeQueue 클래스는 라이브러리 유틸리티로 유지되지만 hook에 의해 자동 채워지지 않는다.

---

## 단계 4: /filid:filid-review — 6단계 PR 검증 파이프라인

### 트리거 조건

- PR 제출 시
- 사용자가 `/filid:filid-review [--stage=1-6] [--verbose]` 명령 실행

### 관여 에이전트

- **qa-reviewer** (주도): 전체 파이프라인 실행
- **architect** (Stage 1, 5 보조): 구조/의존성 검증

### 사용 MCP 도구

- `fractal_navigate`: Stage 1 (구조), Stage 5 (의존성)
- `test_metrics`: Stage 3 (테스트), Stage 4 (메트릭)
- `doc_compress`: Stage 2 (문서 크기 검사)

### 6단계 파이프라인

```
┌─ Stage 1: Structure ─────────────────────────┐
│ fractal/organ 경계 준수 검증                    │
│ - 모든 fractal에 INTENT.md 존재?               │
│ - organ 디렉토리에 INTENT.md 없음?              │
│ - 분류가 올바른지?                              │
└──────────────────────────────────────────────┘
         │ pass/fail
         ▼
┌─ Stage 2: Documents ─────────────────────────┐
│ INTENT.md/DETAIL.md 규정 준수 검증              │
│ - INTENT.md: 50줄 제한 + 3-tier 경계           │
│ - DETAIL.md: append-only 패턴 없음             │
│ - 문서-코드 동기화 상태                          │
└──────────────────────────────────────────────┘
         │ pass/fail
         ▼
┌─ Stage 3: Tests ─────────────────────────────┐
│ 3+12 규칙 + 테스트 커버리지 검증                 │
│ - spec.ts별 15 케이스 이내?                     │
│ - basic/complex 분포 적절?                      │
│ - 테스트 커버리지 충분?                          │
└──────────────────────────────────────────────┘
         │ pass/fail
         ▼
┌─ Stage 4: Metrics ───────────────────────────┐
│ LCOM4 + CC 메트릭 분석                          │
│ - LCOM4 >= 2인 모듈 → split 권고               │
│ - CC > 15인 함수 → compress 권고               │
│ - 의사결정 트리 결과 보고                        │
└──────────────────────────────────────────────┘
         │ pass/fail
         ▼
┌─ Stage 5: Dependencies ──────────────────────┐
│ 순환 의존성 검증                                │
│ - DAG 구축 + detectCycles()                    │
│ - 순환 발견 시 경로 보고                         │
│ - 위상 정렬 가능 여부 확인                       │
└──────────────────────────────────────────────┘
         │ pass/fail
         ▼
┌─ Stage 6: Summary ───────────────────────────┐
│ 종합 보고서 생성                                │
│ - 단계별 pass/fail 상태                         │
│ - 발견된 이슈 목록 (severity별)                  │
│ - 실행 가능한 권고사항                           │
│ - 전체 PASS/FAIL 판정                           │
└──────────────────────────────────────────────┘
```

---

## 단계 5: /filid:filid-promote — 테스트 승격

### 트리거 조건

- 안정화 기간(90일) 경과 후
- 사용자가 `/filid:filid-promote [path] [--days=90]` 명령 실행

### 관여 에이전트

- **qa-reviewer** (분석): 승격 후보 식별
- **implementer** (실행): spec.ts 생성

### 사용 MCP 도구

- `test_metrics` (action: `count`): 테스트 케이스 분석

### 워크플로우

```
1. test.ts 파일 탐색 및 분석
   test_metrics(action: 'count', files: [...])
       │
       ▼
2. 승격 자격 검사
   checkPromotionEligibility(input, stabilityThreshold)
   ├── stableDays >= 90?
   └── lastFailure === null?
       │
       ▼
3. 자격 있는 파일에 대해:
   ├── test.ts의 테스트 패턴 분석
   ├── 중복 케이스 식별
   ├── parameterized spec.ts 구조 생성
   └── 3+12 규칙 검증 (15 케이스 이내 확인)
       │
       ▼
4. spec.ts 작성 + 원본 test.ts 삭제
```

---

## 단계 6: /filid:filid-context-query — 인터랙티브 질의

### 트리거 조건

- 개발 중 수시로 실행
- 사용자가 `/filid:filid-context-query <question>` 명령 실행

### 관여 에이전트

- **architect** (질의 해석 + 응답)

### 사용 MCP 도구

- `fractal_navigate`: 관련 모듈 탐색
- `doc_compress` (mode: `auto`): 컨텍스트 과다 시 압축

### 3-Prompt Limit 규칙

```
질문 수신
    │
    ▼
Prompt 1: 모듈 위치 파악 + INTENT.md 체인 로드
    │
    ▼
Prompt 2: 상세 분석 또는 추가 정보 수집
    │
    ▼
Prompt 3 (최대): 최종 응답 생성
    │
    ▼
3회 이내 답변 불가 시:
    "현재까지 파악한 내용 + 추가 필요한 정보" 보고
```

---

## 에이전트 협업 시퀀스

### 일반적인 개발 사이클

```
                 ┌──────────┐
                 │ Architect │ ← 읽기 전용
                 │ (설계)     │
                 └─────┬────┘
                       │ DETAIL.md 초안
                       ▼
                 ┌──────────────┐
                 │ Implementer   │ ← DETAIL 범위 내 코드 작성
                 │ (구현)         │
                 └─────┬────────┘
                       │ 코드 변경
                       ▼
                 ┌────────────────┐
                 │ Context Manager │ ← 문서만 수정
                 │ (문서 동기화)     │
                 └─────┬──────────┘
                       │ INTENT.md/DETAIL.md 갱신
                       ▼
                 ┌──────────────┐
                 │ QA Reviewer   │ ← 읽기 전용
                 │ (품질 검증)     │
                 └──────────────┘
                       │ 검증 보고서
                       ▼
                 pass/fail 판정
```

### 역할별 도구 접근 매트릭스

| 에이전트          | Read | Glob | Grep | Write | Edit | Bash | MCP |
| ----------------- | ---- | ---- | ---- | ----- | ---- | ---- | --- |
| fractal-architect | O    | O    | O    | X     | X    | X    | O   |
| implementer       | O    | O    | O    | O     | O    | O    | O   |
| context-manager   | O    | O    | O    | O\*   | O\*  | X    | O   |
| qa-reviewer       | O    | O    | O    | X     | X    | X    | O   |
| drift-analyzer    | O    | O    | O    | X     | X    | X    | O   |
| restructurer      | O    | O    | O    | O     | O    | O    | O   |
| code-surgeon      | O    | O    | O    | O     | O    | O    | O   |

> \*context-manager: INTENT.md, DETAIL.md 문서만 Write/Edit 가능 (역할 제한), Bash 사용 불가

---

## Hook 이벤트 타임라인

### 단일 코드 수정 사이클

```
시간 →

T0  세션 시작
    └─ SessionStart → setup
       세션 초기화, 오래된 캐시 정리

T1  사용자 프롬프트 입력
    └─ UserPromptSubmit → context-injector
       "[FCA-AI] Active in: /path ..." (~200자 주입)

T2  에이전트가 Read/Write 도구 호출
    └─ PreToolUse (matcher: Read|Write|Edit)
       ├─ intent-injector: INTENT.md 컨텍스트 주입 (Read|Write|Edit)
       ├─ pre-tool-validator: INTENT.md/DETAIL.md 검증 (Write|Edit)
       └─ structure-guard: Organ 디렉토리 보호 (Write|Edit)
       → pass/block 결정

T3  (pass 시) Write 도구 실행 → 파일 생성/수정

T4  PostToolUse (disabled — no active hooks)

T5  에이전트가 서브에이전트 생성
    └─ SubagentStart (matcher: *)
       └─ agent-enforcer: 역할 제한 주입
```

---

---

## 거버넌스 라이프사이클: 코드 리뷰 → 해결 → 재검증

기존 6단계 라이프사이클과 독립적으로 동작하는 거버넌스 파이프라인.
`/filid:filid-pipeline`으로 전체 흐름을 오케스트레이션하거나 각 단계를 개별 실행 가능.

```
┌────────────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
│ /filid:filid-pipeline   │    │ /filid:filid-review   │───→│ /filid:filid-resolve    │───→│ /filid:filid-revalidate   │
│                │───→│               │    │                │    │                  │
│ 전체 오케스트레이 │    │ Phase A: 분석  │    │ 수용/거부 선택  │    │ Delta 추출        │
│ 션 (선택)      │    │ Phase B: 검증  │    │ 소명 수집       │    │ 수정 확인         │
│                │    │ Phase C: 합의  │    │ ADR 정제        │    │ PASS/FAIL        │
│                │    │               │    │ 부채 생성        │    │ PR 코멘트         │
└────────────────┘    └──────────────┘    └────────────────┘    └──────────────────┘
  PR 시점               PR 시점              리뷰 완료 후            수정 적용 후
```

### /filid:filid-review — 3-Phase 위임 패턴

```
Phase A (haiku subagent)
├── git diff 분석
├── review_manage(elect-committee) → 결정론적 위원회 선출
├── review_manage(ensure-dir) → 리뷰 디렉토리 생성
└── 출력: session.md

Phase B (sonnet subagent)
├── 기존 MCP tool 기반 기술 검증 (ast_analyze, test_metrics, ...)
├── debt_manage(calculate-bias) → 부채 바이어스 계산
└── 출력: verification.md

Phase C (의장 직접)
├── 페르소나 프레임워크 지연 로딩
├── 상태 머신: PROPOSAL→DEBATE→VETO/SYNTHESIS/ABSTAIN→CONCLUSION
├── 최대 5라운드
└── 출력: review-report.md, fix-requests.md
```

### /filid:filid-resolve — 수정 사항 해결

```
1. 브랜치 감지 + fix-requests.md 로딩
2. AskUserQuestion으로 각 fix 항목 수용/거부
3. 수용 → 코드 패치 안내
4. 거부 → 소명 수집 → ADR 정제 → debt_manage(create)
5. justifications.md 출력 (resolve_commit_sha 포함)
```

### /filid:filid-revalidate — Delta 재검증

```
1. resolve_commit_sha 기반 Delta 추출
2. 수용된 fix 항목별 MCP tool 재검증
3. 거부된 항목의 소명 헌법 검사
4. 기존 부채 해소 확인 → debt_manage(resolve)
5. PASS/FAIL 판정 → re-validate.md 출력
6. (선택) gh pr comment으로 PR 코멘트
```

### 부채 관리 라이프사이클

```
┌─────────┐     ┌───────────┐     ┌──────────┐
│ 발생     │────→│ 누적/가중  │────→│ 해소      │
│ (create) │     │ (bias)    │     │ (resolve) │
└─────────┘     └───────────┘     └──────────┘

발생: /resolve에서 거부 시 debt_manage(create)
누적: 이후 리뷰에서 동일 프랙탈 수정 시 touch_count++ → 가중치 2배
해소: /revalidate에서 규칙 충족 시 debt_manage(resolve)
```

### .filid/ 디렉토리 구조

```
.filid/
├── review/<branch>/       # 리뷰 중간 산출물 (브랜치별)
│   ├── session.md            # Phase A 출력
│   ├── verification.md       # Phase B 출력
│   ├── review-report.md      # Phase C 출력 (최종 보고서)
│   ├── fix-requests.md       # Phase C 출력 (수정 요청)
│   ├── justifications.md     # /filid:filid-resolve 출력
│   └── re-validate.md        # /filid:filid-revalidate 출력
└── debt/                  # 기술 부채 파일 (전체 공유)
    └── <debt-id>.md          # 개별 부채 항목
```

---

## 관련 문서

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — 4계층 구조와 에이전트 개요
- [04-USAGE.md](./04-USAGE.md) — 스킬 사용법 상세
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — Hook/MCP 내부 동작
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 각 단계에서 적용되는 규칙
