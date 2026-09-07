# cross-review 7.1 — 비용·속도 개선 결정 기록

작성 2026-09-05 · 대상 `plugins/filid` cross-review 7.0.0 → 7.1.0 (commit `ce12b4db`) · 측정은 `.metadata/filid/cross-review-calibration/calibration.md` Measurements

## 배경

cross-review 7.0을 ocr(`open-code-review` delegate 모드)와 같은 fixture a·h로 비교하면 벽시계 6.1배(636초 대 105초), 비용 4.0배($1.82 대 $0.45)였다. 품질은 v7이 앞섰다(루브릭 29/30 대 22/30 — 행·규칙 인용, 파일별 커버리지 마감, finding 개수 분해, 판독 전용 worktree). 목표는 품질 기준점을 유지한 채 비용·시간을 내리는 것이었다.

## 검증된 원인

비용은 API 호출 수 × 호출당 캐시 컨텍스트로 결정된다. v7 r1 스트림에서 확인한 낭비:

- 오케스트레이터가 액터 방법론 파일을 찾으려 `find /`를 실행(120초 타임아웃), 배경 액터 완료를 `ScheduleWakeup`으로 폴링, 브리프·`reviewers/*.md`·`templates.md`를 반복 Read, prepare 전에 git 서두와 Change Context 편집을 수행.
- verifier 세션이 판정할 finding이 없는데도 7 run 중 5회 실행됨.
- 오케스트레이터 호출당 컨텍스트가 a 51K·h 58K 토큰(호스트 base 약 40K 위에 재독한 문서가 누적).

## 결정

| ID  | 결정                                                                                                                                                                                                                                               | 기각한 대안                                                                                      | 결과                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| D1  | 액터 방법론(`reviewer.md`·`verifier.md`)을 prepare가 브리프에 verbatim 내장한다. 플러그인 `agents/` 정의나 경로 전달은 쓰지 않는다                                                                                                                 | agent 정의(surface test 정책·Codex 컴파일 표면이 다름), 경로 전달(액터가 파일을 찾느라 `find /`) | 오케스트레이터가 액터 문서를 열지 않는다. 브리프는 self-contained                                   |
| D2  | 도구가 측정한 FCA candidate와 diff 밖 finding(`inDiff: false`이고 rule이 `USR-`·`FCA-`로 시작하지 않음)은 verifier가 아니라 seal fold가 결정론으로 판정한다. 분류 함수 `splitVerifierAssignment` 하나를 brief 렌더·verify validate·seal이 공유한다 | verifier가 모든 finding을 판정(빈 verifier 세션 비용, 비결정성)                                  | assigned가 비면 서버가 빈 COMPLETE verify opinion을 직접 쓴다(auto-verify). a에서 verifier 세션 0회 |
| D3  | prepare가 branch·base·changeContext를 소유한다. 오케스트레이터는 `gh pr view` 1회 외에 git을 실행하지 않고 `branchName`을 생략한다                                                                                                                 | 오케스트레이터의 git 서두와 Change Context 편집                                                  | 호출 수와 컨텍스트 감소, 결정론적 세션 문서                                                         |
| D4  | handoff 주도 오케스트레이션 — prepare·validate 응답의 `data.next`(spawn할 handoff)·`data.sealReady`·`verifierRequired`를 따르고, 실패한 handoff는 한 번 respawn 뒤 `exhausted`. 완료 알림 대기는 Anti-yield 예외로 선언하고 폴링을 금지            | 오케스트레이터가 checkpoint를 읽어 다음 단계를 스스로 계산                                       | 오케스트레이터 호출이 a 13→8, h 28→14로 ocr와 같아짐                                                |
| D5  | opinion schema 변경(`suggestedCode`·overlap 표기)은 별도 결정으로 미룬다                                                                                                                                                                           | 이번 변경에 포함                                                                                 | schema 7·state v2 불변, baseline replay 가능                                                        |

배치: `reviewState/handoff/`(상태 판독·복구·순수 계획), `opinion/splitVerifierAssignment.ts`, `verdict/buildDeterministicDecisions.ts`, `rules/loadActorMethods.ts`, `scope/readChangeContext.ts`. 계약은 `reviewState/DETAIL.md`, 공개 경계는 `INTENT.md`.

## 결과 (fixture a+h, sonnet/medium, 각 1회)

v7 r1 대비 v7.1 r2: 비용 $1.819 → $1.137(목표 $1.00 미달, ocr 4.0× → 2.5×), 벽시계 636초 → 267초(목표 충족, 6.1× → 2.5×), 오케스트레이터 호출 a 13→8 · h 28→14(목표 7/11은 배경 액터의 launch 확인 턴을 세지 않은 모델 오류로 미달), 낭비 호출 0, verdict·finding·루브릭(15/14) 유지, 맹검 채점 일치. run별 수치와 ocr·F1 비교는 `.metadata/filid/cross-review-calibration/calibration.md`의 `## Measurements`가 정본이다.

오케스트레이터 비용은 이 호스트의 바닥(호출 수 = ocr, 호출당 컨텍스트 = base + 스킬 문서)에 닿았다. 남은 차이는 액터 세션(h 3개)이며, round 2는 h의 두 번째 결함을 찾은 load-bearing 라운드라 줄이지 않는다.

## 남은 것

- D5(`suggestedCode`)는 미착수.
- 후속 후보: 액터 전경 실행으로 launch 턴 제거(호스트가 옵션을 노출할 때), SKILL.md Step 2에 `PROJECT_ROOT`는 세션 cwd라 `pwd`·`ToolSearch` 재호출이 불필요함을 명시(r4에서 `pwd` 2회 관측), 플러그인 agent 정의로 액터 base 컨텍스트 축소(정책 변경 필요).
- 파일 전문 인라인(F1)은 실험 후 기각 — `2026-09-05-cross-review-file-contents-inline-rejected.md`.
- 측정의 한계: fixture당 1회라 분산을 모른다. 재현 스크립트 실행·오탐에 따른 round/verify 추가가 $0.1–0.3를 움직이므로 그 크기의 효과는 단발 측정으로 판별할 수 없다.
