# 01. 시스템 구성요소

## 개요

연구 보고서의 6개 알고리즘 단계를 7개 핵심 구성요소로 전환한다. 각 구성요소는 단일 책임을 가지며, 순수 알고리즘 계층(core/)은 파일시스템 I/O에 직접 의존하지 않는다.

## 구성요소 정의

### C1. Vault Scanner

- **책임**: 마크다운 저장소 디렉토리 순회, 파일 목록 + mtime 수집, 변경 감지
- **입력**: 저장소 루트 경로, 이전 스냅샷(선택)
- **출력**: 현재 스냅샷(파일 목록, mtime), 변경 세트(추가/수정/삭제)
- **연구 보고서 대응**: [02장 증분 데이터 수집](../Markdown-Graph-Knowledge-Discovery-Algorithm/02-knowledge-graph-indexing-workflow.md)
- **특성**: 유일하게 파일시스템 I/O를 직접 수행하는 core 모듈

### C2. Document Parser

- **책임**: 마크다운 파싱 -- Frontmatter 추출, 헤더 기반 섹션 분리, 상대 경로 링크 추출, 키워드/엔티티 추출(규칙 기반)
- **입력**: 파일 경로, 파일 내용(문자열)
- **출력**: 파싱된 문서(Frontmatter, 섹션 목록, 링크 목록, 키워드/엔티티)
- **연구 보고서 대응**: [01장 데이터 모델링](../Markdown-Graph-Knowledge-Discovery-Algorithm/01-data-modeling-and-preprocessing.md), [02장 계층적 청킹](../Markdown-Graph-Knowledge-Discovery-Algorithm/02-knowledge-graph-indexing-workflow.md)
- **설계 결정**: 페이지 중심 모델 채택. 100줄 이하 원자적 문서이므로 문서 = 청크 등식이 성립한다

### C3. Graph Builder

- **책임**: 파싱 결과로부터 노드(문서) + 엣지(링크, 디렉토리 계층 관계) 통합 그래프 구성
- **입력**: 파싱된 문서 배열, 디렉토리 트리 구조
- **출력**: 지식 그래프(노드 맵, 엣지 배열, 인접 리스트)
- **연구 보고서 대응**: [01장 계층적 아그리게이션](../Markdown-Graph-Knowledge-Discovery-Algorithm/01-data-modeling-and-preprocessing.md)
- **엣지 유형**:
  - `LINK`: 마크다운 상대 경로 링크 (`[text](path)`)
  - `PARENT_OF` / `CHILD_OF`: 디렉토리 계층 관계
  - `SIBLING`: 동일 디렉토리 내 문서 관계

### C4. DAG Converter

- **책임**: 그래프의 순환(cycle) 탐지 및 비순환 방향 그래프(DAG)로 변환
- **입력**: 지식 그래프
- **출력**: DAG + 제거된 엣지 목록 + 탐지된 순환 목록
- **연구 보고서 대응**: [03장 순환 탐지와 DAG 변환](../Markdown-Graph-Knowledge-Discovery-Algorithm/03-cycle-detection-and-dag-conversion.md)
- **알고리즘**: DFS 기반 역방향 엣지 식별 + smartAE 휴리스틱으로 최소 정보 손실 달성

### C5. Weight Calculator

- **책임**: 엣지 가중치(Wu-Palmer, SCS)와 노드 점수(CF, PageRank) 계산
- **입력**: DAG, 디렉토리 트리 구조
- **출력**: 가중치가 부여된 그래프(엣지별 가중치, 노드별 점수)
- **연구 보고서 대응**: [05장 의미론적 가중치 설계](../Markdown-Graph-Knowledge-Discovery-Algorithm/05-semantic-weight-design.md)
- **가중치 체계**:
  - **Wu-Palmer 유사도**: 디렉토리 트리에서 두 노드의 최하위 공통 조상(LCS) 깊이 기준
  - **SCS (Semantic Connectivity Score)**: 두 노드 간 경로 수와 길이 종합
  - **CF (Concept Frequency)**: 특정 개념의 저장소 내 출현 빈도
  - **PageRank**: 전체 그래프의 노드별 중요도

### C6. Spreading Activation Engine

- **책임**: 시드 노드로부터 확산 활성화 실행, 관련 노드 탐색
- **입력**: 가중치 그래프, 시드 노드 배열, 설정(발화 임계값, 감쇠 인자, 최대 홉)
- **출력**: 활성화 결과(노드별 활성화 값, 활성화 경로)
- **연구 보고서 대응**: [04장 확산 활성화 모델](../Markdown-Graph-Knowledge-Discovery-Algorithm/04-spreading-activation-model.md)
- **핵심 수식**: `A[j] = sum(A[i] * W[i,j] * d)` (d = 감쇠 인자)
- **제어 메커니즘**:
  - 발화 임계값(Firing Threshold): 활성화 값이 임계값 이상일 때만 확산
  - 감쇠 인자(Decay Factor): 홉마다 에너지 감소
  - 최대 활성화 제한: 노드별 활성화 값을 1.0으로 캡핑

### C7. Community Detector

- **책임**: 조밀한 하위 그래프(커뮤니티) 탐지, 커뮤니티별 요약 메타데이터 생성
- **입력**: 가중치 그래프
- **출력**: 커뮤니티 맵(커뮤니티 목록, 노드-커뮤니티 매핑)
- **연구 보고서 대응**: [06장 커뮤니티 탐지](../Markdown-Graph-Knowledge-Discovery-Algorithm/06-hybrid-search-architecture.md)
- **알고리즘**: Leiden 또는 Louvain
- **구현 단계**: Phase 2 이후 (초기 MVP에서는 미포함)

## 보조 구성요소

### Query Engine

- **책임**: 쿼리 파싱, 시드 노드 선정, 확산 활성화 오케스트레이션, 결과 랭킹
- **계층**: `search/` -- 핵심 알고리즘(core/) 위의 오케스트레이션 계층

### Context Assembler

- **책임**: 검색 결과를 토큰 최적화된 컨텍스트 블록으로 조립
- **핵심 가치**: AI 에이전트에게 최소 토큰으로 최대 맥락을 전달
- **출력 형태**: 문서 경로 + 요약 + 관계 설명 + 활성화 점수

### Metadata Store

- **책임**: 사전 계산된 메타데이터의 영속화(직렬화/역직렬화)
- **저장 위치**: `.maencof/` 디렉토리 하위
- **형식**: JSON (디버깅 용이성, 인간 가독성, 외부 의존성 제로)

### Incremental Tracker

- **책임**: 파일 mtime 기반 변경 감지, 부분 재인덱싱 범위 계산
- **전략**: 변경 파일의 1-hop 이웃만 가중치 재계산, 전역 메트릭(PageRank)은 다음 전체 빌드 시 갱신

## 의존 관계

```
VaultScanner --> DocumentParser --> GraphBuilder --> DAGConverter --> WeightCalculator
                                                                          |
                                                              +-----------+-----------+
                                                              v                       v
                                                    SpreadingActivation      CommunityDetector
                                                              |                       |
                                                              +-----------+-----------+
                                                                          v
                                                                    QueryEngine
                                                                          |
                                                                          v
                                                                   ContextAssembler
```

**핵심 원칙**: `core/` 모듈은 VaultScanner를 제외하고 파일시스템 I/O에 직접 의존하지 않는다. 영속화는 `index/`(MetadataStore, IncrementalTracker)가 담당하고, 오케스트레이션은 `search/`(QueryEngine, ContextAssembler)가 담당한다.
