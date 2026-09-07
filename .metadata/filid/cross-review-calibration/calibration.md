# Filid Cross-Review Calibration

이 보정 모음은 `skills/cross-review` 런타임 스킬 트리 밖에 있으며 변경 파일 범위, category routing, 독립 검증, coverage 집계와 verdict 도출을 회귀 검증한다. 보정 실행 중 reviewer와 verifier는 이 디렉터리를 읽지 않는다.

각 실행은 같은 흐름을 쓴다. 한 reviewer가 배정된 파일 그룹을 검사해 후보를 만들고, 별도 verifier가 모든 후보를 독립 판정한다. sealed report만 채점한다.

## Fixtures

| Run     | Fixture                     | Expected `filesTotal` | Expected verdict  | Purpose                                                                                                 |
| ------- | --------------------------- | --------------------: | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `run-a` | `clean-change.md`           |                     2 | `APPROVED`        | 올바른 contract, structure, 구현과 verification 변경                                                    |
| `run-b` | `low-only-change.md`        |                     3 | `REQUEST_CHANGES` | clean change에 더한 canonical warning 하나가 actionable 상태로 남음                                     |
| `run-c` | `seeded-change.md`          |                     4 | `REQUEST_CHANGES` | clean change에 의도적으로 심은 rule 두 개와 `tests/` fractal 승격에서 파생된 candidate 네 개            |
| `run-d` | `contract-change.md`        |                     3 | `REQUEST_CHANGES` | clean change에 더한 public entry와 DETAIL API 불일치                                                    |
| `run-f` | `genuine-gap.md`            |                     3 | `INCONCLUSIVE`    | 동적 parameter table의 indeterminate case count가 canonical evidence를 미완료로 만들어 verdict를 보류함 |
| `run-g` | `out-of-scope-certainty.md` |                     2 | `APPROVED`        | clean change 밖 도구 간 중복을 포함한 범위 밖 certainty 5행이 verdict에 닿지 않음                       |
| `run-h` | `seeded-bug.md`             |                     2 | `REQUEST_CHANGES` | clean change의 구현을 대체한 empty-input boundary bug 하나를 독립 확인함                                |

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

`run-g`는 위 2단계에서 fixture 파일을 `main`에 추가한 뒤 base commit을 만들며 branch에는 두 파일로 이루어진 clean change만 둔다. materialize하기 전에 `out-of-scope-certainty.md`를 읽는다. v7 Step 1 `review_state(prepare)` 응답 data의 `outOfScopeCount`는 5여야 한다. `structure_validate`의 4행(프로젝트 root 3행과 tokenize test 1행)과 `verification_scan`이 반복하는 tokenize test 1행을 합한 수다. `candidateCount`는 0, `statuses.structure`와 `statuses.verification`은 모두 `ok`, `evidenceComplete`은 `true`여야 하며 최종 verdict는 `APPROVED`다.

보정 문서를 scratch repository로 복사하지 않는다. fixture를 materialize한 session은 정답을 이미 알기 때문에 review를 수행하지 않는다. review state와 snapshot evidence가 같은 committed content를 설명하도록 working tree를 clean하게 유지한다.

## Scoring

- **False positive**: answer-key item과 일치하지 않는 candidate를 verifier가 `CONFIRMED`한다.
- **False negative**: answer-key finding이 candidate set에 없거나 verifier가 `REFUTED`한다.
- **Unjustified inconclusive**: 실제 누락 evidence source 없이 판정 가능한 run이 `INCONCLUSIVE`로 끝난다. 구체적 이유 없이 expected finding이 `INDETERMINATE`에 남아도 포함한다.
- **Suppressed gap**: `run-f`가 `INCONCLUSIVE` 이외 verdict로 끝난다.
- **Coverage miss**: changed checklist entry가 `reviewed` 또는 이유 있는 `skipped`로 닫히지 않는다.

answer key에 없는 candidate를 올바르게 refute한 것은 false positive가 아니다. 의도적으로 판정 불가능한 run이 아니면 expected finding은 모두 confirmed여야 하고, 모든 verification decision은 뒷받침하는 code 또는 canonical evidence를 인용해야 한다.

완전한 pass의 기대 count는 false positive `0`, false negative `0`, unjustified inconclusive `0`, suppressed gap `0`, coverage miss `0`이다.

