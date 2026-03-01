---
created: 2026-02-28
updated: 2026-02-28
tags: [data-pipeline, offline, online, incremental, full-build]
layer: design-area-2
---

# 데이터 파이프라인 — 오프라인 vs 온라인

## 개요

검색 엔진의 데이터 흐름은 **오프라인**(사전 처리)과 **온라인**(실시간)으로 분리된다.
분리 근거: 그래프 구축은 O(V+E)~O(V*E)이지만, SA는 시드 수와 홉 수에 비례하여 실시간 가능.

관련 문서: [코어 모듈](./08-core-modules.md) | [보조 모듈](./09-auxiliary-modules.md) | [메타데이터 전략](./12-metadata-strategy.md)

---

## 1. 오프라인 vs 온라인 비교

| 구분 | 오프라인 | 온라인 |
|------|---------|--------|
| 트리거 | Skill/CLI 명시 호출 | MCP 도구 호출 |
| 시간 제약 | 수십 초 허용 | 100ms 이하 목표 |
| 연산 | 파싱, 그래프 구축, DAG, 가중치 | 시드 선택, SA, 랭킹, 컨텍스트 조립 |
| 데이터 소스 | 원본 마크다운 | 사전 계산 메타데이터 캐시 |
| 저장 | `.maencof/` JSON | 메모리 내 캐시 |

---

## 2. 오프라인: 전체 빌드 (Full Build)

```
1. VaultScanner: 전체 파일 목록 수집 (mtime + 해시)
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
