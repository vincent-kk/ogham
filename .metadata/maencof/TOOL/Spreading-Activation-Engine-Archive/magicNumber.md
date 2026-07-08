maencof 플러그인(plugins/maencof)의 QGA-SA 검색 알고리즘 매직넘버를 골든셋 벤치마크로 수렴시키는 작업을 해줘.

## 배경 (읽고 시작)
- 설계 정본: `.metadata/maencof/TOOL/Query-Gated-Accumulative-Spreading-Activation/` (특히 03-benchmark-and-evaluation.md의 "매직넘버 수렴 루프" 절)
- 평가 하네스: `plugins/maencof/src/__tests__/eval/` — fixtureVault.ts(합성 vault), goldenSet.ts(골든 쿼리셋), paramSweep.eval.test.ts(그리드 스윕), crossEngine.eval.test.ts(아카이브 v1 대조), evalRunner.ts(공용 측정)
- 매직넘버 상수: `plugins/maencof/src/constants/spreadingActivation.ts` — QGA_ITERATIONS(T), QGA_UPDATE_THRESHOLD(τ), QGA_GATE_FLOOR(γ). alphaBase는 기본 1.0.
- 튜닝 오버라이드는 `QueryOptions.tuning`(eval 전용, MCP 미노출)로 이미 파라미터화됨.

## 해줄 일
1. `yarn maencof eval`을 실행해 현재 스윕 결과를 보여줘. `[eval:sweep]` 라인에서 현행 기본값 순위와 상위 조합, `[eval:cross]`에서 라이브 vs 아카이브 v1 delta를 확인.
2. 골든셋(goldenSet.ts)이 지금 몇 세대인지, 판별력이 약한 유형이 있는지 진단하고, 내가 별도로 준 실사용 불만 사례(있으면 아래에 붙임)를 graded relevance 쌍으로 추가해줘. 없으면 현 골든셋의 커버리지 공백(예: 간접 연상·허브 억제·다경로 수렴)을 메우는 판별 사례를 2~4개 제안하고 내 승인을 받은 뒤 추가.
3. 골든셋을 추가했으면 baseline을 같은 변경에서 재기록(`MAENCOF_EVAL_UPDATE_BASELINE=1 yarn maencof eval`) — 케이스 추가로 인한 분모 변화는 회귀가 아님.
4. 스윕을 다시 돌려 상위 조합이 **여러 골든셋 세대에 걸쳐 안정적으로** 기본값을 이기는지 판단해줘. `MAENCOF_EVAL_SWEEP_REPORT=<scratch경로>`로 전체 JSON을 남겨 세대 간 비교에 써도 됨.

## 승격 규칙 (엄수)
- 단일 세대 우승만으로 상수를 바꾸지 마. 과적합 방지가 핵심. 여러 세대에서 안정적으로 앞서는 조합만 `constants/spreadingActivation.ts`에 승격하고, 같은 커밋에서 ratchet baseline을 재기록해.
- 승격이 아직 이르면 상수를 건드리지 말고, 현재까지의 세대별 순위 근거와 "몇 세대 더 필요한지"를 보고만 해줘.

## 제약
- v1 엔진(`.metadata/.../Spreading-Activation-Engine-Archive/`)은 동결본이야 — 절대 수정하지 말고 벤치마크 대조로만 소비해.
- 작업은 적절히 나눠서 커밋해. co-author 붙이지 마.
- 끝나면 `yarn maencof test:run` / `yarn maencof typecheck` / `yarn lint` 통과 확인하고, bridge 재빌드본은 커밋하지 마(내가 직접 커밋).

## (선택) 이번에 추가할 실사용 불만 사례
- 쿼리: "<검색어>" → 기대: <나왔어야 할 문서> / 실제: <안 나옴 or 순위 밀림>