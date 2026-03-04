# L3 확장 + L5 재정의 — 코드 구현 계획

## 1. 개요

본 계획서는 maencof 플러그인의 5-Layer 지식 모델 아키텍처를 다음과 같이 확장·재정의하기 위한 코드 구현 로드맵이다.

### 1.1 L3 확장: 단일 Layer 3 → 3개 서브레이어

단일 `03_External/` 계층에 무분별하게 혼재되는 정보 병목 현상을 해소하기 위해, 인지 신경과학·생태학적 체계 이론·사회 자본 이론에 기반한 3차원 방향성 분할 모델을 적용한다.

| 서브레이어 | 이름 | 방향성 | 핵심 대상 | 감쇠 인자 |
|-----------|------|--------|----------|----------|
| L3A | 관계적 (Relational) | 대인적 외부 | 인물, 전문가, 멘토 | 0.75 |
| L3B | 구조적 (Structural) | 제도적 외부 | 회사, 커뮤니티, 프로젝트팀 | 0.80 |
| L3C | 의미론적 (Topical) | 주제적 외부 | 개념, 기술, 문헌 | 0.85 |

### 1.2 L5 재정의: 맥락 메타데이터 → 이중 역할

기존 L5(Context & Domain Metadata)를 두 가지 독립적 역할로 분리한다.

| 서브레이어 | 이름 | 역할 | 감쇠 인자 |
|-----------|------|------|----------|
| L5-Buffer | 미분류 임시 버퍼 | 빠른 캡처 → 적절한 레이어로 승격 | 0.95 |
| L5-Boundary | 경계 객체 | 교차 레이어 연결, 번역의 허브 | 0.60 |

### 1.3 아키텍처 버전 전환

- **현재**: v1.0.0 — 단일 L3, 기존 L5 (persons/, domains/)
- **목표**: v2.0.0 — L3A/B/C 확장 + L5 Buffer/Boundary 이중 역할

---

## 2. 설계 문서 참조

| 문서 | 경로 (maencof 기준 상대) | 상태 |
|------|------------------------|------|
| 계층 모델 원문 | `../../.metadata/maencof/Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/04-layered-knowledge-model.md` | 기존 |
| L3 방향성 확장 연구 | `../../.metadata/maencof/extend_L3.md` | 기존 |
| L3 방향성 확장 설계 | `../../.metadata/maencof/Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/07-l3-directional-expansion.md` | 신규 |
| L5 재정의 설계 | `../../.metadata/maencof/Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/08-l5-redefinition.md` | 신규 |
| 지식 레이어 설계 | `../../.metadata/maencof/Claude-Code-Plugin-Design/02-knowledge-layers.md` | 갱신 필요 |
| Frontmatter 스키마 | `../../.metadata/maencof/Claude-Code-Plugin-Design/05-frontmatter-schema.md` | 갱신 필요 |
| 링크 정책 | `../../.metadata/maencof/Claude-Code-Plugin-Design/06-link-policy.md` | 갱신 필요 |
| 코어 모듈 | `../../.metadata/maencof/Claude-Code-Plugin-Design/08-core-modules.md` | 갱신 필요 |
| 확산 활성화 | `../../.metadata/maencof/Claude-Code-Plugin-Design/10-spreading-activation.md` | 갱신 필요 |
| 기억 라이프사이클 | `../../.metadata/maencof/Claude-Code-Plugin-Design/13-memory-lifecycle.md` | 갱신 필요 |

---

## 3. 구현 단계

### Phase 1: 스키마 & 타입 변경

L3/L5 서브레이어 구분을 타입 시스템에 반영한다. 기존 `Layer` enum(1~5)은 유지하되, 서브레이어 식별자를 추가한다.

#### 1-1. `src/types/common.ts` — 서브레이어 타입 추가

