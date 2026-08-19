---
created: 2026-02-28
updated: 2026-08-19
tags: [data-pipeline, offline, online, incremental, full-build, archive-gate]
layer: design-area-2
---

# 데이터 파이프라인 — 오프라인 vs 온라인

## 개요

검색 엔진의 데이터 흐름은 **오프라인**(사전 처리)과 **온라인**(실시간)으로 분리된다.
분리 근거: 그래프 구축은 O(V+E)~O(V*E)이지만, SA는 시드 수와 홉 수에 비례하여 실시간 가능.

관련 문서: [코어 모듈](./08-core-modules.md) | [보조 모듈](./09-auxiliary-modules.md) | [메타데이터 전략](./12-metadata-strategy.md)

---

## 1. 오프라인 vs 온라인 비교

| 구분        | 오프라인                       | 온라인                             |
| ----------- | ------------------------------ | ---------------------------------- |
| 트리거      | Skill/CLI 명시 호출            | MCP 도구 호출                      |
| 시간 제약   | 수십 초 허용                   | 100ms 이하 목표                    |
| 연산        | 파싱, 그래프 구축, DAG, 가중치 | 시드 선택, SA, 랭킹, 컨텍스트 조립 |
| 데이터 소스 | 원본 마크다운                  | 사전 계산 메타데이터 캐시          |
| 저장        | `.maencof/` JSON               | 메모리 내 캐시                     |

---

## 2. 오프라인: 전체 빌드 (Full Build)

```
1. VaultScanner: 레이어 디렉토리 allowlist 스캔 (mtime + 해시) — 서고·루트 문서 제외
2. DocumentParser: 모든 파일 파싱 (병렬 가능)
3. GraphBuilder: 통합 그래프 구축 (트리+링크 엣지)
4. DAGConverter: 순환 탐지 + DAG 변환 (smartAE)
5. WeightCalculator: 전체 가중치 계산 (WP, SCS, PageRank)
6. CommunityDetector: Phase 2+
7. MetadataStore: .maencof/ JSON 저장
```

---

## 3. 오프라인: 증분 갱신 (Incremental Update)

```
1. VaultScanner: 변경 세트(added/modified/deleted) 계산
2. DocumentParser: 변경 파일만 재파싱
3. GraphBuilder: 부분 그래프 갱신
4. WeightCalculator: 1-hop 이웃 가중치만 재계산
5. MetadataStore: 변경분만 직렬화
```

**타협**: PageRank는 재계산하지 않음 (다음 전체 빌드까지 유지).

---

## 4. 온라인: 로컬 검색 (Local Query)

```
1. QueryEngine: 쿼리 파싱 → 시드 노드 결정
2. SpreadingActivation: 사전 계산 가중치로 SA 실행
3. RelevanceRanker: 활성화 값 + 구조적 근접도 → 최종 순위
4. ContextAssembler: 토큰 예산 내 상위 N개 결과 조립
```

---

## 5. 온라인: 글로벌 검색 (Phase 2+)

커뮤니티 요약 기반 전역적 질문 처리:

1. QueryEngine: 전역 질문 감지
2. CommunityDetector: 사전 계산 커뮤니티 맵 조회
3. ContextAssembler: 커뮤니티 요약 컨텍스트 조립

---

## 6. 그래프 진입 게이트 (3중 방어선)

인덱싱 대상은 레이어 디렉토리(`01_Core` ~ `05_Context`)로 한정된다 — 서고(`99_Archive/`)와
vault 루트 문서는 frontmatter가 유효해도 그래프에 들어가지 않는다.

| 방어선 | 위치                                         | 막는 진입로                               |
| ------ | -------------------------------------------- | ----------------------------------------- |
| 1차    | 스캔 allowlist (`VAULT_SCAN_LAYER_PATTERNS`) | full/incremental 빌드의 파일 수집         |
| 2차    | 노드 빌드 경로 게이트 (`isLayerDirPath`)     | partial reindex 등 스캔 외 노드 생성 경로 |
| 3차    | 역직렬화 게이트 (deserialize 2경로)          | 변경 이전 인덱스의 잔존 노드, lens 재수화 |

게이트는 `posix.normalize` 정규화 후 첫 세그먼트를 검사하며 상향 탈출(`..`)·절대경로를
거부한다. 검증 전용 소비자(read/update/move/delete)는 `allowNonLayerPath` 옵트아웃으로
서고 문서를 계속 읽고 고칠 수 있다 — 그래프에 넣지 않을 뿐이다.
