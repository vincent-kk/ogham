# 04 — 게이트 원장: execute 구간의 증명된 완료

> **완료는 약속이 아니라 증명이다.** 계획의 각 태스크는 실행 가능한 게이트를 갖고, 게이트의 증거는 기계가 기록하며, 원장이 다 차기 전의 "done"은 `verify`가 `execute`로 되돌린다. 원장은 세션을 모른다 — 세션이 죽어도 원장은 남고, 다음 세션이 이어받는다.

이 문서는 게이트 원장 기능의 **설계 정본**이다 — 포맷·작업 디렉토리·도구·훅·스킬 계약과 그 이유만 담는다. 조사 기록과 판정 과정은 지식 저장소(`seiri-unlazy-import-review`)에, 개발 순서는 `plugins/seiri/TODO.md`에 있다.

---

# 0. 출처와 경계

**출처**: [unlazy v2](https://github.com/Leonxlnx/unlazy) (Leonxlnx, MIT). v1은 지시문으로 "더 열심히"를 요구했고, 저자의 통제 실험 6회가 그 한계를 쟀다 — 최전선 모델에서 placeholder·콘솔 에러(능력 실패)는 베이스라인도 0이었고, **조기 완료 보고와 자신 있게 틀린 숫자**(reliability 실패)만 살아남았다. v2는 강제를 prose에서 파일·검사·훅으로 옮겼다. unlazy의 스크립트는 둘이다 — `gate-check.mjs`(CHECK를 실행해 박스를 뒤집고 증거를 쓰는 러너)와 `stop-hook.mjs`(스캔만 하고 미충족이면 턴 종료를 막는 훅).

| 이식한다                                                        | 이식하지 않는다                            | 이유                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| 게이트 파일 (일보다 게이트 먼저)                                | Depth Tree · solo/orchestrated 모드        | 작업 분해(imbas)·오케스트레이션(omc)은 역할 밖 — seiri는 **실행 주체를 정하지 않는다** |
| 실행 가능한 검사 (`CHECK`/`EXPECT`) · 주장/증거 분리            | Stop 훅                                    | 차단 훅 없음 불변 (02 §4) — 역할은 §7의 뒷가장자리로                                   |
| 러너의 "충족 여부 검사" (분해해서 — §4)                         | 2^(N-1) 노력 산술                          | unlazy 자신이 "허구"로 판정                                                            |
| 보고 감사 (숫자는 보고 시점에 재측정) · `ABANDON` (가시적 포기) | 4 패스 (구현·전문가 재독·결함 사냥·다듬기) | `implement`·`cognitive-discipline`·`mental-model`과 중복                               |

**헌법 정합**

- **P2** — seiri는 **포맷**만 갖는다. `CHECK`의 값(어떤 명령, 어떤 기대 출력)은 계획과 저장소가 준다. 오라클 값 비보유 그대로.
- **P1** — 게이트 포맷은 규약 화물(이 워크플로우의 로컬 형식·아티팩트·순서)이라 불감가. unlazy의 실험이 P1의 분할을 독립 확인했다.
- **P3** — 작업 디렉토리는 상태 3종(설정·배포 상태·세션 신호)에 더해지는 **4번째 상태: 작업 상태**. 진실은 원장 파일이고 훅·MCP는 매번 읽는다 — 미러도, 포인터도, 등록도 없다.
- **P4** — 다이얼은 기록·렌더의 유무만 바꾼다. 스킬 본문은 다이얼과 무관.
- **역할 밖 목록** — "development methodology"의 이행. 진실(저장소)도 판단(모델)도, 실행 주체(단일/다중 에이전트)도 건드리지 않는다.

**권한 경계** — MCP 서버는 고유 권한을 가지며, **그 권한으로 모델이 저작한 명령을 실행하지 않는다.** MCP가 셸을 띄우면 하니스 권한 체계 밖이다: Bash deny 규칙은 `mcp__plugin_seiri_tools__*` 호출명만 보고 내부 명령을 보지 못하며, Bash 도구의 샌드박스도 걸리지 않는다. `CHECK` 줄은 모델이 쓰므로 이는 권한 우회 통로가 된다. 따라서 **실행은 하니스의 Bash로, 모델이** 한다. unlazy에서도 모델이 `node gate-check.mjs`를 Bash로 돌리므로 자식 명령은 샌드박스 안이지만 deny 규칙에는 보이지 않는다 — seiri의 분할은 CHECK를 모델이 직접 돌리게 해 deny 규칙까지 적용시킨다.

---

# 1. 한 장의 그림

```
write-plan ────► .seiri/tasks/<name>/plan.md + gates.md     태스크별 게이트, EVIDENCE: pending
review-plan ───► 게이트 품질 검토          결과인가 활동인가 · EXPECT가 결정적인가 · exit 0 형인가
execute ───────► gates status              어디까지 왔나 — 세션이 바뀌어도 여기서 이어받는다
   │  태스크마다
   ├─ CHECK를 Bash로 그대로 실행 ──► PostToolUse 훅: 작업 원장들의 CHECK와 대조
   │                                   → 일치하면 EXPECT 대조 → 원장에 박스·EVIDENCE 기록
   │                                   → 판정 한 줄 주입
   └─ gates status ─► all_met? ─ 아니오 ─► 다음 미충족 게이트 (자기 루프)
verify ────────► status UNMET → "/seiri:execute의 순간" (뒷가장자리) · 숫자 재측정
request-review ► 원장 N of N + ABANDON 목록을 인계물에
finish ────────► 미충족 원장이 있으면 끝낼 것이 없다
```

---

# 2. 포맷 — 게이트 원장

기계와 사람이 같은 포맷을 읽는다. 파서는 `src/core/gates/` 하나이고 훅·MCP가 공유한다 — unlazy는 파서가 둘(`gate-check`·`stop-hook`)이라 "포맷을 바꾸면 둘 다 고쳐라"를 기여 규칙으로 명문화해야 했다.

```markdown
# Gates: <task name>

Plan: plan.md

## Task 1 — <task name>

- [ ] G1: <관찰 가능한 결과 — 낯선 사람이 판정할 수 있게>
      CHECK: `<셸 명령, 그대로 실행됨>`
      EXPECT: `<부분문자열 | /정규식/>`
      EVIDENCE: pending

- [ ] G2: <수동 게이트 — 명령으로 증명할 수 없을 때만>
      EVIDENCE: pending

## Final

- [ ] G9: this repository's designated verification passes
      CHECK: `<저장소의 검증 명령 — CLAUDE.md가 정한 것>`
      EXPECT: `<성공 표지>`
      EVIDENCE: pending

ABANDON: G2 <사유 — 게이트를 포기해야 했을 때만>
```

| 규칙                                 | 내용                                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **체크박스 = 주장, EVIDENCE = 증명** | 박스가 체크됐는데 EVIDENCE가 `pending`이면 **UNMET** — 미체크보다 나쁜 상태로 센다. 이 장치가 잡으려는 실패 모드 그 자체이기 때문이다.                                                                  |
| **판정**                             | 관측된 출력 텍스트 안에서 `EXPECT` 매치가 판정한다(§6). `EXPECT` 없는 실행 가능 게이트는 어느 호스트에서도 met이 되지 않는다 — exit code는 호스트 선택 채널이라 증명이 아니다.                          |
| **`ABANDON`**                        | 정직한 포기. `status`는 해결로 세되 목록에 따로 올리고, 보고는 반드시 노출한다. 조용한 범위 축소의 유일한 합법적 대체물.                                                                                |
| **증거 상한**                        | EXPECT에 매치한 줄 + 마지막 비어 있지 않은 줄, 합쳐 200자 — `(exit N)`·`(via agent …)` 접미사를 포함한 전체에 적용. 로그를 붙이지 않는다. 원장은 태스크당 한 화면을 넘기지 않는다 — 자주 다시 읽히므로. |
| **id**                               | `G<n>`, 원장 안에서 전역 유일. `##` 헤딩은 태스크 묶음이며 `status`가 묶어 보고한다. 파서는 헤딩의 내용을 해석하지 않는다.                                                                              |
| **`Plan:` 머리줄**                   | 계획 파일의 경로(원장 기준 상대경로). 사람을 위한 줄이며 도구는 해석하지 않는다.                                                                                                                        |
| **리터럴 필드**                      | `CHECK`·`EXPECT` 값은 Markdown code span으로 감싼다. 같은 길이의 경계 백틱 런은 wrapper 문법이며, 런이 없는 기존 값은 그대로 받아들인다.                                                                |

**작성 규칙** (review-plan이 보는 것)

- **활동이 아니라 결과.** "All 8 endpoints return 200"은 검증 가능하고 "work on endpoints"는 아니다.
- **EXPECT는 결정적으로.** 성공에서만 나타나는 줄(`8/8 passed`)을 맞춘다. 양쪽에서 나타나는 줄(`done`)은 무의미하다.
- **포매터에 안전하게.** `CHECK`·`EXPECT` 값은 code span으로 감싼다. 값 안에 백틱이 있으면 더 긴 구분자 런을 쓰고, 값 자체가 백틱으로 시작하고 끝나면 구분자 안쪽 양끝에 패딩 공백 하나를 둔다. 파서는 그 공백 한 쌍을 벗긴다. 감싸지 않으면 `__x__`·`*x*` 같은 시퀀스가 재작성되어 명령 매칭과 게이트 판정이 조용히 사라질 수 있다.
- **exit 0 형으로.** 성공 시 exit 0인 명령이어야 stdout이 관측된다(§6). 실패를 기대하는 게이트는 stderr에 EXPECT를 맞춘다.
- **태스크당 1~4개의 실행 가능한 게이트.** 0개면 태스크가 미명세이고, 그 이상이면 태스크가 둘이다.
- **Final 게이트는 저장소의 지정 검증.** 태스크가 다 끝나도 전체가 끝난 것은 아니다 — unlazy의 브랜치 게이트를 한 단으로 접은 것이다.
- **숫자 규칙.** 최종 보고에 나올 숫자는 그것을 재는 CHECK를 가진 게이트를 받는다. unlazy 실험에서 보고의 유일한 거짓 주장은 기억으로 말한 숫자였다.

---

# 3. 작업 디렉토리 — `.seiri/tasks/<name>/`

계획과 원장은 **작업 이름**으로 소유된다. 세션이 아니다.

```
.seiri/tasks/<name>/
  plan.md        write-plan이 쓴 계획
  gates.md       게이트 원장 (§2)
  gates.lock     읽기-수정-쓰기 직렬화용 — 일시적, 비추적
```

| 규칙                 | 내용                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **이름**             | 기능 이름의 소문자 kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). `write-plan`이 정하고 한 줄로 밝힌다. 같은 이름은 같은 작업이다 — 두 세션이 같은 이름을 쓰면 의도한 공유다.                              |
| **세션 무관**        | 어떤 파일도 `session_id`를 담지 않고, 어떤 경로도 세션을 묻지 않는다. 세션이 오류로 죽어도 디렉토리는 남고, 다음 세션의 `execute`는 `status`로 이어받는다. 이것이 원장의 의의다.                       |
| **관측 대상 = 존재** | 훅과 `status`는 `.seiri/tasks/*/gates.md`를 전부 본다. 등록도 활성화도 없다 — 디렉토리가 있으면 관측되고, 없으면 끝이다.                                                                               |
| **정리는 사용자 몫** | seiri는 작업 디렉토리를 지우거나 보관하지 않는다. 끝난 작업을 남겨 두면 환기 줄이 그 사실을 계속 말한다 — 그것이 정리 신호다.                                                                          |
| **커밋 대상 아님**   | `.seiri/.gitignore`에 `tasks/` 전체를 더한다. 작업 상태는 로컬에 남아 세션을 넘어 이어지면 충분하고, 커밋 대상이 아니다 — 정리와 마찬가지로 보관도 사용자의 로컬 몫이다.                               |
| **P2 우선순위**      | 저장소가 계획의 위치를 명시적으로 달리 정하면 계획은 그곳에 두고 원장의 `Plan:` 머리줄이 그 경로를 가리킨다. 원장과 락의 집은 바뀌지 않는다.                                                           |
| **여러 작업**        | 한 워크스페이스에 작업 디렉토리가 여럿이면 전부 관측된다. 같은 CHECK가 둘 이상의 원장에 있으면 — 같은 명령이 같은 코드 상태에서 같은 결과를 냈으므로 — 둘 다 기록하고 판정 줄이 작업 이름을 전부 댄다. |