```typescript
// L3 서브레이어
export type L3SubLayer = 'A' | 'B' | 'C';

// L5 서브레이어
export type L5SubLayer = 'buffer' | 'boundary';

// 통합 서브레이어 (L3 또는 L5에서만 사용)
export type SubLayer = L3SubLayer | L5SubLayer;

// L3 서브레이어 디렉토리 매핑
export const L3_SUBDIR: Record<L3SubLayer, string> = {
  A: 'relational',
  B: 'structural',
  C: 'topical',
};

// L5 서브레이어 디렉토리 매핑
export const L5_SUBDIR: Record<L5SubLayer, string> = {
  buffer: 'buffer',
  boundary: 'boundary',
};

// EdgeType 확장
export type EdgeType =
  | 'LINK'
  | 'PARENT_OF'
  | 'CHILD_OF'
  | 'SIBLING'
  | 'RELATIONSHIP'
  | 'CROSS_LAYER';  // 신규: L5-Boundary가 생성하는 교차 레이어 엣지
```

#### 1-2. `src/types/frontmatter.ts` — Frontmatter 스키마 확장

```typescript
// sub_layer 필드 추가
sub_layer: z.enum(['A', 'B', 'C', 'buffer', 'boundary']).optional(),

// L3A 전용 필드
person_ref: z.string().optional(),       // L5 persons/ 문서 참조
trust_level: z.number().int().min(1).max(5).optional(),
expertise_domains: z.array(z.string()).optional(),

// L3B 전용 필드
org_type: z.enum(['company', 'community', 'team', 'institution', 'project']).optional(),
membership_status: z.enum(['active', 'inactive', 'alumni']).optional(),
ba_context: z.string().optional(),       // 조직의 Ba(場) 설명

// L3C 전용 필드
topic_category: z.string().optional(),   // 주제 카테고리
maturity: z.enum(['seed', 'growing', 'mature', 'archived']).optional(),

// L5-Buffer 전용 필드
buffer_type: z.enum(['quick_capture', 'inbox', 'unsorted']).optional(),
promotion_target: z.number().int().min(1).max(4).optional(), // 승격 대상 레이어

// L5-Boundary 전용 필드
boundary_type: z.enum(['project_moc', 'cross_domain', 'synthesis']).optional(),
connected_layers: z.array(z.number().int().min(1).max(5)).optional(),
```

서브레이어-필드 정합성 검증을 위한 `refineSuperRefine` 또는 별도 validator 함수 추가:
- `layer=3` + `sub_layer='A'` → `person_ref` 허용, `org_type` 금지
- `layer=3` + `sub_layer='B'` → `org_type` 허용, `person_ref` 금지
- `layer=3` + `sub_layer='C'` → `topic_category` 허용
- `layer=5` + `sub_layer='buffer'` → `buffer_type`, `promotion_target` 허용
- `layer=5` + `sub_layer='boundary'` → `boundary_type`, `connected_layers` 허용
- `sub_layer` 미존재 시: 하위 호환 모드 (기존 동작 유지)

#### 1-3. `src/types/graph.ts` — KnowledgeNode 확장

```typescript
export interface KnowledgeNode {
  // ... 기존 필드 ...
  /** 서브레이어 (L3: A/B/C, L5: buffer/boundary, 선택) */
  subLayer?: SubLayer;
}
```

#### 1-4. 영향 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/types/common.ts` | `SubLayer`, `L3SubLayer`, `L5SubLayer` 타입, `L3_SUBDIR`, `L5_SUBDIR` 매핑, `CROSS_LAYER` EdgeType |
| `src/types/frontmatter.ts` | `sub_layer` 필드 + 서브레이어 전용 필드 + 정합성 검증 |
| `src/types/graph.ts` | `KnowledgeNode.subLayer` 필드 |
| `src/types/index.ts` | 신규 타입 barrel export 추가 |

---

### Phase 2: 코어 모듈 업데이트

#### 2-1. C1 VaultScanner (`src/core/vault-scanner.ts`)

**변경 사항**: L3/L5 서브디렉토리 인식

```
03_External/
├── relational/    # L3A — 인물·관계 지식
├── structural/    # L3B — 조직·제도 지식
└── topical/       # L3C — 주제·개념 지식 (기본값)

05_Context/
├── persons/       # 기존 유지
├── domains/       # 기존 유지
├── buffer/        # L5-Buffer — 미분류 임시
└── boundary/      # L5-Boundary — 경계 객체
```

