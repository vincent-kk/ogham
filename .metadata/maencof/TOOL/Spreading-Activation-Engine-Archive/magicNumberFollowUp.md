# QGA-SA 매직넘버 수렴 — 결과 및 후속

[magicNumber.md](./magicNumber.md) 요청에 대한 수렴 실행 기록과 열린 backlog.
설계 정본은 [Query-Gated-Accumulative-Spreading-Activation/03-benchmark-and-evaluation.md](../Query-Gated-Accumulative-Spreading-Activation/03-benchmark-and-evaluation.md).

## 승격 결과

강신호 두 축만 승격, T·α는 불변(약축 과적합 회피):

| 상수 | 이전 | 현행 | 근거 |
| --- | --- | --- | --- |
| QGA_UPDATE_THRESHOLD (τ) | 0.01 | **0.001** | 3데이터셋 공통 knee (그 아래 평탄) |
| QGA_GATE_FLOOR (γ) | 0.3 | **0.5** | 합성 최적 평탄면 [0.4,0.7] 내부 |
| QGA_ITERATIONS (T) | 3 | 3 | 세대 간 방향 불일치(신호 없음) |
| alphaBase (α) | 1.0 | 1.0 | 이미 최적 |

ratchet baseline(17쿼리): nDCG 0.9529(gen0) → 0.9558(gen1 default) → **0.9737**, Recall 0.8938 → **0.9692**.
(아카이브 INDEX.md 의 v2 행 수치 0.9529/0.8938 은 이 튜닝 이전 값 — 갱신 여부는 정책 판단.)

## 방법 (과적합 방지)

- **4 독립 세대 일치**: 합성 gen0(12q)/gen1(17q) + 실볼트 link-prediction 2개(tirnanog 130q, falias 457q, read-only 복사본). τ·γ 단조 주효과가 네 세대 모두 동일 방향, 후보 τ=0.005·γ=0.5 가 전 세대 #2/54.
- **넓힌 τ×γ 스윕**(T=3·α=1.0 고정)으로 그리드 경계 너머 내부 최적 확인: τ=0.001 은 knee(0.0005·0.0002 에서 평탄), γ 는 합성 가드레일에서 [0.4,0.7] 평탄 후 γ=1.0 회귀 → γ=0.5 유지가 정답(link-pred 의 구조 편향에 끌려가지 않음).
- **정성 스팟체크**(실볼트 실제 쿼리 top-10 육안): OLD(τ.01)가 falias 대표 6쿼리 중 5건에서 빈-결과였던 결함을 NEW 가 해소 — 이번 튜닝의 핵심 이득은 랭킹 미세개선이 아니라 고밀도 볼트 재현율 붕괴 복구.

## 열린 후속 (backlog)

1. **고밀도 폴더 노이즈**: 제목 토큰이 이웃과 어휘 불일치 + 대형 폴더에 고-pagerank 문서 밀집 시, γ↑·τ↓ 가 주제 무관 same-folder 문서를 상위에 흘림(tirnanog "Node.js VM 이스케이프" 사례, 링크 0/6). SIBLING 엣지 가중치 또는 `capSeedsByPagerank`/`maxActiveNodes` 를 밀도 반응형으로 별도 수렴할 여지.
2. **실사용 불만 → next-gen 골든셋**: 이번엔 실사용 사례가 없어 합성 판별 케이스로 gen1 을 구성. 아쉬웠던 실제 쿼리를 graded relevance 로 추가해 gen2 로 재수렴하면 저자 편향이 더 줄어든다.
3. **γ>0.5 미탐색 경계**: link-prediction 은 γ→1.0 까지 상승을 원하나 정밀 가드레일(합성)이 불지지. 정식 human-relevance 셋 확보 시 재검토.
4. **T3 정식화**: 두 실볼트 평가는 볼트 자기 링크를 정답으로 쓰는 프록시라 재현율 편향. 사용자가 직접 매긴 relevance 스냅샷(설계서 T3)을 도입하면 정밀도까지 정량 검증 가능.

## 재현 (로컬 러너는 미커밋)

실볼트 러너는 scratch 전용이며 커밋하지 않는다(원본 볼트 무변경, 복사본에만 실행). 재현 시:
- 그래프: `mcp/tools/kgBuild/kgBuild.ts::fullBuild` 를 read-only 복제(scanVault→parseDocument→buildKnowledgeNode→resolveAndAttachLinks→buildGraph→calculateWeights→hydrateRuntimeMaps; MetadataStore 미사용 → 디스크 무기록).
- link-pred 셋: SA 는 outbound 인접만 순회하므로, 각 노드의 **제목을 시드**로, 그 **outbound 링크를 pseudo-relevant(등급 2)** 로 채점(seed 자기 경로는 랭킹에서 제외).
- 그리드: `paramSweep.eval.test.ts` 와 동일 축, tuning 은 `QueryOptions.tuning` 오버라이드.