---

# 4. 역할 분담

| 성질                    | 자리                                         | 내용                                                                                                                      |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **생성**                | `write-plan`                                 | 작업 이름을 정하고 `plan.md`·`gates.md`를 만든다.                                                                         |
| **품질**                | `review-plan`                                | 실행 전에 게이트를 검토한다 — 게이트를 쓴 눈과 다른 눈으로.                                                               |
| **실행**                | Bash, 모델                                   | `CHECK` 명령을 **그대로** 실행한다. 권한·샌드박스는 하니스의 것. 실행 주체가 드라이버인지 위임자인지 seiri는 묻지 않는다. |
| **판정 관측·기록·보고** | PostToolUse / Claude의 PostToolUseFailure 훅 | 명령이 어느 작업 원장의 CHECK와 일치하면 EXPECT 대조 → 원장에 박스·EVIDENCE 기록 → **판정 한 줄** 주입. 기계 출처.        |
| **원장 상태**           | MCP 도구 `gates`                             | `status` · `abandon` · `record`(수동 게이트만). 프로세스를 띄우지 않는다.                                                 |
| **환기**                | UserPromptSubmit 훅                          | 미충족 원장이 있는 동안 매 턴 한 줄.                                                                                      |

unlazy 러너(`gate-check.mjs`)의 "충족 여부 검사"는 유지되되 셋으로 갈라진다 — 실행은 Bash, 대조·기록은 훅, 집계는 `status`. unlazy `stop-hook.mjs`의 역할은 §7로 간다.