- 파일 경로에서 서브디렉토리를 감지하여 `subLayer` 메타데이터를 자동 부여
- `03_External/` 루트에 직접 위치한 문서: `sub_layer` frontmatter로 판별, 미지정 시 `L3C` 기본값
- `05_Context/buffer/`, `05_Context/boundary/` 서브디렉토리 신규 인식
- 기존 `05_Context/persons/`, `05_Context/domains/`는 변경 없이 유지

#### 2-2. C2 DocumentParser (`src/core/document-parser.ts`)

**변경 사항**: `sub_layer` 파싱 + 서브레이어별 필드 유효성 검증

- Frontmatter에서 `sub_layer` 필드 추출
- 서브레이어별 필수/허용 필드 교차 검증 (Phase 1에서 정의한 정합성 규칙)
- 파싱 결과에 `subLayer` 필드 포함

#### 2-3. C3 GraphBuilder (`src/core/graph-builder.ts`)

**변경 사항**: `CROSS_LAYER` 엣지 타입 지원

- L5-Boundary 노드가 `connected_layers` 필드에 명시한 레이어의 문서들과 `CROSS_LAYER` 엣지 생성
- 경계 객체의 특성: 다수의 레이어를 가로지르는 양방향 엣지
- 기존 `LINK`, `PARENT_OF`, `CHILD_OF`, `SIBLING`, `RELATIONSHIP` 엣지와 공존
- `CROSS_LAYER` 엣지의 가중치: SCS 기반 + Boundary 노드의 연결 레이어 수에 비례한 보정

#### 2-4. C5 WeightCalculator (`src/core/weight-calculator.ts`)

**변경 사항**: 서브레이어별 차등 감쇠 인자

현재 감쇠 인자 테이블 (Layer 단위):

| Layer | 현재 감쇠 인자 |
|-------|--------------|
| L1 (Core) | 0.5 |
| L2 (Derived) | 0.7 |
| L3 (External) | 0.8 |
| L4 (Action) | 0.9 |
| L5 (Context) | 미정의 |

확장 감쇠 인자 테이블 (서브레이어 포함):

| Layer/SubLayer | 감쇠 인자 | 근거 |
|---------------|----------|------|
| L1 (Core) | 0.50 | 변경 없음 — 광범위 확산 |
| L2 (Derived) | 0.70 | 변경 없음 — 표준 범위 |
| L3A (Relational) | 0.75 | 인물 지식은 중간 확산 — TMS 효과 반영 |
| L3B (Structural) | 0.80 | 조직 지식은 Ba 내부로 제한적 확산 |
| L3C (Topical) | 0.85 | 주제 지식은 가까운 이웃만 — 기존 L3와 유사 |
| L4 (Action) | 0.90 | 변경 없음 — 최소 범위 |
| L5-Buffer | 0.95 | 미분류 임시는 거의 확산하지 않음 |
| L5-Boundary | 0.60 | 경계 객체는 넓게 확산 — Bridge 역할 |

- `sub_layer` 미지정 시 기존 Layer 단위 감쇠 인자 사용 (하위 호환)
- WeightCalculator가 노드의 `subLayer`를 참조하여 감쇠 인자 결정

#### 2-5. C6 SpreadingActivation (`src/core/spreading-activation.ts`)

**변경 사항**: 확장된 감쇠 인자 테이블 적용 + L5-Boundary Bridge 처리

- WeightCalculator에서 제공하는 서브레이어별 감쇠 인자 소비
- L5-Boundary 노드 도달 시 `CROSS_LAYER` 엣지를 통해 연결된 다른 레이어로 확산 전파
- Bridge 확산 규칙: Boundary 노드 → `connected_layers`의 문서들로 감쇠 인자 0.60 적용 후 전파
- 기존 SA 수식 `A[j] = sum(A[i] * W[i,j] * d)` 변경 없음, `d`만 서브레이어 기반으로 동적 결정

---

### Phase 3: MCP 도구 업데이트

#### 3-1. 기존 도구 수정