**정정된 answer key (2026-09-04).** `seeded-bug.md`는 run-h의 seeded finding을 `DEF-2` 1건으로 적지만, 같은 diff의 새 테스트 `src/slugify/tests/slugify.spec.ts:14-16`이 절단 경계의 후행 `-` 때문에 실패하는 두 번째 결함이 실재한다. 채점은 run-h 결함 2건(빈 입력 `TypeError`, 절단 경계 trailing separator)을 정답으로 쓰고, 규칙 인용은 각각 `DEF-3`/`DEF-2`, `DEF-1`/`DEF-2` 계열을 인정한다(실행마다 분류가 달라진다). run-a는 결함 0건이며 severity가 warning이라도 confirmed finding은 모두 false positive다. 루브릭 채점은 `harness/rubric.md`(5항목 0–3점)를 쓴다.

## baseline-v7

`baseline-v7/<run>/`은 출처 커밋 `279b912b`에서 실행한 v7 r1의 a·b·c·d·f·g·h 산출물을 보존한다. G6의 결정론 fold replay가 이 기준선의 verdict와 Confirmed·Verification Log ID 집합을 비교한다.

state·evidence·report의 스크래치 projectRoot 접두는 `<PROJECT_ROOT>`로 치환한다. `opinions/*.json`은 validation hash 결합을 유지하도록 원본 바이트 그대로 보존하며, 각 run의 manifest는 sourceRun·sourceCommit·placeholder를 기록한다. 실행 환경에 종속된 session·brief·diff는 보존하지 않는다.

## Harness

`harness/`는 fixture materialize·스킬 실행·측정 도구다(`harness/README.md`). 아래 측정은 모두 이 하네스로 sonnet / effort medium, cross-review effort medium(2 round), fixture당 1회 실행한 값이다.

## Measurements

### v7 r1 (commit `279b912b`, 2026-09-04) 대 ocr o3

| subject | run | result 세그먼트 | turns | 벽시계(초) | 비용(USD) | tool call | verdict             |
| ------- | --- | --------------: | ----: | ---------: | --------: | --------: | ------------------- |
| v7      | a   |               1 |    17 |        118 |     0.570 |        24 | APPROVED            |
| v7      | b   |               3 |    21 |        187 |     0.715 |        33 | REQUEST_CHANGES     |
| v7      | c   |               3 |    19 |        285 |     1.040 |        38 | REQUEST_CHANGES     |
| v7      | d   |               1 |    23 |        379 |     0.993 |        46 | REQUEST_CHANGES     |
| v7      | f   |               1 |    18 |        398 |     0.916 |        37 | INCONCLUSIVE        |
| v7      | g   |               3 |    19 |        168 |     0.676 |        27 | APPROVED            |
| v7      | h   |               4 |    28 |        518 |     1.248 |        49 | REQUEST_CHANGES     |
| ocr     | a   |               1 |     8 |         33 |     0.170 |         7 | 지적 없음           |
| ocr     | h   |               1 |    14 |         72 |     0.280 |        13 | High 1건 + fix 적용 |

a+h 합계: v7 $1.819 / 636초 / 73 tool call, ocr $0.450 / 105초 / 20 — 비용 4.0×, 벽시계 6.1×. 루브릭(정정된 answer key): v7 a 15 / h 14, ocr a 11 / h 11. ocr는 행·규칙 인용과 파일별 커버리지 마감이 없고 심사 대상 소스를 수정했다.

### v7.1 r2 (commit `ce12b4db`, 2026-09-05) — cross-review 7.1.0

| run | 비용(USD) | 벽시계(초) | 오케스트레이터 API 호출 | 액터 API 호출 | verdict                       | 루브릭 |
| --- | --------: | ---------: | ----------------------: | ------------: | ----------------------------- | -----: |
| a   |     0.425 |         76 |                       8 |             4 | APPROVED (0건)                |     15 |
| h   |     0.712 |        191 |                      14 |            16 | REQUEST_CHANGES (DEF-3·DEF-2) |     14 |