**원장 파일의 쓰기 주체는 셋이다** — `write-plan`(생성), 훅(실행 가능한 게이트의 판정·증거), MCP(`abandon`·수동 `record`). 증거 텍스트가 원장에 사는 이유: `sessionSignals`는 명령 원문·출력·에러 텍스트를 저장하지 않는다는 경계를 갖고, 증거는 바로 그 출력의 발췌다. 증거의 집은 원장 자체이고, 원장 밖에 상태 파일은 없다.

**동시성**: 훅은 독립 프로세스이고 MCP는 상주 프로세스다. 한 원장의 읽기-수정-쓰기는 그 작업의 `gates.lock`(mkdir test-and-set)으로 직렬화한다 — `session-signals.lock`과 동형, 양방향 fail-open. 훅도 MCP(`abandon`·`record`)도 락 안에서 원장을 다시 읽고 쓴다 — 낡은 줄 좌표로 쓰는 경쟁을 막는다. 구현은 `core/utils/acquireLockDir`·`core/utils/hashCommand` — sessionSignals와 gates의 공통 조상.

**위임**: 위임된 태스크의 브리프는 자기 게이트 절을 그대로 받는다(`execute` 5단계의 "파일로 위임, 이력 금지"). **실측(2026-08-22, Claude Code 2.1.239, 헤드리스 — `phase0/subagent-hook-payload-2026-08-22.md`)**: 서브에이전트의 Bash에도 PostToolUse·PostToolUseFailure가 발화하고, `session_id`는 부모와 같으며, 페이로드에 `agent_id`·`agent_type`이 실린다(부모 호출엔 없음). 따라서 훅은 위임자의 실행을 구분한다: 기록하되 EVIDENCE에 `(via agent <id 앞 8자>)` 표지를 붙이고, `status`는 `met_by_agent` 목록을 따로 낸다. **드라이버가 다시 돌리면 표지가 사라진다** — "자기 서명은 무가치, 드라이버가 재실행한다"는 규칙이 prose가 아니라 원장의 표지로 보인다. 박스를 뒤집지 않는 쪽은 택하지 않는다 — 드라이버 자신이 서브에이전트인 구성에서 아무것도 뒤집히지 않게 되고, seiri는 실행 주체를 정하지 않기 때문이다.

