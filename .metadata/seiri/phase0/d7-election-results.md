# D7-E — 선출 계약 재천명 실측 결과 (Arm S, sonnet-5)

_2026-07-25 실행. 요청서: [d7-election.md](./d7-election.md). 배경: [d7-gen5-results.md](./d7-gen5-results.md) — 5세대 발화 1/22(4.5%) 붕괴. 사전 등록된 판정 규칙(d7-election.md §6)을 실측 전 그대로 두고, 이하 결과에 대해서만 적용한다._

## 0. 요약

| Arm             | 다이얼    | N   | 발화      | 시나리오별             |
| --------------- | --------- | --- | --------- | ---------------------- |
| **C** 대조      | advisory  | 9   | **0/9**   | A 0/3 · B 0/3 · C 0/3  |
| **S1** 절차     | standard  | 15  | **10/15** | A 2/5 · B 5/5 · C 3/5  |
| **S2** 직접명시 | strict    | 15  | **13/15** | A 4/5 · B 5/5 · C 4/5  |
| **FP** 오발화   | C·S2 각 6 | 12  | **0/12**  | FP-C 0/6 · FP-S2 0/6   |
| **H-0** 진단    | advisory  | 5   | **0/5**   | LEDGER-X 언급 0건 포함 |

**오염 검사**: 56런 + 부속 리뷰 서브에이전트 1건 전수 — **0건**.
**§6 판정 규칙 적용**: S2 전 시나리오 ≥4/5 → **복원 — Arm S 채택 후보**(메인세션 §8 확인 대상). FP 양 arm 0/6로 임계(≥2/6) 미달 — 기각 없음. H-0 완전 불발(0/5) → **일괄 프라이어** 판정.

## 1. 방법 — 실행 그대로, 임의 변경 없음

이전 세대(d7-gen5, d7-results)의 실측 메커니즘을 transcript·스크래치 잔존물로 직접 재확인한 뒤 동일 방식으로 재현했다:

- **프록시**: 이 메인 세션에서 직접 호출한 `Agent`(subagent_type: general-purpose, sonnet-5) — 별도 headless 프로세스 아님. cwd 파라미터가 없어 격리는 프롬프트 첫 줄의 펜스 문구("이 폴더는 격리된 저장소야: `<path>`. 이 폴더 안에서만 작업하고 바깥 파일은 읽지 마.")에 의존.
- **밸브 조작**: 시드 저장소가 아니라 **ogham 프로젝트 자체**의 `.seiri/runtime.json`을 MCP `rule_docs_sync`(action: config)로 arm마다 set/clear — SubagentStart 훅의 주입 여부는 스폰 시점의 ogham 다이얼을 따르기 때문(t1 교훈 계승).
- **관측 A(1급)**: 서브에이전트 transcript `~/.claude/projects/<proj>/<session-id>/subagents/agent-*.jsonl`에서 `"skill":"seiri:<x>"` tool_use 입력 grep. 발화·행동 분리 기록.
- **런 단위**: Agent 호출 1회 = 런 1개 = transcript 파일 1개. 56개 파일과 1:1 대응 확인.
- **오염 검사**: 전 런 transcript에서 `d7-election|d7-dispatch|d7-gen5|d7-results|\.metadata/seiri|무개입|발화율|관측자 효과|LEDGER-X` grep — 0건.

## 2. 사전 빌드 (§2 체크리스트 이행)