| 도구 | 변경 내용 |
|------|----------|
| `maencof_create` | `sub_layer` 파라미터 추가. L3 문서 생성 시 A/B/C 지정 가능. 미지정 시 L3C 기본값 |
| `maencof_update` | `sub_layer` 변경 허용 (이동 포함 로직). 서브레이어 전용 필드 유효성 검증 |
| `maencof_move` | L3 서브디렉토리 간 이동 지원 (`03_External/relational/ → structural/`) |
| `kg_build` | 서브디렉토리 구조 인식, `CROSS_LAYER` 엣지 빌드, 확장 감쇠 인자 테이블 적용 |
| `kg_search` | 서브레이어 필터링 옵션: `sub_layer` 파라미터로 L3A/B/C 또는 L5 buffer/boundary 필터링 |
| `kg_navigate` | 서브레이어 표시, L5-Boundary에서 `CROSS_LAYER` 링크 탐색 |
| `kg_suggest_links` | L3 서브레이어 간 교차 연결 제안 (인물↔주제, 조직↔주제 관계) |

#### 3-2. 새 도구

| 도구 | Zod 파라미터 | 반환 | 설명 |
|------|-------------|------|------|
| `buffer_promote` | `{ document_id: string, target_layer: 1\|2\|3\|4, target_sub_layer?: SubLayer }` | `{ success, new_path, moved_from }` | L5-Buffer 아이템을 적절한 레이어로 승격. frontmatter 갱신 + 파일 이동 + backlink 재구축 |
| `boundary_create` | `{ title: string, boundary_type: 'project_moc'\|'cross_domain'\|'synthesis', connected_layers: number[], tags: string[] }` | `{ success, path, node_id }` | L5-Boundary 경계 객체를 `05_Context/boundary/`에 생성. `CROSS_LAYER` 엣지 자동 등록 |

---

### Phase 4: 스킬 업데이트

#### 4-1. 기존 스킬 수정

| 스킬 | 변경 내용 | `context_layers` 변경 |
|------|----------|---------------------|
| `remember` | 기록 대상이 L3일 때 서브레이어(A/B/C) 선택 인터뷰 추가. 인물→L3A, 조직→L3B, 주제→L3C 자동 분류 제안 | 기존 유지 |
| `organize` | L5-Buffer 승격 워크플로우 통합. `buffer_promote` 도구 호출. 승격 대상 레이어 제안 | L5 추가 |
| `explore` | 서브레이어 필터링 탐색 지원. "인물 중심 탐색", "조직 중심 탐색", "주제 중심 탐색" 모드 | 기존 유지 |
| `recall` | 서브레이어 필터링 검색. `sub_layer` 파라미터로 특정 방향성 지식만 검색 | 기존 유지 |
| `reflect` | L5-Boundary를 활용한 교차 레이어 통찰 생성. 경계 객체의 연결 패턴 분석 | L5 추가 |
| `setup` | 온보딩 시 L3 서브디렉토리 + L5 서브디렉토리 자동 생성 | 기존 유지 |
| `cleanup` | L5-Buffer 체류 기간 초과 항목 정리 제안 | L5 추가 |
| `diagnose` | 서브레이어 일관성 진단 항목 추가 (디렉토리 vs frontmatter `sub_layer` 불일치 감지) | 기존 유지 |

#### 4-2. 새 스킬

| 스킬 | 호출 | 역할 | `context_layers` | 위치 |
|------|------|------|-----------------|------|
| `migrate` | `/maencof:migrate` | v1→v2 아키텍처 마이그레이션 (아래 상세) | `[]` | `skills/migrate/SKILL.md` |

---

## 4. 마이그레이션 도구 계획

### 4.1 모듈: `architecture-migrator` (내부 모듈)

**위치**: `src/core/architecture-migrator.ts`
**책임**: 기존 v1.0.0 5레이어 구조를 v2.0.0 확장 구조로 마이그레이션

### 4.2 마이그레이션 단계