---

# 5. MCP 도구 `gates` — 3번째 도구

`constants/toolNames.ts`에 `GATES: 'gates'`. 참조는 full-form `mcp__plugin_seiri_tools__gates`. 규모 목표 "MCP 도구 3개 이하" 안이며, tools INTENT의 "도구 수 2 불변"은 3으로 올린다 — 기준은 가이드라인이고, 역할이 늘면 기준을 올린다. absorb-first는 여전히 유효하다: 이 요구를 `rule_docs_sync`에 흡수하지 않는 이유는 의미 불일치(규칙 배포 ≠ 작업 상태)다.

MCP에 두는 이유 — 반복 상태 갱신이고 스킬 무관 완결 도구다. 원장은 수명을 갖고(열림 → N회 변이 → 종단), 읽는 쪽이 여럿이며(`execute`·`verify`·`finish`·`review-plan`·환기 표면), 세션을 넘어 살아남는 것이 존재 이유다. 단발 동작(`scaffold-pr`)과 반대편. "check"가 테스트 실행을 뜻하면 MCP 영역이 아니고, 완료 여부를 세는 것이면 MCP 영역이다 — 이 도구는 후자만 한다.

| 액션      | 입력                          | 한다                                                                                                                                          | 돌려준다                                                                                                                            |
| --------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `status`  | `task?`, `project_root?`      | `task`가 있으면 그 원장을, 없으면 `.seiri/tasks/*`를 전부 읽어 met / unmet / abandoned를 센다. 체크됐지만 EVIDENCE `pending`은 unmet.         | 작업별 카운트 · (task 지정 시) 태스크별 목록 · 미충족 게이트의 CHECK 원문 · ABANDON 목록 · `all_met: boolean` · `met_by_agent` 목록 |
| `abandon` | `task`, `gate_id`, `reason`   | 원장에 `ABANDON: G<n> <reason>` 줄을 추가한다. 사유 없는 포기는 거부한다.                                                                     | 갱신된 status                                                                                                                       |
| `record`  | `task`, `gate_id`, `evidence` | **수동 게이트(CHECK 없음)에만** 박스를 체크하고 EVIDENCE를 쓴다. CHECK가 있는 게이트에는 거부한다 — "실행 가능한 게이트는 실행으로 증명된다." | 갱신된 status                                                                                                                       |

**하지 않는 것**: 프로세스 스폰 · 코드 읽기·검색 · 원장 생성(`write-plan`의 몫) · 작업 디렉토리 삭제·보관 · 세션 훅에서의 호출 · 규칙 파일 접근 · `session_id` 관여.

---

# 6. 훅 — 판정은 출력이 한다 (PostToolUse / Claude의 PostToolUseFailure)

기존 번들 `bridge/post-tool-use.mjs`에 새 분기. 새 훅도, 새 이벤트도 아니다.

**게이팅 순서**: 다이얼(advisory면 기존대로 즉시 반환) → `.seiri/tasks/`가 없거나 비었으면 반환(비용: 디렉토리 존재 확인 하나) → 각 작업의 `gates.md`에서 CHECK 줄을 모아 `tool_input.command`와 대조 → 일치 없으면 기존 실패 연쇄 경로로 → 일치하면 게이트 경로. 일치는 `hashCommand`의 공백 정규화 동치다 — 줄바꿈이 달라도 같은 명령이고, 한 글자라도 다르면 다른 명령이다. `status`가 미충족 게이트의 CHECK 원문을 보여주므로 그대로 복사해 실행하는 것이 자연 경로다.

## 호스트가 주는 것은 다르다 (실측 2026-08-23 — `phase0/`)

|           | Claude Code                                                                                                      | Codex                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| exit 0    | `PostToolUse` · `tool_response` **객체**(`stdout`·`stderr` 분리)                                                 | `PostToolUse` · `tool_response` **문자열**(모델이 보는 출력) |
| exit≠0    | `PostToolUseFailure` · `error` = `Exit code N` + **명령 출력 전체**(stdout·stderr 합쳐짐) · `tool_response` 없음 | 같은 `PostToolUse` — 실패 전용 이벤트가 **없다**             |
| exit code | 실패 페이로드의 `Exit code N`에서만                                                                              | 클래식 셸은 `Exit code: N`, **코드모드 exec은 싣지 않는다**  |
| 중단      | `is_interrupt`                                                                                                   | 대응 필드 없음                                               |
| 공통      | `cwd` · `session_id` · `tool_name`("Bash") · `tool_input.command` · `agent_id`·`agent_type`(위임 시)             | 같음                                                         |

**두 호스트가 공유하는 유일한 판정 재료는 관측된 출력 텍스트다.** exit code는 호스트 선택 채널이고, 이벤트 이름은 Claude의 우연한 형태다. 판정을 그 둘에 걸면 같은 원장이 호스트마다 다르게 읽힌다 — 실제로 Codex에서 EXPECT 있는 게이트는 영구 unmet, EXPECT 없는 게이트는 항상 met이 됐다(08-23 확인).