a+h 합계 $1.137 / 267초 — v7 r1 대비 −37.5% / −58%, ocr 대비 2.5× / 2.5×. 오케스트레이터 호출 수는 ocr와 같다(8/14; 액터당 spawn·launch 확인 턴·validate 3회 + 고정 5회). 낭비 호출 0회. b·c·d·f·g는 라이브 재실행 대신 `baseline-v7` 산출물의 결정론 fold replay와 scope probe(candidate 수 a·d·h 0, b 1, c 6, f 2, g 0)로 확인했다. 루브릭은 익명화된 4개 report(v7·v7.1의 a·h)의 독립 맹검 채점과 20셀 모두 일치했다.

비용 구조(정가 추정, 실제 청구보다 8–11% 높음): 오케스트레이터 a $0.27 / h $0.32(호출당 컨텍스트 약 44–47K, 첫 호출 base 약 40K — ocr 37K), 액터 a $0.19 / h $0.47(round 1 0.15 · round 2 0.20 · verify 0.12). round 2는 h에서 두 번째 결함을 찾은 load-bearing 라운드였다(v7 r1에서는 round 1이 둘 다 찾음 — 표집 변동).

### File Contents 인라인 실험 (기각, 2026-09-05)

같은 commit의 작업 트리에 배정 파일의 committed blob 전문을 브리프에 인라인한 변형을 두 pass 측정했다. 자세한 것은 `../records/2026-09-05-cross-review-file-contents-inline-rejected.md`.

| pass | a 비용/벽시계/액터 호출 | h 비용/벽시계/액터 호출 |            a+h | 액터 소스 읽기 | 정답지 밖 finding                 | 루브릭 a / h |
| ---- | ----------------------- | ----------------------- | -------------: | -------------: | --------------------------------- | -----------: |
| r3   | $0.786 / 202초 / 11     | $0.736 / 188초 / 16     | $1.521 / 390초 |              1 | a `DEF-21` warning → verdict 반전 |       9 / 14 |
| r4   | $0.352 / 74초 / 3       | $0.702 / 186초 / 12     | $1.053 / 260초 |              0 | h `DEF-18` warning (round 2)      |      15 / 12 |

## baseline-v71

`baseline-v71/{a,h}/`은 commit `ce12b4db`(cross-review 7.1.0)에서 실행한 v71 r2의 a·h 산출물이다. 보존 규약은 `baseline-v7`과 같다(state·evidence·report의 scratch projectRoot는 `<PROJECT_ROOT>`, `opinions/*.json`은 원본 바이트, manifest에 sourceRun·sourceCommit·sourcePass·placeholder). 이것이 현재 품질 기준점이다: a APPROVED·Confirmed 0, h REQUEST_CHANGES·Confirmed `R01-001`(빈 입력 TypeError, `DEF-3`)·`R01-002`(절단 경계, `DEF-2`), 두 report `worktree | clean`, 루브릭 a 15 / h 14.

## Regression Ledger

| Date       | Runner                                                                                                    | FP             | FN  | Unjustified Inconclusive | Suppressed Gaps | Coverage Misses | Verdicts a/b/c/d/f/g/h                                                                                     | Notes |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------------- | --- | ------------------------ | --------------- | --------------- | ---------------------------------------------------------------------------------------------------------- | ----- |
| 2026-09-04 | sonnet/medium · v7 r1 · commit `279b912b` (7 run 실측)                                                    | 0              | 0   | 0                        | 0               | 0               | APPROVED / REQUEST_CHANGES / REQUEST_CHANGES / REQUEST_CHANGES / INCONCLUSIVE / APPROVED / REQUEST_CHANGES |
| 2026-09-05 | sonnet/medium · v7.1 r2 · commit `ce12b4db` (a·h 실측, b·c·d·f·g는 baseline-v7 fold replay + scope probe) | 0              | 0   | 0                        | 0               | 0               | APPROVED / REQUEST_CHANGES / REQUEST_CHANGES / REQUEST_CHANGES / INCONCLUSIVE / APPROVED / REQUEST_CHANGES |
| 2026-09-05 | sonnet/medium · v7.1 + File Contents 인라인 r3 (기각 실험, a·h만)                                         | 1 (a `DEF-21`) | 0   | 0                        | —               | 0               | REQUEST_CHANGES / — / — / — / — / — / REQUEST_CHANGES                                                      |
| 2026-09-05 | sonnet/medium · v7.1 + File Contents 인라인 r4 (기각 실험, a·h만)                                         | 1 (h `DEF-18`) | 0   | 0                        | —               | 0               | APPROVED / — / — / — / — / — / REQUEST_CHANGES                                                             |
