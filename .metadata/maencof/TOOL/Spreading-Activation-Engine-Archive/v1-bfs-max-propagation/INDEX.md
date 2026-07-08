# v1 — BFS Max-Propagation Constrained Spreading Activation

## 개요

maencof의 초대 검색 엔진. Collins & Loftus(1975) 연상 기억 + Crestani(1997) constrained SA 계열의 BFS max-전파 구현으로, 2026-07-08 QGA-SA(v2)에 기본 엔진 지위를 넘기고 코드베이스에서 이탈했다(설계 근거: [QGA-SA 설계 스위트](../../Query-Gated-Accumulative-Spreading-Activation/INDEX.md) 00장).

핵심 의미론: `A[j] = max(A[j], A[i]·W[i,j]·d)` — threshold 0.1, maxHops 5, maxActiveNodes 100, SIBLING fanout 상한 8(pagerank 상위), 시드 캡(키워드 30/폴더 25), path 배열 순환 방지, 적응형 파라미터(B1).

## 디렉토리 구성

| 경로       | 내용                                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source/`  | 이탈 시점(브랜치 maencof/search-arg, 2026-07-08) TS 원본 verbatim 스냅샷 — 참조 정본. `core/spreadingActivation.ts`(엔진), `search/queryEngine.ts`(legacy 분기·적응형 포함 시드 해석), `constants/` |
| `runtime/` | 의존성 0의 Node ESM 이식본 — 실행 정본. 그래프 구축→가중치→PageRank→시드 해석→v1 SA→랭킹 전 파이프라인 + 동결 픽스처(42노드)·골든셋(12쿼리)·지표                                                    |

## 벤치마크 실행

```bash
node runtime/run.mjs            # 지표 측정 + 동결 기준선 대조(FIDELITY 게이트) + 지연
node runtime/run.mjs --verbose  # 쿼리별 상세
```

Node.js ≥ 20만 필요 — 저장소 빌드·설치·타 모듈 import 없음.

## 동결 지표 (2026-07-08, kg_search 기본 파라미터)

| 지표      | 값                                                        | v2 QGA-SA(동시점)   |
| --------- | --------------------------------------------------------- | ------------------- |
| nDCG@10   | **0.8991**                                                | 0.9529              |
| Recall@10 | **0.8383**                                                | 0.8938              |
| MRR       | **1.0**                                                   | 1.0                 |
| 지연      | ~0.03 ms/query (42노드 픽스처) · ~0.90 ms (1000노드 합성) | ~0.49 ms (1000노드) |

쿼리별 상세(약점 프로필 — v2 개발의 근거): `hub-noise-review` recall 0.333(cross-folder LINK 0-가중), `task-context` ndcg 0.440(동일 원인), `hub-tag-security` recall 0.476(k=10 상한 구조적).

## 이식 충실도

`run.mjs`는 측정 지표가 동결 기준선과 ±0.0001 내 일치하지 않으면 exit 1 — 이식본이 TS 원본과 동일 동작임을 실행마다 재증명한다. 이식 범위 주석: 픽스처가 사용하지 않는 RELATIONSHIP/CROSS_LAYER 엣지 빌더는 제외(픽스처에 person/connectedLayers 노드가 없어 원본에서도 빈 결과), queryCache 제외(벤치마크 무관). 그 외 로직은 타입 제거 외 무변경.

## 은퇴 사유 요약

max-전파(다경로 증거 비합산)·쿼리-맹목 확산·pagerank 하드 캡 3종의 원리적 한계 — 진단·문헌 근거·대체 설계는 [QGA-SA 설계 스위트](../../Query-Gated-Accumulative-Spreading-Activation/INDEX.md) 00–01장 참조.
