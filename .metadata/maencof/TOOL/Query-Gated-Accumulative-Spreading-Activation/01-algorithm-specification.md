# QGA-SA 알고리즘 명세

## 설계 원리

QGA-SA는 QA-SA(arXiv:2606.30133)의 반복형 게이트 확산과 SA-RAG(arXiv:2512.15922)의 clamp 합산을 maencof의 5-Layer 감쇠 의미론과 결합하고, 게이트를 무임베딩 lexical 근사로 대체한 변형이다.

## 확산 수식

시드 집합 S와 쿼리 토큰 집합 Q가 주어질 때, 활성 벡터 a를 T회 동기 반복으로 갱신한다.

```
초기화:  a⁰(v) = seed_w(v)   (v ∈ S),  그 외 0

반복 t = 1..T:
  Δ(j)  = g(j,Q) · Σ_{i ∈ N⁻(j), a(i)>0}  a⁽ᵗ⁻¹⁾(i) · α(i) · Ŵ(i,j)
  a⁽ᵗ⁾(j) = min(1,  a⁽ᵗ⁻¹⁾(j) + Δ(j))     단, Δ(j) < τ 이면 갱신 생략
```

### 구성 요소

**1. 합산-누적 + clamp (G1 해소)**

`a(j) += Σ …` 후 `min(1, ·)`. 다중 시드/경로의 증거가 합류·증폭되며, 상한 1.0과 임계값 τ가 활성 폭발을 막는다. max-전파와 달리 두 시드 모두에 연결된 노드가 한쪽에만 연결된 노드보다 확실히 높은 점수를 받는다. 합산 누적은 순환에 자연 내성이 있으므로(재방문 기여는 α·Ŵ에 의해 기하급수적으로 감쇠) 현행의 경로 배열(path) 추적이 불필요해진다.

**2. 차수 정규화 전이 (G3 해소)**

```
Ŵ(i,j) = W'(i,j) · mult(edgeType(i,j)) / deg_out(i)
W'(i,j) = max(W(i,j), 0.5)   (LINK 엣지에 한함 — QGA_LINK_WEIGHT_FLOOR)
```

LINK 하한은 구현 중 확인된 결함의 v2-국소 보정이다: SCS 경로 근사는 공통 접두사가 없는 cross-folder wikilink의 기본 가중치를 0으로 만드는데, 사용자가 직접 작성한 링크는 최강 신호이므로 폴더 거리와 무관하게 전파되어야 한다. v1 하드카피와 weightCalculator는 건드리지 않는다(격리 원칙).

`deg_out(i)`는 인접 리스트의 라이브 아웃디그리다. 97-형제 클리크의 각 이웃은 자동으로 1/97의 질량만 받는다 — SIBLING top-8 하드 캡이 만들던 8/9번째 형제 간 경계효과가 사라지고, PageRank 사전 계산에 의존하지 않으므로 증분 재인덱싱 후 staleness 결합도 소멸한다. 완화 변형 `/√deg_out(i)`(준-정규화)는 벤치마크 ablation 대상으로 남긴다.

**3. Lexical 게이트 (G2 해소)**

QA-SA의 semantic gate `σ(v)=max(cos(e_v,e_q),0)`를 임베딩 없이 근사한다.

```
g(j,Q) = γ_floor + (1 − γ_floor) · |tokens(j) ∩ Q| / |Q|
```

`tokens(j)`는 invertedIndex와 동일한 토큰화(`tokenizeForInvertedIndex`: title 단어 + tags + mentioned_persons, lowercase)를 재사용해 토큰화 drift를 차단한다. `γ_floor > 0`(기본 0.3)이 게이트의 하한이므로 쿼리와 표면 어휘가 겹치지 않는 노드도 구조 신호만으로 도달 가능하다 — 게이트는 차단기가 아니라 감쇠기다. 시드 자신은 게이트를 거치지 않는다(초기값이므로).

**4. Layer 감쇠 유지 (5-Layer 의미론 보존)**

