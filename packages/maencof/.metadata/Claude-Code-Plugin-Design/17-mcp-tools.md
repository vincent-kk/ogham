---
created: 2026-02-28
updated: 2026-02-28
tags: [mcp, tools, crud, search, knowledge-graph]
layer: design-area-4
---

# MCP 도구 명세 — CRUD 5개 + 검색 5개

## 개요

maencof의 MCP 도구는 지식 트리 CRUD와 그래프 검색을 통합한다.
모든 도구는 단일 요청-응답 사이클 내에서 완결된다.

관련 문서: [플러그인 아키텍처](./16-plugin-architecture.md) | [코어 모듈](./08-core-modules.md)

---

## 1. 지식 트리 CRUD 도구

| 도구 | 설명 | 주요 파라미터 |
|------|------|-------------|
| `maencof_create` | 새 기억 문서 생성 | layer, tags, content |
| `maencof_read` | 문서 읽기 + 관련 컨텍스트 | path, depth (SA 홉) |
| `maencof_update` | 기존 문서 수정 | path, content |
| `maencof_delete` | 문서 삭제 (backlink 경고 포함) | path, force |
| `maencof_move` | Layer 간 문서 이동 (전이) | path, target_layer |

### CRUD 공통 사후 처리
- backlink-index.json 자동 갱신
- Frontmatter `updated` 자동 갱신
- `.maencof/stale-nodes.json`에 무효화 노드 추가

---

## 2. 검색 도구

| 도구 | 설명 | Phase |
|------|------|-------|
| `kg_search` | 시드 + SA 기반 관련 문서 검색 | 1 |
| `kg_navigate` | 특정 노드의 이웃 (인/아웃 링크, 부모/자식) 조회 | 1 |
| `kg_context` | 토큰 최적화 컨텍스트 블록 반환 | 1 |
| `kg_status` | 인덱스 상태, 노드/엣지 수, 빌드 시간 | 1 |
| `kg_community` | 커뮤니티별 요약 조회 | 2+ |

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

---

## 3. 접근 제어

모든 MCP 도구는 Progressive Autonomy Level([22-autonomy-levels.md](./22-autonomy-levels.md))과
에이전트 접근 매트릭스([19-agents.md](./19-agents.md))를 준수한다.