**실패 연쇄는 원장에 CHECK로 등록된 명령에서만 호스트 동일하다.** 명시적 failure 이벤트와 exit가 없으면 CHECK의 `unmet`을 실패, 전부 `met`을 성공으로 재사용한다. CHECK 밖이거나 `unjudgeable`인 Codex 명령은 실패를 알 수 없으므로 세지도 초기화하지도 않는다 — 거짓 발화와 거짓 성공 대신 침묵을 택하는 허용 차이다.

## 정규화 — 세 형태를 하나로

훅은 페이로드를 먼저 접는다: `{ text, exit?, interrupted? }`.

- Claude 성공: `text = stdout + '\n' + stderr`, `exit = 0`.
- Claude 실패: `text = error`, `exit = /Exit code (\d+)/`, `interrupted = is_interrupt`.
- Codex(문자열): `text = tool_response`, `exit = /Exit code:? (\d+)/`가 있으면 그 값, 없으면 **undefined**.
- 그 밖의 형태: `text = ''`, `exit = undefined` — 판정은 아래 규칙이 안전한 쪽으로 처리한다.

**exit는 판정하지 않는다.** 이유 문구와 증거 접미사 `(exit N)`에만 쓴다.

## 판정 표 — 모든 호스트에서 같다

| 상황                                  | 원장                                                                                | 판정 한 줄 (형태)                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| EXPECT 매치                           | 박스 `[x]`, EVIDENCE = 매치 줄 \| 마지막 줄 (+`(exit N)` — exit를 알고 0이 아닐 때) | `[seiri] payment-refactor G3 met — evidence recorded (4/7, next G5)`                                 |
| EXPECT 있음 · 불일치                  | 되돌림 규칙                                                                         | `[seiri] payment-refactor G3 unmet — EXPECT "8/8 passed" not in output (exit 1)`                     |
| EXPECT 있음 · 출력 없음               | 되돌림 규칙                                                                         | `[seiri] payment-refactor G3 unmet — no output (exit 1)`                                             |
| EXPECT 없음 · CHECK 있음              | 되돌림 규칙                                                                         | `[seiri] payment-refactor G3 unjudgeable — a runnable gate needs an EXPECT that only success prints` |
| 위 어느 경우든 `agent_id`가 있는 호출 | 같은 규칙 + EVIDENCE 끝에 `(via agent aa8d87f5)`                                    | `[seiri] payment-refactor G3 met via agent aa8d87f5 — driver re-run clears the marker`               |

**exit 0이 더는 증명이 아니다 (08-23 개정).** 예전 규칙은 EXPECT가 없으면 exit 0을 증명으로 삼았다 — Codex 코드모드는 exit를 싣지 않으므로 그 게이트는 호스트에 따라 갈린다. 그래서 **실행 가능한 게이트는 EXPECT를 갖는 것이 요건**이고, 없는 게이트는 어느 호스트에서도 met이 되지 않는다.

**성공은 출력에 남아야 한다.** 표준형은 `<command> && echo <MARKER>` + `EXPECT: <MARKER>`다. `&&`가 실패 시 마커를 막으므로, exit code를 못 보는 호스트에서도 판정이 같다. 자연히 성공에만 나타나는 문자열(`TYPECHECK_OK`, `/Tests\s+\d+ passed/`)도 같은 자격이다.

**`unobservable` 범주는 폐기했다 (08-23).** 근거였던 "exit≠0이면 stdout이 보이지 않는다"가 실측으로 거짓이었다 — 실패 페이로드는 stdout·stderr를 합쳐 싣는다. 출력이 정말 비어 있는 실패는 별도 범주가 아니라 `unmet — no output`이며, 따라서 **met였던 게이트가 조용히 깨져도 되돌림이 적용된다**(옛 설계의 구멍이 함께 닫힌다).

**판정은 침묵하지 않는다.** CHECK와 일치하는 Bash 호출은 정확히 한 줄의 판정을 돌려받고, 원장은 모델이 듣지 못한 채 바뀌지 않는다.

**여러 작업에 같은 CHECK**: 일치하는 원장 전부에 기록하고 한 줄에 작업 이름을 전부 댄다 — `[seiri] G9 met in payment-refactor, login-fix — evidence recorded`. 합치기는 같은 id·전부 met·드라이버 호출일 때만이다 — agent 표지나 unmet 사유가 섞이면 작업별 판정을 `; `로 이어 붙인 한 줄이다.

**되돌림**: 이미 met인 게이트의 재실행이 met이 아니면(unmet·unjudgeable 모두) 박스를 풀고 증거를 `pending (regressed)`로 바꾼다. 원장은 마지막 실행을 말한다 — 회귀는 보여야 한다.

**실패 연쇄와의 합류**: CHECK 호출은 기존 카운터도 센다. 임계에 닿은 호출에서는 판정 줄이 연쇄 힌트를 품는다 — `G3 unmet — exit 1 (3rd consecutive; /seiri:trace-cause owns it)`. 한 호출에 한 줄.

