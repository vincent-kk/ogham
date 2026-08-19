---
created: 2026-02-28
updated: 2026-08-19
tags:
  [
    knowledge-layers,
    5-layer,
    directory-structure,
    graph-characteristics,
    archive,
  ]
layer: design-area-1
---

# 5-Layer 지식 모델 — 계층 구조 + 그래프 노드 특성

## 목적

maencof의 기억공간을 5개 계층으로 분리하여, 기억의 휘발성·내재화 수준에 따라
물리적 디렉토리 위치가 의미론적 계층을 표현하도록 한다.

관련 문서: [트리-그래프 이중 구조](./03-tree-graph-structure.md) | [원자적 문서 정책](./04-atomic-document-policy.md) | [Frontmatter 스키마](./05-frontmatter-schema.md)

---

## 1. Layer별 정의 + 그래프 특성

| Layer | 이름                | 역할                              | 그래프 특성        | 서브디렉토리 깊이  |
| ----- | ------------------- | --------------------------------- | ------------------ | ------------------ |
| 1     | Core Identity       | 네트워크 중심 허브, 최다 인바운드 | **Hub 노드**       | 0 (평면)           |
| 2     | Derived Self        | Layer 1 구체화, 복잡한 상호 연결  | **Dense cluster**  | ≤2                 |
| 3A    | External-Relational | 대인 포인터, TMS 기반             | **Pointer 노드**   | 서브레이어 아래 ≤2 |
| 3B    | External-Structural | 조직 맥락, Ba/SECI 기반           | **Context 노드**   | 서브레이어 아래 ≤2 |
| 3C    | External-Topical    | 의미론적 지식, ANT 기반           | **Leaf 노드**      | 서브레이어 아래 ≤2 |
| 4     | Action              | 시간 기반 일시적 활성, 휘발성     | **Volatile 노드**  | ≤2 (YYYY/MM 관례)  |
| 5     | Context (Buffer)    | 미분류 임시 수용소                | **Temporary 노드** | 0 (평면)           |

서브디렉토리 깊이는 레이어 루트(L3 는 서브레이어 루트) 기준 하위 디렉토리 단계 수다 — 0 은 평면.
자유 그룹핑 깊이 한도의 정본은 `MAX_FILENAME_SUBDIR_DEPTH`(= 2), 평면 레이어 목록의 정본은 `FLAT_LAYERS`(둘 다 `plugins/maencof/src/constants/`)다.
Boundary 는 v3 에서 레이어가 아니라 레이어 직교 hub 속성이다 — §3 "Bridge 노드" 참조.

---

## 2. 디렉토리 구조

```
~/.maencof/
├── 01_Core/              # Layer 1: Hub 노드. 파일 ≤10개
├── 02_Derived/           # Layer 2: Dense cluster
│   ├── skills/
│   └── relationships/
├── 03_External/          # Layer 3: Pointer/Context/Leaf 노드
│   ├── relational/       # L3A: 인물, 멘토, 전문가
│   ├── structural/       # L3B: 회사, 커뮤니티, 팀
│   └── topical/          # L3C: 관심사, 기술, 문헌
├── 04_Action/            # Layer 4: Volatile 노드
│   └── 2026/02/
├── 05_Context/           # Layer 5: 미분류 임시 수용소 (평면 — 서브디렉토리 없음)
├── 99_Archive/           # 그래프 외 서고 — 인덱싱 대상 아님 (아래 참조)
└── .maencof-meta/        # 시스템 메타데이터
```

### 그래프 외 서고와 경쟁 스펙트럼

검색 소비자가 후보 전체를 읽는 LLM이므로 목적함수는 **토큰 예산 내 클러스터 커버리지**다.
개별 항목이 질의 대상이 되는가에 따라 경쟁권이 3계급으로 갈린다:

| 계급          | 위치                  | 경쟁권          | 예                              |
| ------------- | --------------------- | --------------- | ------------------------------- |
| 간행물/원자료 | `99_Archive/` (서고)  | 0표 — 그래프 밖 | 뉴스레터 수집 원문, 회의 원자료 |
| 업무 에피소드 | L3/L4 + `cluster_key` | 스레드당 1표    | 메일·Jira·일정 스레드           |
| 정제 지식     | L1/L2                 | 문서당 1표      | 결정·원칙 문서                  |

"레이어 외 디렉토리는 그래프에서 무시"는 우연(frontmatter 검증 실패)이 아니라 **계약**이다:
스캔은 레이어 디렉토리 allowlist(`VAULT_SCAN_LAYER_PATTERNS`)로 한정되고, 노드 빌드는
경로 첫 세그먼트 게이트(`isLayerDirPath`)가 2차로, 인덱스 역직렬화 게이트가 3차로 막는다.
따라서 **vault 루트의 유효 frontmatter 문서도 그래프에 들어가지 않는다** (allowlist의 의도된 결과).
`99_Archive/` 문서는 명시 경로 read 로만 접근한다.

vault 서고 `99_Archive/`와 시스템 보관소 `.maencof-meta/archive/`는 **별개 개념**이다 —
전자는 사용자가 두는 그래프 외 원자료 서고, 후자는 `archiveExpired` 훅이 만료 L4 정본을
옮기는 시스템 영역(스텁의 `archive_path`가 가리키는 곳)이다.

---

## 3. 노드 타입과 역할

**Hub 노드 (Layer 1)**: `values.md`, `boundaries.md` 등. 아웃바운드 링크 없음, 인바운드만 허용.

**Dense cluster (Layer 2)**: `skills/programming/typescript.md` 등. Layer 2 내부 양방향 링크 허용.

**Pointer 노드 (Layer 3A)**: `person-mentor-alice.md` 등. 인물 프로파일, `expertise_domains` 태그. Layer 2 향한 단방향 + 허브 양방향.

**Context 노드 (Layer 3B)**: `org-company-x.md` 등. 조직 환경, Ba 맥락. Layer 2 향한 단방향 + 허브 양방향.

**Leaf 노드 (Layer 3C)**: `topic-react-hooks.md` 등. 순수 개념/사실. `confidence`로 내재화 추적. Layer 2 향한 단방향.

**Volatile 노드 (Layer 4)**: `session-2026-02-28.md` 등. 세션 종료 후 Layer 3A/B/C 승격 또는 삭제.

**Temporary 노드 (Layer 5)**: `buf-snippet-2026-03-04.md` 등. 미분류 임시 저장. 만료 가능. 승격 대상 서브레이어 제안. 다른 레이어가 참조하지 않는다.

**Bridge 노드 (허브)**: `hub: true` 를 선언한 L1~L4 문서. 레이어와 직교하는 속성이며, 태그가 겹치는 노드들과 `CROSS_LAYER` 로 교차 연결한다. 높은 fan-out.

---

## 4. `.maencof-meta/` 시스템 디렉토리

| 파일                    | 역할                             |
| ----------------------- | -------------------------------- |
| `backlink-index.json`   | 역방향 링크 인덱스               |
| `trust-level.json`      | Progressive Autonomy Level (0-3) |
| `transition-queue.json` | SessionStart 지연 전이 후보      |
| `broken-links.json`     | 깨진 링크 목록                   |

`.maencof-meta/`는 사용자가 직접 편집하지 않는다. MCP 도구가 전담 관리한다.

---

## 5. `.maencof/` 검색 엔진 캐시

| 파일            | 역할                                  |
| --------------- | ------------------------------------- |
| `index.json`    | 그래프 구조 (노드, 엣지, 인접 리스트) |
| `weights.json`  | 사전 계산 가중치 (엣지별, 노드별)     |
| `snapshot.json` | 마지막 빌드 파일 스냅샷               |

`.maencof/` 전체를 삭제해도 원본 마크다운에서 완전 재빌드 가능 (원칙 5).
