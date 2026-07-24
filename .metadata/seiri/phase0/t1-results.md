# T1 배선 검증 결과 (2026-07-24)

> **대상**: [ext-observation.md](./ext-observation.md) §1 T1 표 8항목.
> **하니스**: 격리 스크래치 프로젝트(`seiri-t1-scratch`)에서 1회 실측 + 재시작(R1). 인계: [t1-handoff.md](./t1-handoff.md) · 원장: 스크래치 `T1-LEDGER.md`.
> **관측 규율**(정본 계승): 관측한 것만 적는다 — 주입 문자열 원문·파일 존재·grep 히트 수. 추정 금지.
> **이 파일은 정본 §6 로그에 인라인하지 않은 별도 결과 블록**이다(정본 무수정 원칙 준수). 정본 §6가 이 파일을 참조한다.

---

## 총평

**8/8 PASS · 배선 결함 0.** 정본 §1 "T1 실패는 배선 결함"에 해당하는 항목 없음 — 머지 게이트 통과.

- 진짜 고장(FAIL) 없음.
- 실측 중간엔 #7을 UNCLEAR로 뒀으나, **정본 §1 #7 통과 기준 원문("성공 후 리셋되어 다시 셈")을 직접 대조하여 PASS로 확정**(아래 §"#7 상세").
- 검사 종료 후 다이얼 원위치(`config clear`) 완료 — 정본 §1·§4 "끝나면 반드시 config clear" 준수.
- **예상 밖 사실 1건이 정본 전제와 충돌**: baseline이 advisory가 아니라 standard(아래 §"예상 밖 사실" 1번). T2의 "advisory 기준선" 전제(정본 §4)에 직접 영향 — **T2 착수 전 결정 필요.** *(→ 2026-07-24: `DEFAULT_INTERVENTION`이 standard로 확정되어, 이 충돌은 스크래치 아티팩트가 아니라 실제 배포 기본값이 됐다. ext-observation §1.1·§4 재역전 참조.)*

---

## 8항목 판정 (정본 §1 표 대조)