**중단된 실행**: Claude는 `is_interrupt`로 알려주므로 판정하지 않는다. Codex엔 그 필드가 없어 중단은 빈 출력으로 보이고 `unmet — no output`으로 떨어진다 — 허용되는 호스트 차이이며, 방향은 언제나 보수적이다(거짓 met이 아니라 불필요한 unmet).

---

# 7. 매 턴 환기 — UserPromptSubmit

조건: `.seiri/tasks/*/gates.md` 중 `met < total − abandoned`인 원장이 있고, 다이얼 standard↑. 기존 상기 줄 뒤에 한 줄 — 작업이 여럿이어도 한 줄:

```
[seiri] Ledger payment-refactor: 4/7 met, 1 abandoned — next G5; `/seiri:execute` owns it.
[seiri] Ledgers: payment-refactor 4/7, login-fix 2/3 — `/seiri:execute` owns them.
```

strict도 같은 줄이다 — 이미 소유자를 이름으로 댄다. 비용: 미충족 원장이 있는 동안 +1줄(전부 차거나 디렉토리가 정리되면 사라진다).

**이것이 unlazy Stop 훅의 seiri 번역이다.** unlazy는 "못 멈춘다"는 벽을 세우고 진행 없는 차단 6회 뒤 풀어준다. seiri는 벽 대신 **뒷가장자리(back-edge)** — 원장이 차기 전의 완료 주장을 `verify`가 `execute`의 순간으로 되돌리고, 매 턴의 한 줄이 그 사실을 컴팩션과 세션 교체 너머로 나른다. 선출은 강제하고 채택은 모델에 남는다: 사유를 말하고 이탈할 수 있다. 루프 가드가 필요 없는 이유도 여기 있다 — 비차단 자체가 가드다. `ABANDON`은 존중된다.

---

# 8. 스킬 개정

새 스킬은 없다 — 게이트 규율은 `write-plan → review-plan → execute → verify → request-review`를 가로지르는 횡단 관심사이고, 별도 스킬은 `execute`의 원장과 `verify`의 증거 규칙의 이중 사본이 된다. 포맷 설명은 `skills/execute/references/gates-format.md`에 두고(상시 비용 0) 다른 스킬은 경로로 참조한다. 각 `SKILL.md`는 4,096바이트 안.

| 스킬             | 추가되는 것 (요지)                                                                                                                                                                                                                                               | 현재  | 여유  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- |
| `write-plan`     | 작업 이름을 정하고(kebab-case, 한 줄로 밝힘) `.seiri/tasks/<name>/plan.md`에 저장 — 저장소 명시 지침이 다른 위치를 정하면 그곳에. 3단계 "명령과 기대 출력"을 **게이트로 산출** — `gates.md`, 태스크당 1~4개, Final은 지정 검증. 게이트 없는 태스크는 계획 실패.  | 2,874 | 1,222 |
| `review-plan`    | 2단계에 게이트 품질 — 결과인가 활동인가, EXPECT가 결정적인가, exit 0 형인가, 숫자에 CHECK가 있는가. 게이트를 쓴 눈과 다른 눈이 본다(challenge 위임 시 원장도 인계).                                                                                              | 3,399 | 697   |
| `execute`        | 1단계 `status`로 시작·재개(세션이 바뀌었어도 원장이 어디까지 왔는지 말한다). 2단계 진행 원장을 **게이트 원장**으로(회고형 → 전망형). 태스크 닫기 = 그 태스크의 게이트 met. 위임 반환 시 CHECK 재실행. "모든 태스크 완료" = `status` `all_met`. 이탈은 `abandon`. | 2,761 | 1,335 |
| `verify`         | 1단계 "증명할 명령"은 게이트의 CHECK다. 4단계 뒤: `status`가 UNMET이면 그 완료 주장은 `/seiri:execute`의 순간이다(뒷가장자리). 보고할 숫자는 재측정 또는 "unverified".                                                                                           | 2,012 | 2,084 |
| `request-review` | 2단계 인계물에 원장 N of N과 ABANDON 목록.                                                                                                                                                                                                                       | 1,851 | 2,245 |
| `finish`         | 1단계 검증 전에 `status`(전체) — 미충족 원장이 있으면 보고하고 멈춘다: 끝낼 것이 없다. 작업 디렉토리 정리는 권하되 하지 않는다.                                                                                                                                  | 2,033 | 2,063 |

`implement`·`trace-cause`·`receive-review`·`trace-structure`는 바뀌지 않는다.

**상태: closed (2026-08-23).** `write-plan`은 성공 때만 출력되는 EXPECT를 모든 게이트에 요구하고, `review-plan`은 EXPECT 없는 실행 가능 게이트를 rework로 돌린다. 나머지 스킬의 계약은 유지했으며 여섯 파일 모두 4,096바이트 상한 안이다.

---

# 9. 다이얼

| 위치       | 게이트 원장                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `advisory` | 훅은 `.seiri/tasks/`를 읽지 않고 기록하지 않는다. 선출 없는 기본기 모드는 워크플로우 아티팩트를 내려놓는다(02 §4) — `execute`가 선출되지 않으니 원장도 태어나지 않는다. |
| `standard` | 전부 활성 — 기록·판정 줄·환기 줄.                                                                                                                                       |
| `strict`   | `standard`와 같다. 환기 줄은 이미 소유자를 이름으로 댄다.                                                                                                               |