```
α(i) = α_base · d(layer_i, subLayer_i)
```

`d`는 기존 `getLayerDecay`(L1 0.5 … L5 0.95, sublayer 변형 포함)를 그대로 사용한다. 정체성 코어(L1)에서 좁게, 휘발성 컨텍스트(L5)에서 넓게 퍼지는 기존 설계 의도를 계승한다. `α_base`는 QA-SA의 고정 감쇠(0.7)에 대응하는 전역 스케일이며 기본 1.0(layer 감쇠에 위임)이다.

**5. T-반복 종료 (adaptive 사문 경로 정리)**

BFS 홉 한도 대신 동기 반복 횟수 T가 탐색 반경을 결정한다(QA-SA 기본 T=3). kg_context 프리셋은 T로 재매핑한다: FOCUSED T=2, BALANCED T=3, BROAD T=4. `hops` 필드는 "최초 도달 반복 번호"로 재정의해 API 외형을 유지한다. 실사용에서 발동하지 않던 적응형 SA(B1)는 이 프리셋 재매핑으로 대체·정리한다.

## 파라미터 표

| 파라미터 | 기본값 | 근거 |
| --- | --- | --- |
| T (반복 수) | 3 | QA-SA 기본값; 프리셋 2–4 |
| τ (갱신 임계값) | 0.01 | QA-SA; 합산 누적에서는 낮게 잡아 약신호 합류 허용 |
| γ_floor (게이트 하한) | 0.3 | 구조 탐색 보존; ablation 대상 |
| α_base | 1.0 | layer 감쇠에 위임 |
| maxActiveNodes | 100 | 현행 유지(활성 노드 수 상한) |
| 시드 초기값 | matchScore·specificity | 02장 참조 |

## 의사코드

```
function runAccumulativeActivation(graph, scoredSeeds, queryTokens, params):
  a ← Map();  firstReach ← Map()
  for (v, w) in scoredSeeds: a[v] ← min(1, w);  firstReach[v] ← 0
  gateCache ← Map()   # g(j,Q) 지연 계산 메모
  for t in 1..T:
    frontier ← [v | a[v] > 0]
    Δ ← Map()
    for i in frontier:
      αᵢ ← α_base · layerDecay(i)
      for j in adj[i]:
        Ŵ ← edgeWeight(i,j) · typeMult(i,j) / len(adj[i])
        Δ[j] += a[i] · αᵢ · Ŵ
    for (j, δ) in Δ:
      δ ← δ · gate(j, queryTokens, gateCache)
      if δ < τ: continue
      if j ∉ firstReach: firstReach[j] ← t
      a[j] ← min(1, a[j] + δ)
      if |a| > maxActiveNodes: 최저 활성 노드 제거(evict)
  return sort by a desc, tie → firstReach asc, id asc
```

## 복잡도와 성능 전망

반복당 O(|E_active|) — 활성 프론티어의 아웃엣지 합. 상한은 T·O(|E|)이며 T=3, |E|=26k(실측 vault) 기준 ≤ 80k 곱-합 연산으로 1ms 미만, 5k 노드/500k 엣지 가상 상한에서도 수 ms다. 게이트는 노드당 1회 지연 계산·메모되므로 O(활성 노드 수 × 평균 토큰 수)로 무시 가능하다. 100ms 예산 내 여유가 크다.

## 현행 대비 의미론 변화 요약

| 항목 | 현행(v1) | QGA-SA(v2) |
| --- | --- | --- |
| 누적 | max | sum + clamp 1.0 |
| 허브 억제 | SIBLING top-8 캡(pagerank) | 차수 정규화 `/deg_out` |
| 쿼리 인지 | 시드 단계만 | 전파 단계 lexical 게이트 |
| 순환 처리 | path 배열 추적 | 합산 감쇠 자연 내성(추적 제거) |
| 반경 제어 | maxHops(BFS) | T 반복(동기) |
| pagerank 의존 | 캡 3곳+타이브레이크 | 없음(랭킹 융합에서 선택 사용) |