| #  | 항목             | 정본 통과 기준(원문)                                           | 판정     | 관측 근거 |
| -- | ---------------- | -------------------------------------------------------------- | -------- | --------- |
| 1  | 규칙 로드·비노출 | 배포 규칙이 Memory files에 · 호출형 4종 description 부재       | **PASS** | `/context`: Memory files에 seiri 규칙 7종 전문 로드(public-contract 823t·agent-legible 883t·structure 1k·reuse-first 930t·context-efficiency 988t·naming 830t·cognitive-discipline 1.5k). 호출형 4종(implement·verify-done·request-review·trace-cause)은 Skills 절 ~50–60t 리스팅 엔트리로만 존재 — full 스킬 본문 미상시로드(on-demand). test-validity는 Memory files 부재(=#2 정합) |
| 2  | S3 조건부        | ①에 `seiri_test-validity` 없음 · ③에 나타남                    | **PASS** | ① 세션시작 로드 seiri 7종에 test-validity 부재 · ③ `sample.test.ts` Read 직후 `seiri_test-validity.md` 전문이 컨텍스트 주입. 비테스트 파일 Read엔 미주입 → 트리거가 테스트파일 특정. (정본 절차의 /context 대신 조건부 로드 훅 발화를 직접 관측 = 더 강한 근거) |
| 3  | 밸브 왕복        | 렌더의 다이얼·출처가 따라옴 · `clear` 후 기준선 복귀           | **PASS** | set advisory/strict→posture 문자열 추종 · **R1 재시작**: runtime.json=strict인 채 새 세션 → SessionStart 실렌더 `Intervention: strict (runtime; baseline: standard)` 일치(set→실렌더 추종 확정) · clear→`{source:baseline, runtime:null}` + runtime.json 디스크 삭제 |
| 4  | 밸브 비추적      | `runtime.json`이 git status에 안 뜸(`.seiri/.gitignore` 생성) | **PASS** | `git status --porcelain -uall`에 runtime.json·session-signals.json 부재 · `git check-ignore -v`: `.seiri/.gitignore:2:runtime.json`. .gitignore가 둘 다 커버 |
| 5  | 발동 폭          | standard 체인 1줄 · strict +완료 계약 · advisory 무언급        | **PASS** | standard=`Workflow: implement → verify-done → request-review; failures → trace-cause.`(1줄) · strict=+`Borderline moments included. Completion claims name their verification run first.` · advisory=Workflow 줄 없음. **standard·strict 실 SessionStart 직접 관측**, advisory는 posture 프록시(R1서 set→실렌더 일치 입증돼 수용) |
| 6  | SubagentStart    | standard 주입 존재 · advisory로 내리면 부재                    | **PASS** | standard 서브에이전트 transcript `subagents/agent-*.jsonl`에 `[seiri]` 2건(Active rules + Workflow) · advisory 서브에이전트 0건(SubagentStart 마커는 존재=훅 발화, 주입만 부재). set advisory 직후 스폰 = 밸브 라이브 반영 |
| 7  | 실패 연쇄        | 3회째 신호 1줄 · 4회째 침묵(dedup) · 성공 후 리셋되어 다시 셈  | **PASS** | 세 조건 전부 충족 — (1) 같은 명령 실패 3회째 in-band 신호 1줄 ✓ (2) 4회째 침묵(once/session dedup) ✓ (3) 성공(같은 명령 green) 후 `.seiri/session-signals.json` counts 재집계 관측 ✓. 정본 "다시 셈"=카운터 재집계로 대조(아래 §상세) |
| 8  | advisory 무비용  | 무주입 · `.seiri/session-signals.json` 미생성                 | **PASS** | advisory(runtime valve)서 fail.sh 3회 → in-band `[seiri]` 0건 · session-signals.json 삭제 후 미복원 = 훅이 advisory에서 카운트·기록조차 안 함 |

---

## #7 상세 — "다시 셈"을 정본 원문으로 대조 (UNCLEAR → PASS 정정)

**정정 경위.** 실측 중간엔 #7을 UNCLEAR로 뒀다. 정본 통과 기준의 셋째 조건 "성공 후 리셋되어 **다시 셈**"이 두 가지로 읽혔기 때문이다 —

- **(A) 재집계**: 성공하면 카운터 리셋, 이후 실패를 다시 센다(count from zero).
- **(B) 재발화**: 리셋 후 다시 3회 실패하면 신호가 또 뜬다.

**정본 원문 대조 결과 = (A).** 정본 문구는 "다시 **셈**"(count)이지 "다시 신호/발화"가 아니다. 구현은 (A)를 정확히 한다: 성공한 명령의 해시로 `counts[hash]`를 지우고(리셋), 이후 같은 명령 실패를 다시 집계한다(`session-signals.json` counts 재집계로 관측). **세 조건 전부 충족 → PASS.**

**구현이 (B)는 하지 않음 = 설계 의도.** green은 counts를 지우되 announced(발화 이력)는 유지한다. 그래서 성공 후 다시 3회 실패해도 재발화는 없다. 이는 seiri INTENT.md "명령당 세션 1회만 말한다"와 정합 = dedup 설계. 정본 통과 기준이 (A)를 명시하므로 (B) 부재는 결함이 아니다.

**검증 함정(후속 관측자 경고).** #7을 **신호 출력만** 보고 판정하면, 성공 후 재집계가 침묵으로 보여(once/session dedup) "리셋 실패"로 오독된다. 리셋은 반드시 `.seiri/session-signals.json`의 counts로 확인해야 관측된다. 이 함정이 실측 초기 거짓 FAIL의 원인이었다.

**권고(P3, 선택).** 정본 §1 #7 통과 기준을 "성공 후 리셋되어 다시 셈(= counts 재집계, 신호 재발화 아님)"으로 한 줄 명확화하면 위 오독이 원천 차단된다. 배선 변경 아님 — 문서 문구만.

---

## 예상 밖 사실 (검사 중 발견)

1. **기준선이 advisory가 아니라 standard.** `config get`/`clear` 모두 `{effective:standard, source:baseline, baseline:standard, runtime:null}`. `.seiri/config.json = {"intervention":"standard"}`. **정본 §4는 "T2 advisory 기준선"을 전제하나 실제 커밋 baseline은 standard.** → `config clear`는 밸브만 떨궈 standard로 복귀할 뿐 advisory로 못 감. T2 "advisory 무비용"(§2·#8)을 실사용에서 유지하려면 setup 표면(open_settings)에서 **baseline 자체**를 advisory로 바꿔야 함. **T2 착수 전 결정 필요.**
2. **agent transcript 경로가 정본 힌트와 다름.** 정본 §1 line 33: `~/.claude/projects/<proj>/*.jsonl`. 실제 서브에이전트: `<proj>/<session-id>/subagents/agent-<id>.jsonl`(+`.meta.json`). #6 grep은 재귀 필요. 배선 결함 아님 — 정본 §1 관측 절 경로 힌트 갱신 권고.
3. **`.seiri/.gitignore` 자동 생성 시점.** `config set`이 아니라 **실패연쇄 훅**이 session-signals.json 첫 기록 시 생성. 내용: `runtime.json` + `session-signals.json` 무시. (정본 #4는 ".gitignore 생성 확인"을 set 결과로 기대하나, 실제 생성 트리거는 실패연쇄 훅 — #4 판정 자체는 영향 없음)
4. **#7 리셋의 이중 게이팅.** 리셋은 command-hash keyed(같은 명령 green일 때만 그 체인 counts 삭제, 다른 green 명령은 무관) + 발화는 once/session. → 위 §상세의 검증 함정의 근원.
5. **"Active rules (8/8)" 렌더 ≠ 실 상시로드 개수.** SessionStart·/context 모두 "8/8"로 8종 이름을 나열하나, Memory files 상시 로드는 7종(test-validity는 S3 조건부라 테스트파일 접근 전 부재). 배포 이름 개수 ≠ 실 로드 개수 — #1·#2를 함께 봐야 오독 방지.

---

## 종료 절차 (정본 §1·§4 "끝나면 반드시 config clear")

- ✅ `rule_docs_sync config clear`(project_root=스크래치) → `{effective:standard, source:baseline, runtime:null}`, posture `Intervention: standard ...`.
- ✅ runtime.json 디스크 삭제 확인(`test -f` → REMOVED). 다이얼 = standard(baseline), 밸브 없음.
- ⚠️ **주의**: baseline=standard라 clear는 standard 복귀(advisory 아님). T2 advisory 기준선은 예상 밖 사실 1번 참조.
- 스크래치 잔여물 보존(재현용): `sample.test.ts` · `fail.sh` · `.seiri/`(config.json·.gitignore·session-signals.json). **ogham 저장소 정본 무수정.**

---

## 관련

- 정본 설계: [ext-observation.md](./ext-observation.md) §1(T1 표) · §4(판정 시점·advisory 기준선)
- 실행 인계: [t1-handoff.md](./t1-handoff.md)
- 원장(스크래치): `seiri-t1-scratch/T1-LEDGER.md` — 항목별 1급 관측 원본
- 방법론 원류: [d7-dispatch.md](./d7-dispatch.md)(프록시 하니스 한계) · [d7-results.md](./d7-results.md)