config에 새 필드는 없다 — 다이얼이 seiri가 저장하는 유일한 설정이다. 별도 토글은 T2 관측 뒤의 결정이다.

---

# 10. 수용 기준

### AC-gates-no-execution — 실행하지 않는다

- `gates` 도구의 어떤 액션도 프로세스를 띄우지 않는다.
- `record`는 CHECK가 있는 게이트를 거부한다.

### AC-gates-verdict-never-silent — 판정은 침묵하지 않는다

- standard↑에서 어느 작업 원장의 CHECK와 일치하는 Bash 호출은 정확히 한 줄의 판정을 주입한다 — met · unmet(이유) · unjudgeable(처방).
- 원장의 박스·EVIDENCE가 바뀐 호출에는 반드시 판정 줄이 있다.

### AC-gates-evidence-provenance — 증거의 출처

- CHECK가 있는 게이트의 EVIDENCE는 훅만 쓴다 — `tool_response` 또는 `error`에서. 모델이 옮겨 적은 텍스트는 런너블 게이트의 증거가 되지 못한다.
- `agent_id`가 있는 호출이 쓴 EVIDENCE는 `(via agent …)` 표지를 갖고, `agent_id`가 없는 호출이 덮어쓰면 표지가 사라진다. `status`는 표지가 남은 게이트를 `met_by_agent`로 따로 센다.

### AC-gates-claim-is-not-proof — 주장은 증명이 아니다

- `status`는 체크됐지만 EVIDENCE가 `pending`인 게이트를 unmet으로 센다.
- CHECK는 있는데 EXPECT가 없는 게이트는 어느 호스트에서도 met이 되지 않는다(`unjudgeable`) — exit 0은 증명이 아니다.
- 되돌림: met 게이트의 실패한 재실행은 박스를 풀고 `pending (regressed)`를 남긴다.

### AC-gates-abandon-visible — 포기는 보인다

- `ABANDON`된 게이트는 `all_met` 계산에서 해결로 세되 `status`의 별도 목록에 오른다.
- 사유 없는 `abandon`은 거부된다.

### AC-gates-session-independent — 세션을 모른다

- 어떤 코드 경로도 `session_id`를 읽거나 저장하지 않는다. `.seiri/tasks/<name>/` 아래에 세션 식별자가 없다.
- 세션을 끝내고 새 세션에서 `status`만 호출해도 같은 원장이 같은 상태로 돌아온다.

### AC-gates-task-isolation — 작업은 이름으로 갈린다

- 서로 다른 이름의 작업 디렉토리는 서로의 원장을 바꾸지 않는다.
- 같은 CHECK가 둘 이상의 원장에 있으면 전부 기록되고 판정 줄이 작업 이름을 전부 댄다.

### AC-gates-no-state-outside-ledger — 원장 밖에 상태 없음

- seiri가 `.seiri/tasks/<name>/`에서 읽고 쓰는 것은 `plan.md`·`gates.md`·일시적 `gates.lock`뿐이다 — 포인터·캐시·등록 파일은 없다. 같은 디렉토리의 다른 파일(진행 메모·위임 보고 등)은 사용자·위임자의 것이며 seiri는 해석하지 않는다.
- `.seiri/.gitignore`에 `tasks/`가 더해진다 — 작업 디렉토리 전체가 비추적이다.

### AC-gates-host-parity — 호스트가 판정을 바꾸지 않는다

- 같은 저장소 상태·같은 명령·같은 원장이면 Claude Code와 Codex가 같은 판정 줄과 같은 원장 바이트를 낸다. 판정은 정규화된 출력 텍스트와 `EXPECT`만으로 결정되고, exit code·이벤트 이름·`tool_response`의 형태는 판정에 들어가지 않는다.
- 허용되는 차이는 호스트에 이벤트나 필드가 없을 때뿐이며(현재: Codex의 `PostToolUseFailure` 부재, `is_interrupt` 부재), 그 차이는 **보수적 방향으로만** 나타난다 — 어떤 호스트에서도 거짓 met은 생기지 않는다.
- 검증: 호스트별 페이로드 픽스처(claude-success · claude-failure · codex-string · codex-string-with-exit-header · 빈 출력)가 같은 organ을 통과해 같은 판정·같은 원장을 낸다.
- 실패 연쇄는 명시적 failure·exit가 없는 CHECK 호출에서 같은 `unmet` 카운트와 `met` 리셋을 만들며, 판정할 수 없는 Codex 호출은 기존 연쇄 상태를 바꾸지 않는다.

### AC-gates-dial — 다이얼

- advisory에서 훅은 `.seiri/tasks/`를 읽지도 쓰지도 않는다.
- 판정 줄·환기 줄은 standard↑에서만 나간다.

### AC-gates-concurrency — 동시 쓰기

- 한 메시지의 병렬 CHECK 호출이 같은 원장에 도착해도 서로의 게이트를 지우지 않는다. 검증 대상은 `bridge/` 번들이다.
- 락은 턴을 막지 않는다 — 시한 뒤 직렬화 없이 진행.

### AC-gates-budget — 규모

- 등록 도구 3개. `SHIPPED_SKILLS` 불변. 모든 `SKILL.md` ≤ 4,096바이트. 훅 번들 바이트 캡 안.
- 환기 줄은 미충족 원장이 있는 동안에만, 작업 수와 무관하게 턴당 최대 1줄.

