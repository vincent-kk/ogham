---
created: 2026-02-28
updated: 2026-02-28
tags: [link, backlink-index, relative-path, graph]
layer: design-area-1
---

# 링크 메커니즘 — 단방향 명시적 링크 + Backlink 인덱스

## 목적

문서 간 관계를 명시적 아웃바운드 링크와 자동 생성 backlink 인덱스로 표현하여,
그래프 탐색 가능성을 유지하면서 파일 시스템 기반 런타임 제약을 준수한다.

관련 문서: [지식 트리 구조](./02-knowledge-tree-structure.md) | [기억 라이프사이클](./06-memory-lifecycle.md)

---

## 1. 링크 타입

### Outbound 링크 (명시적)
- **형태**: `[텍스트](상대경로)` — Markdown 표준 상대 경로
- **작성 주체**: 문서 작성자 또는 MCP 도구 (관련 문서 링크 제안 시)
- **규칙**: 절대 경로 사용 금지. 동일 디렉토리는 `./파일명.md`, 상위는 `../`

### Backlink 인덱스 (자동 생성)
- **위치**: `.coffaen-meta/backlink-index.json`
- **형태**: `{ "대상-상대경로": ["출처-상대경로-1", "출처-상대경로-2"] }`
- **갱신 주체**: MCP 도구 (문서 CRUD 발생 시 자동 재구축)
- **용도**: 역방향 참조 조회 — "이 문서를 참조하는 문서 목록"

---

## 2. Layer별 링크 방향성 제약

| 출발 Layer | 대상 Layer | 허용 여부 | 설명 |
|-----------|-----------|----------|------|
| Layer 1 → 어디서든 | 아웃바운드 없음 | 금지 | Hub 노드는 참조되기만 함 |
| Layer 2 ↔ Layer 2 | 양방향 | 허용 | 내재화 지식 간 촘촘한 상호 연결 |
| Layer 2 → Layer 1 | 단방향 | 허용 | 파생 지식이 핵심 자아를 참조 |
| Layer 3 → Layer 2 | 단방향 | 허용 | 내재화 전 단계: 외부 지식이 내부 지식 참조 |
| Layer 3 → Layer 1 | 단방향 | 허용 | 핵심 가치와의 관련성 명시 |
| Layer 4 → Layer 1,2,3 | 아웃바운드 | 허용 | 행동의 근거 추적 (역추적 가능성 확보) |
| 상위 Layer → Layer 4 | 아웃바운드 | 금지 | 휘발성 노드는 영구 지식에 포함 불가 |

---

## 3. Backlink 인덱스 상세

**위치**: `.coffaen-meta/backlink-index.json`

**포맷**:
```json
{
  "01_Core/values.md": [
    "02_Derived/skills/programming/typescript.md",
    "04_Action/2026/02/session-2026-02-28.md"
  ],
  "02_Derived/skills/programming/typescript.md": [
    "02_Derived/skills/programming/react.md"
  ]
}
```

**갱신 트리거**:
- 문서 Create → 새 outbound 링크를 인덱스에 추가
- 문서 Update → 변경된 링크 분석 후 인덱스 재구축
- 문서 Delete → 해당 문서가 출처인 모든 항목 제거

**성능 고려**: 인덱스 전체를 재구축하는 것이 단순하며,
Hook 타임아웃 내 완료 가능한 파일 수(≤1000개) 범위에서 허용.

---

## 4. 링크 유효성 검증

**실행 시점**: SessionStart Hook

**동작**:
1. backlink-index.json의 모든 경로를 파일 시스템과 대조
2. 존재하지 않는 파일을 참조하는 링크 → 깨진 링크 목록화
3. `.coffaen-meta/broken-links.json`에 기록
4. 세션 시작 시 사용자에게 경고 및 수정 제안

**자동 수정 범위**: 파일명 변경으로 인한 단순 경로 불일치만 자동 수정 제안.
파일 삭제로 인한 깨진 링크는 사용자 판단 필요.