```
1. .maencof-meta/version.json 읽기 → 현재 아키텍처 버전 확인
2. version < 2.0.0 인 경우에만 진행 (이미 2.0.0이면 건너뜀)
3. WAL 시작 (.maencof-meta/migration-wal.json 생성)

=== L3 마이그레이션 ===
4. 03_External/ 전체 문서 스캔
5. 각 문서를 L3A/B/C로 분류:
   a. frontmatter에 person 또는 person_ref 존재 → L3A (relational)
   b. frontmatter에 domain_type이 company/community/team
      또는 org_type 존재 → L3B (structural)
   c. 나머지 → L3C (topical, 기본값)
6. 서브디렉토리 생성: 03_External/relational/, structural/, topical/
7. 문서 이동:
   - 파일 이동 → WAL에 기록
   - frontmatter 업데이트: sub_layer 필드 추가 (A/B/C)
   - L3A 문서: person 필드 → person_ref로 마이그레이션
8. 03_External/ 루트의 빈 문서 없음 확인

=== L5 마이그레이션 ===
9. 05_Context/ 스캔
10. 서브디렉토리 생성: 05_Context/buffer/, 05_Context/boundary/
11. 기존 persons/, domains/ 디렉토리는 그대로 유지
    (persons/는 L3A의 person_ref가 참조하는 메타데이터 노드)

=== 인덱스 재구축 ===
12. .maencof-meta/backlink-index.json 재구축 (이동된 경로 반영)
13. .maencof-index/ 그래프 캐시 무효화 플래그 설정
    (.maencof-index/snapshot.json 삭제 → 다음 kg_build 시 전체 재구축)

=== 버전 갱신 ===
14. .maencof-meta/version.json 업데이트:
    { "architecture_version": "2.0.0", "migrated_at": "ISO", "previous_version": "1.0.0" }
15. WAL 완료 마킹 (.maencof-meta/migration-wal.json 삭제)
```

### 4.3 분류 알고리즘

```
classifyL3Document(doc):
  fm = doc.frontmatter

  // 규칙 1: 명시적 person 관련 필드
  if fm.person OR fm.person_ref:
    return 'A'  // relational

  // 규칙 2: 조직 관련 필드
  if fm.org_type OR (fm.domain_type in ['company', 'community', 'team']):
    return 'B'  // structural

  // 규칙 3: 태그 기반 휴리스틱
  if fm.tags intersects PERSON_TAGS:    // ['person', 'mentor', 'colleague', ...]
    return 'A'
  if fm.tags intersects ORG_TAGS:       // ['company', 'team', 'community', ...]
    return 'B'

  // 기본값
  return 'C'  // topical
```

### 4.4 WAL 기반 원자성 보장

```json
// .maencof-meta/migration-wal.json
{
  "started_at": "ISO",
  "from_version": "1.0.0",
  "to_version": "2.0.0",
  "operations": [
    { "type": "mkdir", "path": "03_External/relational/" },
    { "type": "move", "from": "03_External/alice.md", "to": "03_External/relational/alice.md" },
    { "type": "update_frontmatter", "path": "03_External/relational/alice.md", "field": "sub_layer", "value": "A" }
  ],
  "completed": []
}
```

- 각 operation 완료 시 `completed[]`로 이동
- 중단 시 WAL의 미완료 항목 롤백 (move → 역이동, mkdir → rmdir)

### 4.5 롤백 메커니즘

```
rollbackMigration(wal):
  for op in reverse(wal.completed):
    if op.type == 'move':
      moveFile(op.to, op.from)
    if op.type == 'update_frontmatter':
      removeFrontmatterField(op.path, op.field)
    if op.type == 'mkdir' AND dirIsEmpty(op.path):
      removeDir(op.path)
  deleteFile(wal.path)
```

---

## 5. 마이그레이션 스킬 계획

### 5.1 스킬 정의

| 항목 | 값 |
|------|---|
| **스킬명** | `migrate` |
| **위치** | `packages/maencof/skills/migrate/SKILL.md` |
| **호출** | `/maencof:migrate` |
| **context_layers** | `[]` (파일 구조 조작, 지식 콘텐츠 불필요) |
| **MCP 도구 의존** | `architecture-migrator` 내부 모듈 (MCP 도구로 노출하지 않음) |

### 5.2 워크플로우

