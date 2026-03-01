---
created: 2026-02-28
updated: 2026-02-28
tags: [core-modules, vault-scanner, graph-builder, dag-converter, spreading-activation]
layer: design-area-2
---

# 코어 모듈 — 7개 핵심 구성요소

## 개요

7개 핵심 모듈은 단일 책임을 가지며, VaultScanner를 제외한 순수 알고리즘 계층은
파일시스템 I/O에 직접 의존하지 않는다.

관련 문서: [보조 모듈](./09-auxiliary-modules.md) | [확산 활성화](./10-spreading-activation.md) | [데이터 파이프라인](./11-data-pipeline.md)

---

## 모듈 정의

### C1. Vault Scanner
- 책임: 디렉토리 순회, 파일 목록 + mtime 수집, 변경 감지
- 특성: 유일하게 파일시스템 I/O를 직접 수행하는 core 모듈

### C2. Document Parser
- 책임: Frontmatter 추출, 헤더 기반 섹션 분리, 링크 추출, 키워드 추출
- 설계: 페이지 중심 모델. 100줄 원자적 문서 = 청크

### C3. Graph Builder
- 책임: 파싱 결과 → 노드(문서) + 엣지(링크, 디렉토리 관계) 통합 그래프 구성
- 엣지: `LINK`, `PARENT_OF`, `CHILD_OF`, `SIBLING` ([트리-그래프 이중 구조](./03-tree-graph-structure.md))

### C4. DAG Converter
- 책임: 순환(cycle) 탐지 + DAG 변환
- 알고리즘: DFS 역방향 엣지 식별 + smartAE 휴리스틱 (최소 정보 손실)

### C5. Weight Calculator
- 책임: 엣지 가중치(Wu-Palmer, SCS) + 노드 점수(CF, PageRank) 계산
- Wu-Palmer: 디렉토리 트리 LCS 깊이 기준
- PageRank: 전체 그래프 노드별 중요도

### C6. Spreading Activation Engine
- 책임: 시드 노드에서 확산 활성화 실행, 관련 노드 탐색
- 핵심: `A[j] = sum(A[i] * W[i,j] * d)` (d = 감쇠 인자)
- 상세: [확산 활성화](./10-spreading-activation.md)

### C7. Community Detector
- 책임: 커뮤니티 탐지, 커뮤니티별 요약 메타데이터 생성
- 구현: Phase 2+ (MVP 미포함). Leiden/Louvain 알고리즘

---

## 의존 관계

```
VaultScanner → DocumentParser → GraphBuilder → DAGConverter → WeightCalculator
                                                                      |
                                                          +-----------+-----------+
                                                          v                       v
                                                SpreadingActivation      CommunityDetector
```

**핵심 원칙**: `core/` 모듈은 VaultScanner 외에 파일시스템 I/O 직접 의존 없음.
영속화는 MetadataStore, 오케스트레이션은 QueryEngine이 담당.
