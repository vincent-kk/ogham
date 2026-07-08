# 마이그레이션과 호환성

## 엔진 플래그 전략

`QueryOptions.engine?: 'legacy' | 'qga'` 를 도입하고 기본값은 상수 `SA_DEFAULT_ENGINE`이 결정한다. 도입 시점의 기본값은 `legacy`이며, **T1 골든셋에서 QGA-SA가 baseline을 상회하는 것이 확인된 커밋에서 `qga`로 전환**한다. legacy 경로는 최소 한 릴리즈 동안 롤백 수단으로 유지한 뒤 처분을 별도 결정한다.

두 엔진은 동일한 `ActivationResult[]` 계약을 반환하므로 queryEngine 이후 단계(Layer 필터, path-exact 제외, 캐시, 컨텍스트 조립)는 무변경이다.

## API 호환 표

| 표면                    | 변경                                                               | 호환성                                                             |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `QueryOptions`          | `engine` 필드 추가(optional)                                       | additive — 기존 호출 무영향                                        |
| `QueryResult`           | 외형 불변                                                          | 완전 호환                                                          |
| `ActivationResult.hops` | 의미 재정의: BFS 홉 → 최초 도달 반복 번호                          | 표시용 필드 — kg_context의 relation 설명("2-hop")은 동일 형식 유지 |
| `ActivationResult.path` | QGA 경로에서는 `[seed, …, node]` 최강 기여 경로 대신 `[node]` 축약 | path 소비처는 표시용뿐(전수 확인 완료) — 각주 표기                 |
| `maxHops` 옵션          | QGA에서 T로 매핑(`T = ceil(maxHops·3/5)` 아닌 프리셋 표 사용)      | kg_context 프리셋 재매핑: FOCUSED T=2 / BALANCED T=3 / BROAD T=4   |
| MCP 도구 스키마         | 무변경                                                             | kg_search/kg_context/kg_suggest_links 입력 계약 그대로             |

## maencof-lens 영향

lens는 maencof의 핸들러를 얇게 감싸므로(동일 엔진 상속) 코드 변경 없이 자동 수혜한다. 확인 항목은 하나다: lens의 `graphCache.loadGraph()` 재수화 경로가 QGA-SA가 사용하는 자료구조(adjacencyList/edgeWeightMap/edgeTypeMap/invertedIndex)를 이미 전부 재구성하므로(`hydrateRuntimeMaps` 공유), **추가 필드를 도입하지 않는 한** 호환된다. QGA-SA는 신규 영속 필드를 도입하지 않는다(차수는 인접 리스트에서 즉시 계산, 게이트는 쿼리 시 계산). 변경은 additive 원칙을 유지한다.

## 단계별 계획

| 단계 | 내용                                                              | 게이트                                            |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------- |
| S0   | T1 평가 하네스(픽스처+골든셋+지표+ratchet) + legacy baseline 기록 | 하네스 자체 테스트 통과                           |
| S1   | QGA-SA 코어(01장) + `engine` 플래그 배선                          | 골든셋에서 legacy 대비 개선 확인 → 기본 엔진 전환 |
| S2   | RRF 융합 + node specificity 시드 가중(02장)                       | ratchet 상향                                      |
| S3   | recency(`updated`) → frequency(`accessed_count` 계측)             | ratchet 상향 + 시간 조작 테스트                   |
| S4   | BM25F 시드 스코어링                                               | ratchet 상향                                      |
| S5   | Louvain(스텁 대체) + MMR 다양성                                   | modularity + 다양성 지표                          |
| S6   | tagSimilarity SIMILAR 엣지 + suggest-links 강화                   | 고아율 감소, 골든셋 간접 연상 개선                |

각 단계는 독립 PR 단위이며, 실패 시 해당 단계만 되돌린다(엔진 플래그·융합 리스트 구성이 롤백 지점).

## 사문 코드 처분 (별도 제안)

본 설계와 독립적으로 발견된 정리 대상 — 별도 변경으로 제안하며 본 이행에 묶지 않는다:

- `dagConverter` + `CYCLE_WEIGHT`: 라이브 소비처 0. QGA-SA는 순환 내성이 있어 DAG 변환 필요성이 더 낮아진다.
- 적응형 SA(B1) 블록: MCP 경로에서 발동 불가(§00). S1의 프리셋 재매핑이 대체.
- `weightCalculator` 헤더 주석("P0: 균일 1.0")과 실제 동작(경로 근사 비균일)의 모순 — 주석 정정.
- `normalizeWeights`: 라이브 미호출.
