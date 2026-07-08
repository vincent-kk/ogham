# 시드·랭킹 계층 설계

확산 코어(01장)를 감싸는 전처리(시드)·후처리(랭킹) 계층의 변경을 정의한다. 코어와 독립적으로 단계 도입이 가능하다(04장 S2–S4).

## 시드 가중: node specificity

현행 시드 해석의 매칭 품질 점수(title-exact 1.0 / title-word 0.8 / tag-exact 0.5 / tag-prefix 0.3)는 유지하되, 허브 노드의 초기 질량을 IDF 유사 가중으로 억제한다(HippoRAG node specificity `s_i = 1/|P_i|`의 차수 기반 대응물).

```
seed_w(v) = matchScore(v) · 1 / log₂(2 + deg(v))
```

정렬·상한(KEYWORD_SEED_CAP=30)은 안전망으로 유지하되, 정렬 키를 pagerank에서 `matchScore → specificity 반영 가중 → id`로 교체한다. 이로써 시드 계층도 증분 후 pagerank staleness에서 벗어난다.

## 최종 랭킹: RRF 융합

현행 "SA score 내림차순, 동률 시 pagerank" 단일 랭킹을 **Reciprocal Rank Fusion**(Cormack et al., SIGIR 2009)으로 교체한다.

```
RRF(d) = Σ_{r ∈ R} 1 / (60 + rank_r(d))
R = { rank_SA, rank_lexical, rank_recency }
```

- `rank_SA`: QGA-SA 활성값 순위
- `rank_lexical`: 시드 매칭 점수 순위(후속 S4에서 BM25F 연속 점수로 승격)
- `rank_recency`: 아래 개인화 점수 순위(신호 부재 시 융합에서 제외)

RRF는 순위만 사용하므로 이질적 점수 스케일(활성 0–1, BM25 무상한, 지수 감쇠)의 정규화·가중 튜닝이 불필요하며, k=60은 SIGIR 2009 이래 표준값이다. 융합 대상 리스트가 1개뿐이면 그대로 통과시킨다(하위 호환).

## Recency/Frequency 개인화

개인 지식 볼트는 "살아있는 기억"이므로 최근성·사용 빈도가 관련성의 독립 신호다. 두 단계로 도입한다.

**1단계 — recency (즉시 가능)**: frontmatter `updated`는 이미 파싱된다. Ebbinghaus 간이형을 적용한다.

```
r(v) = exp(−Δt(updated_v) / S),  S = 30일
```

**2단계 — frequency (계측 후)**: 스키마에 이미 존재하는 `accessed_count` 슬롯을 kg_search/kg_context 히트 시 증가시키도록 계측한 뒤, ACT-R base-level activation으로 승격한다.

```
B(v) = ln(1 + Σ_j Δt_j^{-0.5})    (d=0.5, ACT-R 표준)
```

접근 이력 타임스탬프 배열이 과하면 MemoryBank식 근사(`accessed_count`가 강도 S를 증가 — spacing effect)로 대체한다. 어느 형태든 **랭킹 융합의 한 리스트**로만 참여시키고 확산 코어에는 개입시키지 않는다 — 신호 오염 시 융합에서 빼는 것만으로 롤백된다.

L4_ACTION(할 일·진행 중 작업)이 최대 수혜 계층이며, L1_CORE(정체성)는 recency와 무관하게 seed/pin 경로로 보호된다.

## BM25F 시드 스코어링 (후속 S4)

이산 matchScore를 필드 가중 BM25F 연속 점수로 승격한다.

```
tf_eff(t, v) = 2.0·tf_title(t,v) + 1.0·tf_tags(t,v)
score(v) = Σ_t IDF(t) · tf_eff / (tf_eff + k₁·(1−b+b·len_norm))
```

invertedIndex를 그대로 사용하되 term별 문서 빈도(DF)를 인덱스 빌드 시 함께 적재한다. 외부 의존성 없이 ~100줄 자체 구현이 가능하며(minisearch 동형), 다토큰 phrase 보너스·weakest-link 로직은 BM25F 점수 위 보정으로 이관한다.

## 다양성 재랭킹 (후속 S5, 커뮤니티 탐지와 결합)

Louvain 커뮤니티 라벨이 준비되면 MMR(Carbonell & Goldstein, SIGIR 1998)로 상위 결과의 커뮤니티 편중을 억제한다.

```
MMR = argmax_{d ∈ R∖S} [ λ·rel(d) − (1−λ)·max_{d'∈S} same_community(d,d') ],  λ = 0.7
```

SIBLING 클리크 도배의 상위 개념(동일 주제 도배)을 해결하며, kg_context의 토큰 예산을 주제적으로 넓게 쓰게 한다.
