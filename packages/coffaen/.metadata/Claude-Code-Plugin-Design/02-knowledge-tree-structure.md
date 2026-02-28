---
created: 2026-02-28
updated: 2026-02-28
tags: [knowledge-tree, 4-layer, directory-structure]
layer: design-area-1
---

# 4-Layer 지식 트리 구조 설계

## 목적

coffaen의 기억공간을 4개 계층으로 분리하여, 기억의 휘발성·내재화 수준에 따라
물리적 디렉토리 위치가 의미론적 계층을 표현하도록 한다.

관련 문서: [원자적 문서 정책](./03-atomic-document-policy.md) | [링크 메커니즘](./04-link-mechanism.md) | [Frontmatter 스키마](./05-frontmatter-schema.md)

---

## 1. 기억공간 루트 디렉토리 구조

```
~/.coffaen/               (또는 사용자 지정 경로)
├── 01_Core/              # Layer 1: 핵심 자아 — Hub 노드
├── 02_Derived/           # Layer 2: 내재화/파생 자아 — Cross-linked 노드
│   ├── skills/
│   │   └── programming/
│   └── relationships/
├── 03_External/          # Layer 3: 외부 지식 — Leaf 노드
├── 04_Action/            # Layer 4: 행동/작업 기억 — Volatile 노드
│   ├── 2026/
│   │   └── 02/
└── .coffaen-meta/        # 시스템 메타데이터
    ├── backlink-index.json
    └── trust-level.json
```

---

## 2. Layer별 디렉토리 깊이 제약

| Layer | 최대 깊이 | 구조 | 제약 이유 |
|-------|----------|------|----------|
| Layer 1 (Core) | 1 (평면) | 파일만, 서브디렉토리 없음 | Hub 노드는 단순·불변. 복잡도 최소화 |
| Layer 2 (Derived) | 3 | 카테고리/서브카테고리/파일 | 내재화 지식의 다중 겹 분류 허용 |
| Layer 3 (External) | 1 | 파일만, 서브디렉토리 없음 | 미내재화 지식은 태그로 분류, 계층 불필요 |
| Layer 4 (Action) | 2 | YYYY/MM/ 시간 기반 | 휘발성 기억은 날짜 기준으로만 구분 |

---

## 3. 노드 타입과 역할

### Hub 노드 (Layer 1)
- 예시: `values.md`, `boundaries.md`, `identity.md`
- 역할: 모든 다른 Layer에서 참조되는 근원 노드
- 특성: 아웃바운드 링크 없음, 오직 인바운드만 허용
- 파일 수 제한: 권장 ≤10개 (핵심 가치관만)

### Cross-linked 노드 (Layer 2)
- 예시: `skills/programming/typescript.md`, `relationships/team.md`
- 역할: 내재화된 지식 간 촘촘한 상호 참조
- 특성: Layer 2 내부에서 양방향 링크 허용

### Leaf 노드 (Layer 3)
- 예시: `react-hooks-api.md`, `oauth2-spec.md`
- 역할: 아직 내재화되지 않은 외부 지식 임시 보관
- 특성: Layer 2를 향한 단방향 링크만 허용. `confidence` 필드로 내재화 추적

### Volatile 노드 (Layer 4)
- 예시: `04_Action/2026/02/session-2026-02-28.md`
- 역할: 세션 내 작업 컨텍스트, 진행 중 결정사항
- 특성: 세션 종료 후 Layer 3으로 승격 또는 삭제

---

## 4. `.coffaen-meta/` 시스템 디렉토리

| 파일 | 역할 |
|------|------|
| `backlink-index.json` | 역방향 링크 인덱스. 문서 CRUD 시 자동 갱신 |
| `trust-level.json` | Progressive Autonomy Level 설정 (0-3) |
| `transition-queue.json` | SessionStart 지연 전이 후보 목록 |
| `broken-links.json` | 마지막 세션에서 탐지된 깨진 링크 목록 |

`.coffaen-meta/`는 사용자가 직접 편집하지 않는다. MCP 도구가 전담 관리한다.