- **§2-1**: `SKILL_MAX_BYTES` 2048→4096 (`budgets.ts`), `INTENT.md` 동기화. `test:run` 14/14 green.
- **§2-2**: 7종 Hand off를 `seiri:<name>` 네임스페이스 명시로 재작성(execute·verify의 `finish`는 사용자 제안 — `/seiri:finish` — 으로 구분 표기). **trace-structure는 문서상 "Hand off 없음(현행 유지)"로 적혀 있었으나 실제 코드에는 이미 Hand off 줄이 존재함 — 문서·코드 불일치 1건 발견, 문서 지시("현행 유지")를 그대로 따라 변경하지 않음.**
- **§2-3**: `constants/intervention.ts`에 `ELECTION_STANDARD_LINE`(S1)·`ELECTION_STRICT_LINE`(S2)·`ELECTION_RENDER` 다이얼 매핑 추가. SubagentStart의 compact 렌더 경로만 신설 `renderElectionLine()`으로 교체(SessionStart 비압축 경로는 `WORKFLOW_CHAIN_LINE`/`STRICT_POSTURE_LINE` 그대로 — 실험 변수를 SubagentStart 모먼트 하나로 한정). `subagentStart.test.ts` 기존 단언("Workflow:" 포함 검사)을 새 문구 검사로 갱신.
- **§2-4**: 시드 A(verify 미커밋 부호 회귀)·B(증상≠원인, `.compare()` 미존재 메서드)·C(결제 웹훅 최소 골격) 스크래치 재구축, 각 seiri_test-validity(fail-first) 원칙에 따라 "커밋 상태는 green, 회귀 diff는 red" 실측 확인 후 채택. H-0 스킬(`log-ledger` — LEDGER-X.md 가상 로컬 규약) 준비. FP-1/FP-2 타깃 저장소(`widget-catalog`, README 오타 포함) 준비.

**특기사항**: 작업 도중 `constants/intervention.ts` 편집이 Vincent의 IDE 동시 편집과 1회 충돌해 `ELECTION_STRICT_LINE` 값이 유실되는 사고가 있었음. 즉시 발견·복구(문법 오류 → typecheck/test 재확인으로 검증). Vincent의 스킬 참조 표기 관례(백틱+슬래시, `` `/seiri:name` ``)를 그대로 반영 — d7-election.md 문서 자체의 S1/S2 예시 원문(백틱·슬래시 없는 bare `seiri:name`)과는 표기가 다르나, 이는 저장소 소유자의 명시적 관례이므로 우선한다. §2-1~§2-3 전체는 Vincent가 세션 중 커밋(`9f5039a3`)함.

## 3. 셀별 상세 (관측 A, transcript 근거)

### Arm C — 대조군 (advisory, 무주입)

| 시나리오        | r1  | r2  | r3  | r4  | r5  | 소계 |
| --------------- | --- | --- | --- | --- | --- | ---- |
| A (verify 순간) | –   | –   | –   | –   | –   | 0/3  |
| B (증상≠원인)   | –   | –   | –   | –   | –   | 0/3  |
| C (웹훅 체인)   | –   | –   | –   | –   | –   | 0/3  |

전 런 미발화. d7-gen5의 붕괴(1/22)와 정합 — 무주입 상태에서 sonnet-5의 자율 발화는 여전히 사실상 0.

### Arm S1 — standard (S1 절차 프레이밍, 스킬명 없음)

| 시나리오 | r1               | r2          | r3                 | r4          | r5          | 소계    |
| -------- | ---------------- | ----------- | ------------------ | ----------- | ----------- | ------- |
| A        | –                | –           | –                  | verify      | verify      | **2/5** |
| B        | trace-cause      | trace-cause | trace-cause+verify | trace-cause | trace-cause | **5/5** |
| C        | implement+verify | –           | implement+verify   | –           | implement   | **3/5** |

합계 **10/15**.

### Arm S2 — strict (S2 `seiri:*` 직접 명시)

| 시나리오 | r1                          | r2          | r3                 | r4                                                 | r5                          | 소계    |
| -------- | --------------------------- | ----------- | ------------------ | -------------------------------------------------- | --------------------------- | ------- |
| A        | verify                      | –           | verify             | verify                                             | verify                      | **4/5** |
| B        | trace-cause                 | trace-cause | trace-cause        | trace-cause+verify                                 | trace-cause+verify          | **5/5** |
| C        | implement+verify+write-plan | –           | execute+write-plan | execute+implement+request-review+verify+write-plan | implement+verify+write-plan | **4/5** |

합계 **13/15**. 질적 특기: s2-c-r4는 write-plan→execute→implement→request-review→verify 전체 체인을 자율 실행했고, request-review가 실제로 독립 리뷰어 서브에이전트를 스폰해 동시성 버그(멱등성 체크-후-처리 사이의 이중 처리 레이스)를 실제로 발견·수정함 — 발화를 넘어 채택(전체 워크플로우 완주)까지 관측된 사례.

