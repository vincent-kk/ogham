---
created: 2026-02-28
updated: 2026-02-28
tags: [link, backlink-index, relative-path, graph, edge-type]
layer: design-area-1
---

# 링크 정책 — 단방향 링크 + Backlink 인덱스 + 엣지 유형

## 목적

문서 간 관계를 명시적 아웃바운드 링크와 자동 backlink 인덱스로 표현하여,
그래프 탐색 가능성과 파일 시스템 런타임 제약을 양립시킨다.

관련 문서: [트리-그래프 이중 구조](./03-tree-graph-structure.md) | [기억 라이프사이클](./13-memory-lifecycle.md) | [코어 모듈](./08-core-modules.md)

---

## 1. 링크 타입

### Outbound 링크 (명시적)
- 형태: `[텍스트](상대경로)` — Markdown 표준 상대 경로
- 규칙: 절대 경로 금지. `./파일명.md` 또는 `../경로`

### Backlink 인덱스 (자동)
- 위치: `.maencof-meta/backlink-index.json`
- 형태: `{ "대상경로": ["출처경로1", "출처경로2"] }`
- 갱신: MCP 도구가 CRUD 시 자동 재구축

---

## 2. GraphBuilder 엣지 유형 교차 참조

링크 정책의 LINK 엣지는 검색 엔진 [코어 모듈](./08-core-modules.md) C3(GraphBuilder)의
4개 엣지 유형 중 하나이다:

| 엣지 유형 | 출처 | 가중치 기반 |
|----------|------|-----------|
| `LINK` | 마크다운 링크 | SCS |
| `PARENT_OF` | 디렉토리 계층 | Wu-Palmer |
| `CHILD_OF` | 디렉토리 계층 | Wu-Palmer |
| `SIBLING` | 동일 디렉토리 | Wu-Palmer |

---

## 3. Layer별 링크 방향성 제약

| 출발 → 대상 | 허용 | 설명 |
|-------------|------|------|
| Layer 1 → 어디든 | 금지 | Hub 노드는 참조되기만 함 |
| Layer 2 ↔ Layer 2 | 허용 | 내재화 지식 간 양방향 |
| Layer 2 → Layer 1 | 허용 | 파생→핵심 참조 |
| Layer 3 → Layer 2,1 | 허용 | 외부→내부 참조 |
| Layer 4 → Layer 1,2,3 | 허용 | 행동의 근거 추적 |
| 상위 → Layer 4 | 금지 | 휘발성 노드 참조 불가 |

---

## 4. Backlink 인덱스 갱신 트리거

- Create → 새 outbound 링크를 인덱스에 추가
- Update → 변경된 링크 분석 후 재구축
- Delete → 해당 문서가 출처인 항목 제거

---

## 5. 링크 유효성 검증

**실행 시점**: SessionStart Hook

1. backlink-index.json의 경로를 파일 시스템과 대조
2. 존재하지 않는 파일 참조 → `.maencof-meta/broken-links.json` 기록
3. 세션 시작 시 경고 및 수정 제안
