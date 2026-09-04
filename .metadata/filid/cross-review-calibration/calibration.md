# Filid Cross-Review Calibration

이 보정 모음은 `skills/cross-review` 런타임 스킬 트리 밖에 있으며 변경 파일 범위, category routing, 독립 검증, coverage 집계와 verdict 도출을 회귀 검증한다. 보정 실행 중 reviewer와 verifier는 이 디렉터리를 읽지 않는다.

각 실행은 같은 흐름을 쓴다. 한 reviewer가 배정된 파일 그룹을 검사해 후보를 만들고, 별도 verifier가 모든 후보를 독립 판정한다. sealed report만 채점한다.

## Fixtures

| Run | Fixture | Expected verdict | Purpose |
| --- | --- | --- | --- |
| `run-a` | `clean-change.md` | `APPROVED` | 올바른 contract, structure, verification과 구현 변경 |
| `run-b` | `low-only-change.md` | `REQUEST_CHANGES` | canonical warning 하나가 actionable 상태로 남음 |
| `run-c` | `seeded-change.md` | `REQUEST_CHANGES` | 의도적으로 심은 rule 두 개와 `tests/` fractal 승격에서 파생된 candidate 네 개 |
| `run-d` | `contract-change.md` | `REQUEST_CHANGES` | public entry와 DETAIL API 불일치 |
| `run-f` | `genuine-gap.md` | `INCONCLUSIVE` | 변경 파일 증거 누락이 verdict를 보류함 |
| `run-g` | `out-of-scope-certainty.md` | `APPROVED` | 도구 간 중복을 포함한 범위 밖 certainty 5행이 verdict에 닿지 않음 |
| `run-h` | `seeded-bug.md` | `REQUEST_CHANGES` | empty-input boundary bug 하나를 독립 확인함 |

`seeded-violations.md`는 run b, c, d, f, g, h의 answer key다.

`run-c`의 expected candidate는 정확히 6개다. 두 seed rule은 독립 확인하고, 네 derived row는 각각 확인하거나 같은 `INTENT.md` seed에 명시적으로 연결해야 한다. 이 여섯 개 밖의 candidate는 허용하지 않는다.

## Materialization

각 run마다 별도 scratch repository를 만든다.

1. `/tmp/filid-calibration/<pass>/<run>/`을 만든다.
2. `main`을 초기화하고 `clean-change.md`의 base tree를 materialize한 뒤 commit한다.
3. base commit에서 `structure_validate`가 violation 0건을 보고하는지 확인한다. 0이 아니면 materialization 오류이므로 branch를 만들기 전에 바로잡는다.
4. `calib/<run>` branch를 만들고 해당 run의 changed file만 적용해 commit한다.
5. scratch root에서 fresh session을 시작한다.
6. base ref `main`으로 cross-review skill을 실행한다.

`run-g`는 위 2단계에서 fixture 파일을 `main`에 추가한 뒤 base commit을 만들며 branch에는 clean change만 둔다. materialize하기 전에 `out-of-scope-certainty.md`를 읽는다. v6 Step 2 `scope`의 `outOfScopeCount`는 5여야 한다. `structure_validate`의 4행(프로젝트 root 3행과 tokenize test 1행)과 `verification_scan`이 반복하는 tokenize test 1행을 합한 수다. `candidateCount`는 0, `statuses.structure`와 `statuses.verification`은 모두 `ok`, `evidenceComplete`은 `true`여야 하며 최종 verdict는 `APPROVED`다.

보정 문서를 scratch repository로 복사하지 않는다. fixture를 materialize한 session은 정답을 이미 알기 때문에 review를 수행하지 않는다. review state와 snapshot evidence가 같은 committed content를 설명하도록 working tree를 clean하게 유지한다.

## Scoring

- **False positive**: answer-key item과 일치하지 않는 candidate를 verifier가 `CONFIRMED`한다.
- **False negative**: answer-key finding이 candidate set에 없거나 verifier가 `REFUTED`한다.
- **Unjustified inconclusive**: 실제 누락 evidence source 없이 판정 가능한 run이 `INCONCLUSIVE`로 끝난다. 구체적 이유 없이 expected finding이 `INDETERMINATE`에 남아도 포함한다.
- **Suppressed gap**: `run-f`가 `INCONCLUSIVE` 이외 verdict로 끝난다.
- **Coverage miss**: changed checklist entry가 `reviewed` 또는 이유 있는 `skipped`로 닫히지 않는다.

answer key에 없는 candidate를 올바르게 refute한 것은 false positive가 아니다. 의도적으로 판정 불가능한 run이 아니면 expected finding은 모두 confirmed여야 하고, 모든 verification decision은 뒷받침하는 code 또는 canonical evidence를 인용해야 한다.

완전한 pass의 기대 count는 false positive `0`, false negative `0`, unjustified inconclusive `0`, suppressed gap `0`, coverage miss `0`이다.

## Regression Ledger

| Date | Runner | FP | FN | Unjustified Inconclusive | Suppressed Gaps | Coverage Misses | Verdicts a/b/c/d/f/g/h | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| <ISO-8601> | <model or session> | 0 | 0 | 0 | 0 | 0 | APPROVED / REQUEST_CHANGES / REQUEST_CHANGES / REQUEST_CHANGES / INCONCLUSIVE / APPROVED / REQUEST_CHANGES | — |