```
1. 현재 아키텍처 버전 확인
   - .maencof-meta/version.json 읽기
   - 미존재 시 v1.0.0으로 간주

2. 플러그인 기대 버전과 비교
   - 플러그인 기대 버전: EXPECTED_ARCHITECTURE_VERSION 상수 (2.0.0)
   - 버전 일치 → "이미 최신 버전입니다" 알림 후 종료

3. 마이그레이션 계획 표시
   - 이동 대상 문서 수, 분류 결과 미리보기
   - 서브디렉토리 생성 목록
   - 예상 소요 시간

4. 사용자 승인 (Autonomy Level에 따라)
   - Level 0-1: 전체 계획 → 명시적 승인 → 실행
   - Level 2: 계획 표시 → 자동 실행 (파괴적 작업만 확인)
   - Level 3: 완전 자동 실행

5. 마이그레이션 실행
   - architecture-migrator 모듈 호출
   - WAL 기반 트랜잭션으로 원자적 실행

6. 결과 리포트 출력
   - 총 이동 문서 수: N건
   - L3A/B/C 분류 결과: A: n건, B: n건, C: n건
   - L5 서브디렉토리 생성 결과
   - 경고 사항 (분류 불확실 문서 등)
   - backlink 인덱스 재구축 결과

7. 실패 시 자동 롤백
   - WAL에서 미완료 작업 역행
   - 롤백 결과 리포트
```

### 5.3 Progressive Autonomy 적용

| Level | 동작 |
|-------|------|
| 0-1 | 마이그레이션 계획 전문 표시 → 각 문서 분류 결과 확인 → 사용자 "실행" 승인 후 진행 |
| 2 | 계획 요약 표시 → 자동 실행. 분류 확신도 < 0.5인 문서만 개별 확인 |
| 3 | 완전 자동. 결과 리포트만 표시 |

---

## 6. 버전 변경 감지 계획

### 6.1 `.maencof-meta/version.json` 스키마

```json
{
  "architecture_version": "2.0.0",
  "migrated_at": "2026-03-04T00:00:00Z",
  "previous_version": "1.0.0",
  "migration_log": [
    {
      "from": "1.0.0",
      "to": "2.0.0",
      "date": "2026-03-04T00:00:00Z",
      "files_moved": 42,
      "classification": { "L3A": 8, "L3B": 12, "L3C": 22 }
    }
  ]
}
```

### 6.2 SessionStart Hook 확장

현재 SessionStart Hook의 동작에 다음 단계를 **선행 삽입**한다:

```
SessionStart Hook 진입
  ↓
1. .maencof-meta/version.json 읽기
   - 미존재 → version = "1.0.0"으로 간주
  ↓
2. 플러그인 EXPECTED_ARCHITECTURE_VERSION과 비교
   - semver 비교 (major 차이만 마이그레이션 필요)
  ↓
3. 버전 불일치 감지 시:
   - [Level 0-1] 사용자에게 경고 표시:
     "아키텍처 버전 불일치: 현재 v1.0.0, 기대 v2.0.0.
      /maencof:migrate 실행을 권장합니다."
   - [Level 2] 자동 마이그레이션 실행 (비파괴적 작업)
   - [Level 3] 완전 자동 마이그레이션
  ↓
4. 버전 일치 → 기존 SessionStart 흐름 진행
   (transition-queue 처리, broken-links 검증 등)
```

### 6.3 버전 넘버링 규칙

| 변경 유형 | Semver | 예시 |
|----------|--------|------|
| 디렉토리 구조 변경, 서브레이어 추가 | Major | 1.0.0 → 2.0.0 |
| Frontmatter 선택 필드 추가 | Minor | 2.0.0 → 2.1.0 |
| 감쇠 인자 미세 조정, 버그 수정 | Patch | 2.1.0 → 2.1.1 |

### 6.4 플러그인 상수 정의

```typescript
// src/types/common.ts 또는 src/constants.ts
export const EXPECTED_ARCHITECTURE_VERSION = '2.0.0';
```

---

## 7. 테스트 전략

### 7.1 단위 테스트

| 대상 | 테스트 항목 | 파일 |
|------|-----------|------|
| Frontmatter 스키마 | `sub_layer` 필드 파싱, 서브레이어별 필드 유효성, 정합성 검증 (L3A+org_type → 에러) | `src/types/__tests__/frontmatter.spec.ts` |
| SubLayer 타입 | L3SubLayer/L5SubLayer 열거, 디렉토리 매핑 정확성 | `src/types/__tests__/common.spec.ts` |
| VaultScanner | L3 서브디렉토리 인식, L5 buffer/boundary 인식, 루트 파일 기본값 처리 | `src/core/__tests__/vault-scanner.spec.ts` |
| DocumentParser | `sub_layer` 파싱, 서브레이어별 필드 추출, 하위 호환 (sub_layer 없는 문서) | `src/core/__tests__/document-parser.spec.ts` |
| GraphBuilder | `CROSS_LAYER` 엣지 생성, L5-Boundary 연결, 기존 엣지와 공존 | `src/core/__tests__/graph-builder.spec.ts` |
| WeightCalculator | 서브레이어별 감쇠 인자 반환, sub_layer 미지정 시 기존 값 | `src/core/__tests__/weight-calculator.spec.ts` |
| SpreadingActivation | L3A/B/C 차등 감쇠, L5-Boundary Bridge 확산, L5-Buffer 최소 확산 | `src/core/__tests__/spreading-activation.spec.ts` |

