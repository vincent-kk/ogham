---
created: 2026-02-28
updated: 2026-02-28
tags: [knowledge-layers, 5-layer, directory-structure, graph-characteristics]
layer: design-area-1
---

# 5-Layer 지식 모델 — 계층 구조 + 그래프 노드 특성

## 목적

coffaen의 기억공간을 5개 계층으로 분리하여, 기억의 휘발성·내재화 수준에 따라
물리적 디렉토리 위치가 의미론적 계층을 표현하도록 한다.

관련 문서: [트리-그래프 이중 구조](./03-tree-graph-structure.md) | [원자적 문서 정책](./04-atomic-document-policy.md) | [Frontmatter 스키마](./05-frontmatter-schema.md)

---

## 1. Layer별 정의 + 그래프 특성

| Layer | 이름 | 역할 | 그래프 특성 | 최대 깊이 |
|-------|------|------|------------|----------|
| 1 | Core Identity | 네트워크 중심 허브, 최다 인바운드 | **Hub 노드** | 1 (평면) |
| 2 | Derived Self | Layer 1 구체화, 복잡한 상호 연결 | **Dense cluster** | 3 |
| 3 | External | 필요시 참조되는 외곽, 단방향 링크 | **Leaf 노드** | 1 (평면) |
| 4 | Action | 시간 기반 일시적 활성, 휘발성 | **Volatile 노드** | 2 (YYYY/MM/) |
| 5 | Context | 맥락 메타데이터, 도메인·인물 정보 | **Metadata 노드** | 2 |

---

## 2. 디렉토리 구조

```
~/.coffaen/
├── 01_Core/              # Layer 1: Hub 노드. 파일 ≤10개
├── 02_Derived/           # Layer 2: Dense cluster
│   ├── skills/
│   └── relationships/
├── 03_External/          # Layer 3: Leaf 노드
├── 04_Action/            # Layer 4: Volatile 노드
│   └── 2026/02/
├── 05_Context/           # Layer 5: Metadata 노드
└── .coffaen-meta/        # 시스템 메타데이터
```

---

## 3. 노드 타입과 역할

**Hub 노드 (Layer 1)**: `values.md`, `boundaries.md` 등. 아웃바운드 링크 없음, 인바운드만 허용.

**Dense cluster (Layer 2)**: `skills/programming/typescript.md` 등. Layer 2 내부 양방향 링크 허용.

**Leaf 노드 (Layer 3)**: `react-hooks-api.md` 등. Layer 2 향한 단방향만. `confidence`로 내재화 추적.

**Volatile 노드 (Layer 4)**: `session-2026-02-28.md` 등. 세션 종료 후 Layer 3 승격 또는 삭제.

**Metadata 노드 (Layer 5)**: `person-alice.md`, `domain-typescript.md` 등. 인물·도메인·환경 맥락 정보. 다른 레이어 문서들이 참조하는 보조 메타데이터.

---

## 4. `.coffaen-meta/` 시스템 디렉토리

| 파일 | 역할 |
|------|------|
| `backlink-index.json` | 역방향 링크 인덱스 |
| `trust-level.json` | Progressive Autonomy Level (0-3) |
| `transition-queue.json` | SessionStart 지연 전이 후보 |
| `broken-links.json` | 깨진 링크 목록 |

`.coffaen-meta/`는 사용자가 직접 편집하지 않는다. MCP 도구가 전담 관리한다.

---

## 5. `.coffaen/` 검색 엔진 캐시

| 파일 | 역할 |
|------|------|
| `index.json` | 그래프 구조 (노드, 엣지, 인접 리스트) |
| `weights.json` | 사전 계산 가중치 (엣지별, 노드별) |
| `snapshot.json` | 마지막 빌드 파일 스냅샷 |

`.coffaen/` 전체를 삭제해도 원본 마크다운에서 완전 재빌드 가능 (원칙 5).