### AC-gates-no-blocking — 차단 없음

- 어떤 경로도 `decision` 제어를 반환하지 않는다 (AC-context-only 계승).

**상태: closed (2026-08-23).** 사전 구현 실행은 호스트 정규화·EXPECT 부재·빈 출력·생성 wiring에서 28개 테스트가 의도대로 실패했고, Claude 성공의 `exit: 0` 단언도 해당 절을 제거하면 1개 테스트가 그 차이로 실패했다. 수정 후 루트 `yarn typecheck`·`yarn test:run`·`yarn lint`는 모두 exit 0이며 전체 Vitest는 681개 파일·5,606개 테스트를 통과했다. `plugin:adapters:check`는 224개 산출물이 unchanged임을 확인했고, shipped MCP `tools/list`는 세 도구를, Codex 실사용 훅은 `G9 met` 판정 줄과 같은 원장 증거를 돌려줬다. 훅 번들은 15,390/16,384바이트다.

---

# 11. 측정

unlazy의 수치(노력 1.6~~3.9배, 배포 전 자가 발견 결함 4~~10개)는 v1 prose 조건의 것이고, 게이트·훅 자체는 unlazy 안에서도 측정되지 않았다. seiri는 이 장치를 **자기 측정 산출물**로 편입한다 — 원장에 EVIDENCE가 쌓이는 것 자체가 준수 신호다.

| 항목                                   | 공급                                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 계획이 있는 작업의 원장 존재율         | `compliance-scan` 아티팩트 항목에 원장 추가                                                                                                                                                                                                                |
| done-claim 전 `all_met` 비율           | `compliance-scan` 게이트 항목                                                                                                                                                                                                                              |
| ABANDON 보고율 (원장의 ABANDON ↔ 보고) | `compliance-scan`                                                                                                                                                                                                                                          |
| 판정 줄·환기 줄의 과잉 여부            | T2·Phase 3 사례 관측                                                                                                                                                                                                                                       |
| 증거 상한(200자)의 적정성              | T2 관측 — 관측 뒤 조정 가능한 유일한 값                                                                                                                                                                                                                    |
| 서브에이전트의 Bash에 훅이 발화하는지  | **실측 완료(2026-08-22)** — 발화함 · `session_id` 동일 · `agent_id`·`agent_type` 실림. §4 위임 절에 반영                                                                                                                                                   |
| 호스트별 판정 동일성 (Claude ↔ Codex)  | **픽스처 고정·Codex 실사용 완료(2026-08-23)** — 호스트별 페이로드 5형태가 같은 organ을 지나 같은 판정·같은 원장을 내며, Codex 프로젝트 훅에서 `G9 met` 추가 컨텍스트와 원장 기록을 확인했다(AC-gates-host-parity)                                          |
| Codex에서 훅 명령이 실제로 실행되는지  | **실측 완료(2026-08-23, Codex 0.149.0)** — 성공·비0 Bash 모두 PostToolUse로 발화. 새 seiri 번들을 연결한 성공 Bash는 판정 줄과 EVIDENCE를 남겼다. `${CLAUDE_PLUGIN_ROOT}`는 공식 호환 변수이며 기존 설치의 SessionStart·UserPromptSubmit 실행으로도 확인됨 |
| Codex의 Skill 로드 관측 가능 여부      | **실측 완료(2026-08-23)** — 호출 가능 도구와 공식 훅 표면에 `Skill`이 없다. 대체 신호를 추측하지 않고 Codex에서 D1의 Skill 관측만 비활성인 허용 차이로 둔다                                                                                                |

fail-cheap 요건(비차단·제거 가능·저비용·2차 비용 상한)은 설계로 충족된다. "기본 OFF"는 환기·기록 부분만 다이얼로 충족되고 스킬 본문은 다이얼과 무관하다 — 이 한 항은 위 관측이 대신 답한다.

---

# 12. 하지 않는 것

- **Depth Tree · solo/orchestrated 모드** — `write-plan`의 "리뷰 가능한 이음새에서 자르기"가 한 단의 분해이고 그것으로 충분하다. 실행 주체(단일/다중 에이전트)는 seiri가 정하지 않는다.
- **Stop 훅** — 차단 훅 없음 불변. 역할은 §7.
- **CHECK의 값** — 어떤 명령을 돌리고 무엇을 기대할지는 계획과 저장소가 정한다.
- **MCP의 프로세스 스폰** — §0 권한 경계.
- **세션 식별자** — 주입도 저장도 없다. 원장은 세션을 모른다.
- **등록·포인터·캐시** — 관측 대상은 디렉토리의 존재다.
- **작업 디렉토리의 삭제·보관** — 사용자의 몫.
- **루프 가드** — 비차단이 곧 가드.
- **증거 텍스트의 원장 밖 저장** — 증거의 집은 원장.

---

# 13. 명명 주의

`templates/gates/`는 **저장소 게이트 스캐폴드**(pre-commit·CI의 값 없는 골격)이고, 도구 `gates`와 `gates.md`는 **작업 원장**이다 — 한 낱말이 둘을 가리킨다. 구현 시 스캐폴드 디렉토리를 `templates/scaffolds/`로 옮겨 충돌을 푼다. 스캐폴드는 배포 대상이 아니라 매니페스트와 무관하고, 참조하는 곳은 `setup` 스킬뿐이다.
