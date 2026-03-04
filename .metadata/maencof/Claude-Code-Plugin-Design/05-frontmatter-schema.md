---
created: 2026-02-28
updated: 2026-03-04
tags: [frontmatter, yaml, schema, metadata]
layer: design-area-1
---

# Frontmatter 스키마 정의

## 목적

모든 maencof 기억 문서가 동일한 메타데이터 구조를 갖도록 스키마를 정의한다.
MCP 도구와 검색 엔진이 일관되게 파싱·검색·필터링할 수 있게 한다.

관련 문서: [원자적 문서 정책](./04-atomic-document-policy.md) | [메타데이터 전략](./12-metadata-strategy.md) | [기억 라이프사이클](./13-memory-lifecycle.md)

---

## 1. 필수 필드

| 필드 | 타입 | 형식 | 설명 |
|------|------|------|------|
| `created` | string | YYYY-MM-DD | 최초 생성일. 변경 금지 |
| `updated` | string | YYYY-MM-DD | 마지막 수정일. MCP 자동 갱신 |
| `tags` | string[] | 배열 | 중복 감지·검색 기반. 최소 1개 필수 |
| `layer` | number | 1-5 | 문서의 Layer 속성. 디렉토리와 일치 필요 |

검증: Create/Update 시 MCP 도구가 필수 필드 존재 검사. 누락 시 오류 반환.

---

## 2. 선택 필드

| 필드 | 타입 | 용도 |
|------|------|------|
| `title` | string | 메타데이터 검색용 제목 |
| `source` | string | 외부 출처 (Layer 3용) |
| `expires` | string | 만료일 YYYY-MM-DD (Layer 4용) |
| `confidence` | number | 내재화 신뢰도 0.0~1.0 (Layer 3→2 전이 기준) |
| `accessed_count` | number | 세션별 참조 횟수 누적 |
| `schedule` | string | Lazy Scheduling 표현식 |
| `person` | PersonSchema | 인물 참조 (Layer 4/5용) |
| `domain` | string | 도메인 식별자 (크로스 레이어) |
| `domain_type` | enum | 도메인 유형 분류 (크로스 레이어) |
| `sub_layer` | string | 서브레이어 식별 ('A'\|'B'\|'C' for L3, 'buffer'\|'boundary' for L5) |
| `person_ref` | string | L5 인물 메타데이터 참조 (L3A용) |
| `trust_level` | number | 관계 신뢰도 0.0~1.0 (L3A용) |
| `expertise_domains` | string[] | 해당 인물의 전문 분야 (L3A용) |
| `org_type` | enum | 조직 유형: company\|community\|team\|institution (L3B용) |
| `membership_status` | enum | 소속 상태: active\|inactive\|alumni (L3B용) |
| `ba_context` | string | 조직의 Ba 맥락 설명 (L3B용) |
| `topic_category` | enum | 주제 유형: interest\|academic\|technology\|literature (L3C용) |
| `maturity` | enum | 성숙도: raw\|developing\|mature (L3C용) |
| `buffer_type` | enum | 버퍼 유형: snippet\|conversation\|unclassified (L5-Buffer용) |
| `promotion_target` | string | 승격 대상 레이어 제안 (L5-Buffer용) |
| `boundary_type` | enum | 경계 유형: syntactic\|semantic\|pragmatic (L5-Boundary용) |
| `connected_layers` | string[] | 연결된 서브레이어 목록 (L5-Boundary용) |

---

## 3. 구조 메타데이터와의 정합성

검색 엔진([메타데이터 전략](./12-metadata-strategy.md))의 Phase 1 구조 메타데이터는
Frontmatter 필드를 직접 활용한다:

| Frontmatter 필드 | 검색 엔진 용도 |
|-----------------|--------------|
| `tags` | 키워드 매칭, 중복 감지 (Jaccard) |
| `layer` | Layer별 감쇠 인자 적용, 필터링 |
| `created`/`updated` | 시간 기반 정렬, 신선도 판단 |

---

## 4. Layer-디렉토리 정합성 규칙

| `layer` | `sub_layer` | 올바른 디렉토리 | 불일치 시 |
|---------|-------------|--------------|----------|
| 1 | (없음) | `01_Core/` | 경고 (저장은 허용) |
| 2 | (없음) | `02_Derived/` | 경고 |
| 3 | A | `03_External/relational/` | 경고 |
| 3 | B | `03_External/structural/` | 경고 |
| 3 | C | `03_External/topical/` | 경고 |
| 3 | (없음) | `03_External/` (레거시) | 경고 + sub_layer 지정 권장 |
| 4 | (없음) | `04_Action/` | 경고 |
| 5 | buffer | `05_Context/buffer/` | 경고 |
| 5 | boundary | `05_Context/boundary/` | 경고 |
| 5 | (없음) | `05_Context/persons/` 또는 `05_Context/domains/` | 경고 |

## 5. 검증 시점

| 시점 | 검증 내용 |
|------|----------|
| Create | 필수 필드 존재, `layer` 유효성, `tags` 비어있지 않음 |
| Update | `updated` 자동 갱신, 필수 필드 누락 경고 |
| SessionStart | `expires` 경과 문서 탐지, `confidence` 전이 후보 탐지 |
