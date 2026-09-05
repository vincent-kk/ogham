# cross-review — 배정 파일 전문 인라인(File Contents) 실험 기각 기록

작성 2026-09-05 · 대상 cross-review 7.1.0 (commit `ce12b4db`) 위의 미커밋 변형 · 결과는 되돌렸고 저장소에 남은 코드는 없다

## 가설과 설계

v7.1 r2 스트림에서 액터(reviewer·verifier)는 diff가 브리프에 인라인돼 있어도 배정 파일 전문을 다시 열었다(a·h 합계 7회, 파일은 305B·432B). 이를 없애면 액터 호출 a 2·h 5회, 약 $0.10–0.14와 벽시계 약 30초를 줄일 수 있다고 봤다.

구현: review·verify brief의 `## Diffs` 다음에 `## File Contents` 절을 추가하고, 각 배정 path의 내용을 state `fileHashes`의 object hash로 `git cat-file blob`에서 읽어(working tree는 읽지 않음 — `INTENT.md` Never do) 1-based 줄 번호를 붙여 인라인. 합계 32KB 예산 초과·hash 부재·삭제·바이너리면 절을 생략해 기존 동작으로 복귀. `reviewer.md`·`verifier.md`에 "열거된 path는 다시 열지 않는다" 한 문장씩. codex 계획 검토 2회, codex 구현, opus verifier PASS, 단위·통합 테스트 1,397건 통과.

## 측정 (fixture a+h, sonnet/medium, pass당 1회)

| pass                 | a                                    | h                             |           합계 | 액터 소스 읽기 | 정답지 밖 finding                                                                              |
| -------------------- | ------------------------------------ | ----------------------------- | -------------: | -------------: | ---------------------------------------------------------------------------------------------- |
| r2 (인라인 전, 기준) | $0.425 / 76초 / APPROVED             | $0.712 / 191초 / 정답 2건     | $1.137 / 267초 |              7 | 없음                                                                                           |
| r3                   | $0.786 / 202초 / **REQUEST_CHANGES** | $0.736 / 188초 / 정답 2건     | $1.521 / 390초 |              1 | a: `DEF-21` warning(테스트 리터럴 63 vs `MAX_SLUG_LENGTH`) → verify CONFIRMED → verdict 반전   |
| r4                   | $0.352 / 74초 / APPROVED             | $0.702 / 186초 / 정답 2건 + 1 | $1.053 / 260초 |              0 | h: `DEF-18` warning(`truncated[0].toLowerCase()`가 no-op) — 사실이지만 정답지 밖, round 2가 냄 |

루브릭(기준 a 15 / h 14): r3 a 9 / h 14, r4 a 15 / h 12.

## 관측

- 기계적 목표는 달성됐다. 액터 소스 읽기 7 → 1 → 0, r4에서 액터 호출 a 3·h 12, 비용 $1.053(조정선 ≤ $1.06). a 단독 비용 −17%.
- 품질은 두 pass 모두 기준 미달. 인라인 전 두 pass(v7 r1, v7.1 r2)의 a·h 4개 report에는 없던 maintainability 계열 warning이 pass마다 하나씩 생겼고, 하나는 verdict를 뒤집었다.
- 벽시계는 줄지 않았다. h round-1 reviewer가 소스를 읽는 대신 `node -e` 재현을 실행했고(r3에서는 sandbox `/tmp` 쓰기 거부로 5회), 이 변동이 절감분을 상쇄한다.

## 가설 (n=2, 증명 아님)

reviewer 방법론은 "질문에 답하는 데 필요한 소스만 연다"(Method 6)로 읽기를 절제시킨다. 파일 전문이 브리프에 미리 실리면 그 절제가 사라지고, 보이는 모든 줄에 규칙 목록(`DEF-18`·`DEF-21` 같은 maintainability 규칙 포함)을 적용하게 된다. 두 오탐 모두 변경된 줄 위에 있고 규칙 ID도 실재하므로 규칙 위반이 아니라 규칙을 더 넓게 적용한 결과다.

## 결정

채택하지 않는다. 기대 절감($0.10)이 실행 간 변동보다 작고, 품질 유지 조건을 두 번의 기회에서 모두 못 맞췄다. 작업 트리를 `ce12b4db`로 되돌렸다.

## 다시 시도한다면

- 먼저 fixture a·h의 round-1 reviewer만 두 브리프 형식으로 각 3회 이상 돌려 정답지 밖 finding 비율을 비교한다(회당 약 $0.17). 전체 벤치마크로는 이 크기의 효과를 판별할 수 없다.
- verify brief에만 인라인하는 변형은 오탐 위험이 없다(verifier는 finding을 만들지 않음). r3·r4에서 verifier 호출은 5 → 3으로 줄었다. 절감은 h당 약 $0.03이다.
- 구현 자체는 재사용 가능하다: 리더는 `git cat-file blob <objectHash>`만 쓰고(`executeReviewGit`), 예산·삭제·바이너리 fallback과 prepare 테스트(commit 뒤 working tree를 수정해도 commit 내용이 인라인됨)까지 검증됐다.
