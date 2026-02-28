---
created: 2026-02-28
updated: 2026-02-28
tags: [tree, graph, dual-structure, convergent, divergent]
layer: design-area-1
---

# 트리-그래프 이중 구조 설계

## 목적

coffaen 지식 저장소의 두 가지 구조적 차원 — 디렉토리 트리(수렴)와 링크 그래프(발산) —
을 정의하고, 각 구조의 역할과 상호 보완 관계를 명시한다.

관련 문서: [5-Layer 지식 모델](./02-knowledge-layers.md) | [링크 정책](./06-link-policy.md) | [코어 모듈](./08-core-modules.md)

---

## 1. 이중 구조 개요

| 구조 | 방향성 | 역할 | 특성 |
|------|--------|------|------|
| **디렉토리 트리 (Tree)** | 수렴적 | 지식의 경계 설정, 하향식 탐색 진입점 | Entropy 통제, 분류 체계 |
| **링크 그래프 (Graph)** | 발산적 | 카테고리 초월 의미론적 관계 형성 | 다중 홉 추론, 발산형 사고 |

트리는 "이 문서가 어디에 속하는가"를, 그래프는 "이 문서가 무엇과 연결되는가"를 표현한다.

---

## 2. 트리 구조 — 디렉토리 계층

디렉토리 트리는 5-Layer 모델의 물리적 구현이다.

- **PARENT_OF / CHILD_OF**: 디렉토리-파일 또는 디렉토리-디렉토리 계층 관계
- **SIBLING**: 동일 디렉토리 내 문서 관계
- Wu-Palmer 유사도의 계산 기반이 된다 (LCS 깊이 기준)

---

## 3. 그래프 구조 — 링크 관계

마크다운 상대 경로 링크가 형성하는 의미론적 네트워크이다.

- **LINK**: `[텍스트](상대경로)` 형태의 명시적 아웃바운드 링크
- **Backlink**: LINK의 역방향. `.coffaen-meta/backlink-index.json`에서 자동 관리
- 확산 활성화(SA) 탐색의 기본 경로가 된다

---

## 4. 이중 구조의 상호 보완

```
트리(수렴): 01_Core/ ← 02_Derived/skills/ ← 02_Derived/skills/programming/
                    (계층적 분류, 범위 제한)

그래프(발산): values.md ←→ decision-making.md ←→ project-x.md
                    (의미론적 연결, 범위 확장)
```

**검색에서의 통합**: GraphBuilder(C3)가 두 구조를 하나의 통합 그래프로 병합한다.
트리 엣지(PARENT_OF, SIBLING)와 링크 엣지(LINK)가 동일 그래프에 공존하며,
각 엣지 유형에 차등 가중치를 적용하여 확산 활성화를 실행한다.

---

## 5. 엣지 유형 요약

| 엣지 유형 | 출처 | 방향 | SA 가중치 영향 |
|----------|------|------|---------------|
| `PARENT_OF` | 디렉토리 트리 | 방향 있음 | Wu-Palmer 기반 |
| `CHILD_OF` | 디렉토리 트리 | 방향 있음 | Wu-Palmer 기반 |
| `SIBLING` | 동일 디렉토리 | 무방향 | Wu-Palmer 기반 |
| `LINK` | 마크다운 링크 | 방향 있음 | SCS 기반 |

상세 가중치 설계: [확산 활성화](./10-spreading-activation.md) | [코어 모듈](./08-core-modules.md)
