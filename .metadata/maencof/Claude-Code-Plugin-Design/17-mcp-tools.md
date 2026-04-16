---
created: 2026-02-28
updated: 2026-04-16
tags: [mcp, tools, crud, search, knowledge-graph, insight, claudemd]
layer: design-area-4
---

# MCP 도구 명세 — CRUD 5개 + 검색 6개 + 캡처 2개 + CLAUDE.md 3개 + 운영 2개 (총 18개)

## 개요

maencof의 MCP 도구는 지식 트리 CRUD, 그래프 검색, 인사이트 캡처, CLAUDE.md 섹션 관리,
세션 캐시 운영을 통합한다. 모든 도구는 단일 요청-응답 사이클 내에서 완결된다.

관련 문서: [플러그인 아키텍처](./16-plugin-architecture.md) | [코어 모듈](./08-core-modules.md) | [스킬 명세](./18-skills.md)

---

## 1. 지식 트리 CRUD 도구 (5)

| 도구 | 설명 | 주요 파라미터 |
|------|------|-------------|
| `create` | 새 기억 문서 생성 | layer, tags, content, title |
| `read` | 문서 읽기 + 관련 컨텍스트 | path, depth (SA 홉) |
| `update` | 기존 문서 수정 | path, content |
| `delete` | 문서 삭제 (backlink 경고 포함) | path, force |
| `move` | Layer 간 문서 이동 (전이) | path, target_layer |

### CRUD 공통 사후 처리
- `backlink-index.json` 자동 갱신
- Frontmatter `updated` 자동 갱신
- `.maencof/stale-nodes.json`에 무효화 노드 추가

---

## 2. 지식 그래프 검색 도구 (6)

| 도구 | 설명 | Phase |
|------|------|-------|
| `kg_build` | 전체/증분 인덱스 구축 | 1 |
| `kg_search` | 시드 + SA 기반 관련 문서 검색 | 1 |
| `kg_navigate` | 특정 노드의 이웃 (인/아웃 링크, 부모/자식) 조회 | 1 |
| `kg_context` | 토큰 최적화 컨텍스트 블록 반환 | 1 |
| `kg_status` | 인덱스 상태, 노드/엣지 수, 빌드 시간 | 1 |
| `kg_suggest_links` | 기존 문서 간 잠재 링크 후보 제안 (`knowledge-connector` 소비) | 1 |

### kg_search 파라미터
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| seed | string[] | — | 시드 노드 (경로 또는 키워드) |
| max_results | number | 10 | 최대 반환 수 |
| decay | number | 0.7 | 감쇠 인자 |
| threshold | number | 0.1 | 발화 임계값 |
| max_hops | number | 5 | 최대 홉 수 |

### kg_context 파라미터
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| query | string | — | 검색 쿼리 |
| token_budget | number | 2000 | 토큰 예산 |
| include_full | boolean | false | 상위 N개 전문 포함 |

### Phase 2+ 예약 (현재 미구현)
커뮤니티 탐지(`kg_community`), 벡터 임베딩 기반 유사도 등은 Phase 2+에서 도입 가능.
로드맵: [25-design-decisions.md](./25-design-decisions.md).

---

## 3. 캡처 도구 (2)

| 도구 | 설명 | 소비자 |
|------|------|-------|
| `capture_insight` | InsightCategoryFilter 기반 인사이트 캡처 | 대화 규율(Socratic Elenchus, think, insight skill) |
| `boundary_create` | L5-Boundary 전용 문서 생성 경로 (교차 레이어 커넥터) | `organize`, `knowledge-connector` |

### capture_insight 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| title | string | — | 인사이트 제목 |
| content | string | — | 본문 (Markdown) |
| layer | 2 \| 5 | — | 대상 Layer (2=Derived 내재화, 5=Context 임시) |
| tags | string[] | — | 주제 태그 (최소 1개, `auto-insight` 태그 자동 추가) |
| context | string | — | 캡처를 유발한 대화 맥락 (선택) |
| category | enum | `principle` | `principle` / `refuted_premise` / `ephemeral_candidate` |

### category 의미
- `principle`: 원리/장기 보존 전제. 기본 `accept`. Socratic 또는 think에서 확정된 결론.
- `refuted_premise`: Socratic Phase 2.5.b에서 기각된 전제. 기본 `reject`.
- `ephemeral_candidate`: ToT 중간에서 버려진 후보. 기본 `reject`.

### boundary_create 파라미터
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| title | string | — | 경계 객체(Boundary) 제목 |
| source_layers | array | — | 연결 대상 L3 서브레이어 목록 (예: ["3A", "3C"]) |
| content | string | — | 경계 객체 본문 |

---

## 4. CLAUDE.md 관리 도구 (3)

사용자 프로젝트 `CLAUDE.md` 섹션을 섹션 마커 기반으로 비파괴 관리.

| 도구 | 설명 |
|------|------|
| `claudemd_merge` | 섹션 마커(`<!-- maencof:begin -->` ~ `<!-- maencof:end -->`) 사이 내용을 덮어쓰기 하되 다른 섹션은 보존 |
| `claudemd_read` | 섹션 단위 조회 |
| `claudemd_remove` | 섹션 전체 제거 |

`configurator` 에이전트 및 `instruct` / `lifecycle` 스킬이 호출한다. 파일 I/O는 모두 MCP 도구 경유.

---

## 5. 운영 도구 (2)

| 도구 | 설명 |
|------|------|
| `dailynote_read` | 일일 노트 조회 (L5-Buffer 하위의 날짜별 노트) |
| `context_cache_manage` | `.maencof-meta/` 하위 세션·컨텍스트 캐시 수명 관리 (만료 삭제, 목록) |

---

## 6. 접근 제어

모든 MCP 도구는 Progressive Autonomy Level([22-autonomy-levels.md](./22-autonomy-levels.md))과
에이전트 접근 매트릭스([19-agents.md](./19-agents.md))를 준수한다.

### InsightCategoryFilter 정책

`capture_insight`의 기본 수용/거부는 `.maencof-meta/dialogue-config.json::insight.category_filter`가
결정한다.

기본값:
- `principle: true` (accept)
- `refuted_premise: false` (reject)
- `ephemeral_candidate: false` (reject)

요청된 카테고리가 `false`로 설정된 경우 도구는 `success: false` 메시지로 거부하며, 사용자는
`/maencof:maencof-insight --category <principle|refuted|ephemeral> --accept`로 필터를 열 수 있다.

`insight-injector` NotificationOutput 훅은 동일 정책의 활성 카테고리 목록을 XML 태그에 노출한다:
```xml
<auto-insight status="active" sensitivity="medium" captured="3/10" allowed-categories="principle" />
```

Socratic Elenchus Phase 2.5.b에서 기각된 전제는 `category=refuted_premise`로 캡처 시도되며,
기본 정책에서는 거부된다. 사용자가 명시적으로 필터를 열었을 때만 L5-Buffer에 보존된다.
상세: [18-skills.md §maencof-refine](./18-skills.md) | [13-memory-lifecycle.md §5](./13-memory-lifecycle.md).