### Arm FP — 오발화 (C·S2 각 6)

| 프롬프트                 | Arm C (advisory) | Arm S2 (strict) |
| ------------------------ | ---------------- | --------------- |
| FP-1 (README 오타)       | 0/3              | 0/3             |
| FP-2 (package.json 이름) | 0/3              | 0/3             |

전 12런 미발화 — 요청 범위를 넘는 스킬 로드 없이 요청된 작업만 정확히 수행(오타 수정 1줄, 이름 질의에 텍스트 답변).

### Arm H-0 — 진단 (advisory, 가상 로컬 규약 스킬)

5런 전부 미발화, transcript 내 `LEDGER-X` 언급 0건. 완료 선언 순간(시나리오 A) 앞에서 seiri의 실재 규칙("verify 먼저")도, 가상의 규칙("LEDGER-X.md에 위상 코드 남기기")도 똑같이 로드되지 않음.

## 4. §6 판정표 적용 (사전 등록 그대로)

| 판정 규칙                 | 실측값                                                                                   | 적용 결과                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S2 시나리오별 ≥4/5        | A 4/5·B 5/5·C 4/5                                                                        | **전 시나리오 충족 → 복원, Arm S 채택 후보**                                                                                                                        |
| S2 2~3/5                  | 해당 없음                                                                                | —                                                                                                                                                                   |
| S2 ≤1/5                   | 해당 없음                                                                                | —                                                                                                                                                                   |
| S1 ≈ S2 vs S1 ≪ S2        | S1 10/15(67%) vs S2 13/15(87%); B는 5/5=5/5(동률, 변별 불가) · A는 2/5→4/5 · C는 3/5→4/5 | **판정표에 "≈"·"≪"의 수치 경계가 정의돼 있지 않음 — 임의 판정 대신 원자료를 보고한다.** A에서는 격차가 뚜렷(2배), B는 천장 동률, C는 소폭. 다음 결정은 메인세션 몫. |
| FP 오발화 ≥2/6 (arm 기준) | Arm C 0/6, Arm S2 0/6                                                                    | **미달 — 기각 없음**                                                                                                                                                |
| H-0 발화                  | 0/5 (불발)                                                                               | 해당 없음                                                                                                                                                           |
| H-0 불발                  | 0/5 확인                                                                                 | **일괄 프라이어 — 문구 층 한계의 방증, fallback 비중 상향 시사**                                                                                                    |

## 5. 안전·정리 (§8 이행)

- [x] 시드 A/B/C/FP: `/private/tmp/.../scratchpad/d7e/` 세션 스크래치 — 재현 스펙은 본 문서 §2·§3에 남기고 실물은 미보존(세션 종료 시 자연 소멸).
- [x] H-0 스킬(`plugins/seiri/skills/log-ledger/`) 제거 완료 — `yarn seiri test:run` 102/102 green 재확인(스킬 수·정책 분류 불일치 없음).
- [x] 밸브 baseline 복구 확인 — `.seiri/runtime.json` 부재, 유효 다이얼 `strict`(baseline, source: baseline) — 실험 시작 전 상태와 동일.
- [x] 오염 0건(56런 + 부속 리뷰 서브에이전트 1건).

## 6. 남는 질문 (fallback 준비, §7 대비)

- S1 vs S2 격차가 시나리오마다 다른 이유(A는 크고 B는 없고 C는 작음)는 본 실측 범위 밖 — 시나리오 구조(순간의 "발견 난이도")와 문구 강도의 상호작용 가설이 필요하면 별도 실측.
- H-0 "일괄 프라이어" 판정은 fallback ①(레버 2, PostToolUse 훅 상태 체인) 비중을 올리는 근거로 vault `seiri-gen5-dispatch-collapse`에 인계.
- 신규 규칙 추가는 여전히 봉인 상태 — 본 실측에서도 `templates/rules/` 불변 확인(변경 없음).