### 7.2 통합 테스트

| 대상 | 테스트 항목 | 파일 |
|------|-----------|------|
| 마이그레이션 | v1.0.0 fixture → v2.0.0 변환 정확성, 분류 알고리즘, WAL 원자성 | `src/core/__tests__/architecture-migrator.spec.ts` |
| 마이그레이션 롤백 | 중단 시 완전 롤백, 부분 실행 후 롤백 | 동일 파일 |
| MCP 도구 | `buffer_promote` 승격 + frontmatter 갱신, `boundary_create` 생성 + CROSS_LAYER 엣지 | `src/mcp/__tests__/` |

### 7.3 Fixture 구조

```
tests/fixtures/v1-vault/
├── 01_Core/
│   └── values.md
├── 02_Derived/
│   └── skills/typescript.md
├── 03_External/
│   ├── alice.md              # person 필드 → L3A로 분류 기대
│   ├── company-x.md          # domain_type: company → L3B로 분류 기대
│   └── react-hooks.md        # 주제 지식 → L3C로 분류 기대
├── 04_Action/
│   └── 2026/03/session.md
├── 05_Context/
│   ├── persons/alice.md
│   └── domains/typescript.md
└── .maencof-meta/
    └── version.json           # { "architecture_version": "1.0.0" }
```

### 7.4 E2E 테스트

- 마이그레이션 스킬 전체 워크플로우: v1.0.0 vault → `/maencof:migrate` 실행 → v2.0.0 vault 검증
- SessionStart Hook: version.json 불일치 감지 → 마이그레이션 제안 표시 검증

---

## 8. 위험 요소 및 완화 방안

| 위험 | 심각도 | 완화 방안 |
|------|--------|----------|
| **데이터 손실** — 마이그레이션 중 파일 이동 실패 | 높음 | WAL 기반 트랜잭션 + 롤백 메커니즘. 마이그레이션 전 자동 백업 권고 |
| **잘못된 L3 분류** — 인물/조직/주제 오분류 | 중간 | L3C(topical)를 안전한 기본값으로 사용. 분류 불확실 문서는 별도 리포트. 수동 재분류 지원 (`maencof_move` + `sub_layer` 변경) |
| **하위 호환성 파괴** — sub_layer 미존재 문서 | 중간 | `sub_layer` 필드를 모든 곳에서 optional 처리. 미존재 시 기존 동작 100% 유지. 점진적 마이그레이션 허용 |
| **그래프 캐시 불일치** — 마이그레이션 후 경로 변경 | 중간 | 마이그레이션 완료 후 `.maencof-index/snapshot.json` 삭제 → 다음 `kg_build`에서 자동 전체 재구축 |
| **backlink 인덱스 깨짐** — 이동된 파일 경로 불일치 | 중간 | 마이그레이션 마지막 단계에서 backlink-index.json 전체 재구축 |
| **L5 기존 데이터 충돌** — persons/domains와 buffer/boundary 혼재 | 낮음 | 기존 persons/, domains/를 이동하지 않음. buffer/, boundary/만 신규 생성. 기존 L5 문서는 그대로 유지 |
| **성능 저하** — 서브레이어별 감쇠 인자 조회 비용 | 낮음 | 감쇠 인자 테이블을 Map으로 사전 구성. O(1) 조회. SA 엔진 전체 성능에 영향 없음 |
| **마이그레이션 중단** — 대규모 vault에서 타임아웃 | 낮음 | WAL 기반으로 재개 가능. 중단 지점부터 이어서 실행 |
