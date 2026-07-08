# 쿼리-게이트 누적 확산 활성화(QGA-SA): maencof 지식 그래프 탐색 알고리즘 v2 설계

## 요약

본 설계서는 maencof의 현행 확산 활성화(Spreading Activation) 검색 엔진을 최신 연구(2024–2026)와 운영 vault 실측에 근거해 진단하고, 후속 알고리즘 **QGA-SA(Query-Gated Accumulative Spreading Activation)** 를 명세한다. 핵심 전환은 세 가지다: (1) max-전파를 **합산-누적(clamp 1.0)** 으로 교체해 다경로 증거의 합류를 포착하고, (2) 하드 fanout 캡을 **차수 정규화 전이**로 대체해 허브 지배를 원리적으로 억제하며, (3) 시드 이후 확산이 쿼리와 무관해지는 query-blindness를 **무임베딩 lexical 게이트**로 해소한다. 여기에 RRF 랭크 융합과 ACT-R 계열 recency/frequency 개인화를 랭킹 계층에 도입한다. 모든 요소는 순수 TypeScript·무임베딩·쿼리 시 무LLM·<100ms 제약을 유지하며, 기존 자료구조(adjacencyList/edgeWeightMap/invertedIndex)와 API 외형을 보존한다. 설계의 채택 여부는 결정적 합성 픽스처 기반 골든셋 벤치마크(nDCG@10/Recall@10/MRR)의 **ratchet 게이트**로 판정한다.

## 목차

- [배경과 동기: 현행 알고리즘 진단](./00-background-and-motivation.md) — 현행 파이프라인, 운영 vault 실측(고아율 55%·허브 클리크), 6대 격차(G1–G6), 문헌 대조
- [QGA-SA 알고리즘 명세](./01-algorithm-specification.md) — 확산 수식, lexical 게이트, 차수 정규화, T-반복 종료, 파라미터 표, 의사코드, 복잡도
- [시드·랭킹 계층 설계](./02-seed-and-ranking-layer.md) — node specificity 시드 가중, RRF(k=60) 융합, recency/frequency 개인화, BM25F 승격 경로
- [벤치마크 및 평가 체계](./03-benchmark-and-evaluation.md) — 벤치마크 구성 가능성 검토, 합성 픽스처 설계, 골든셋, 지표 정의, ratchet 운영 규칙
- [마이그레이션과 호환성](./04-migration-and-compatibility.md) — 엔진 플래그 전략, API 호환 표, maencof-lens 영향, 단계별 계획(S0–S6), 사문 코드 처분
- [참고 문헌](./05-references.md) — 검증된 1차 출처 목록(전 항목 실존 확인)
