---
created: 2026-08-23
updated: 2026-08-23
tags: [ogham, seiri, codex, claude-code, hooks, harness-engineering, cross-host, plugin-design, audit, request-brief]
layer: 4
title: "요청: ogham 플러그인 호스트 패리티 감사 — Claude Code ↔ Codex 훅·도구 동작 차이 (2026-08-23)"
expires: 2026-09-22
mentioned_persons: [Vincent Kelvin]
gist: "다른 세션에 건네는 감사 요청문: seiri #118에서 드러난 \"한 호스트의 풍부한 신호에 걸린 판정\" 결함이 ogham의 다른 플러그인·지점에도 있는지 검사·보고(수정 금지). 호스트 사실표·검사 축 5·체크리스트 6·등급·보고 형식 포함"
---
> **용도**: 이 문서는 별도 세션(Claude Code 또는 Codex, 작업 디렉토리 `/Users/Vincent/Workspace/ogham`)에 그대로 건네는 **감사 요청문**이다. 요청자는 Vincent. 읽는 에이전트는 이 문서 외의 대화 맥락을 갖지 않는다고 가정하고 썼다.
>
> **사용법**: 세션에 이 문서 경로를 주고 "이 요청문의 §3 대상 중 `<plugin>`(또는 전부)을 §5 절차로 검사해 §7 형식으로 보고하라"고 지시한다. 플러그인 하나씩 다른 세션에서 돌려도 된다 — 보고서는 플러그인 단위로 독립이다.
>
> **이력**: 2026-08-23 전체 플러그인 감사 1회 수행됨 — 결과와 초판의 오독 정정은 §11.

## 0. 한 줄

seiri 게이트 원장에서 발견된 결함 — **판정이 한 호스트(Claude Code)만 주는 풍부한 신호에 걸려 있어, 다른 호스트(Codex)에서 에러 없이 틀린 답을 낸 것** — 과 같은 형태의 문제가 ogham의 다른 플러그인·다른 지점에도 있는지 찾아 **보고**한다. 이 요청의 산출물은 보고서 1편이다. **코드 수정은 하지 않는다**(§8).

## 1. 선례 — seiri 게이트 원장 (2026-08-23, PR #118 `af086d17`)

- **증상**: Codex에서 EXPECT 있는 게이트는 영구 `unmet`, EXPECT 없는 게이트는 명령이 실패해도 `met`(거짓 met), 실패 연쇄(`trace-cause` 발화)는 한 번도 발화하지 않음. **예외가 아니라 오판정** — 로그에 아무 에러도 없었다.
- **원인**: 판정이 두 가정에 묶여 있었다. ① 실패는 `PostToolUseFailure`라는 별도 이벤트로 온다 ② 성공의 `tool_response`는 `{stdout, stderr}` 객체다. 둘 다 Claude Code의 형태였고, Codex는 실패도 `PostToolUse`로 보내며 `tool_response`가 문자열이다. 판정 organ을 고친 뒤에도 **같은 페이로드를 읽는 다른 소비자**(실패 연쇄 카운터)가 이벤트 이름에 남아 "모름"을 성공으로 단정했다.
- **뿌리**: 표본 하나로 한 일반화 두 건 — "실패하면 stdout이 안 보인다"는 출력 없는 명령(`false`) 한 건에서(실측 결과 거짓), "실패는 별도 이벤트"는 Claude 한 호스트에서.
- **처방의 형태**: 페이로드를 `{text, exit?, interrupted?}`로 정규화하는 곳 하나(`toCheckOutcome.ts`) → 판정은 두 호스트가 반드시 주는 **관측된 출력 텍스트**로만, exit code는 장식(`judgeCheckOutcome.ts`) → 실패 여부는 삼상태(호스트가 말했다 → exit를 안다 → 원장이 말한다 → **아무도 안 말하면 세지 않는다**, `bashOutcome.ts`) → 호스트별 픽스처로 같은 판정 줄·같은 원장 바이트를 고정(`hostParity.test.ts`) → Codex에 없는 이벤트는 `tools/plugin-compiler`가 생성물에서 제거.
- **원리**: 이식 가능한 판정은 호스트들의 **공통 최소 채널**로만 구성한다. 멀티 호스트 지원은 어댑터를 두는 일이 아니라 **판정의 입력 집합을 좁히는 일**이다 — 어댑터는 형태를 접을 수 있지만 한 호스트에만 있는 정보를 만들어낼 수는 없다.

## 2. 기준 호스트 사실 — 이 표 밖의 것은 전부 "가정"으로 표기한다

근거 등급: **실측**(ogham `.metadata/seiri/phase0/`) · **공식**(호스트 문서) · **코드**(compiler 상수) · **미측정**. Claude Code 2.1.239/240, codex-cli 0.149.0 기준이며 버전이 다르면 재확인 대상이다.

| 항목 | Claude Code | Codex | 근거 |
| --- | --- | --- | --- |
| 플러그인 훅이 받는 이벤트 | `PostToolUseFailure`·`InstructionsLoaded` 포함 | `PreToolUse` `PermissionRequest` `PostToolUse` `PreCompact` `PostCompact` `SessionStart` `UserPromptSubmit` `SubagentStart` `SubagentStop` `Stop` `SessionEnd` — `tools/plugin-compiler/src/constants/hosts.ts` `CODEX_HOOK_EVENTS` | 코드 |
| Bash 실패 이벤트 | `PostToolUseFailure` (별도) | **없음** — `PostToolUse`가 비-0 종료에도 발화 | 실측·공식 |
| `tool_response` | 객체 `{stdout, stderr, interrupted, …}` | **문자열** (모델이 보는 출력 텍스트). **MCP 도구는 양쪽 다 MCP call result JSON** — Bash 표본을 MCP에 일반화하지 말 것(감사 08-23) | 실측·공식 |
| exit code | 실패 페이로드의 `error` = `Exit code N` + stdout·stderr 합본(출력 없는 실패는 `Exit code N`만). 성공 페이로드엔 없음 | **어느 필드에도 없음** | 실측 |
| `is_interrupt` | 실패 페이로드에 있음 | 없음 | 실측 |
| 공통 키 | `cwd` `session_id` `hook_event_name` `transcript_path` `tool_name` `tool_input` | 같은 키 + `model` `permission_mode` `tool_use_id` `turn_id` | 실측 |
| 서브에이전트 식별 | `agent_id` — 서브에이전트의 호출에만 실림(08-22 실측) | **미측정** | 실측/미측정 |
| `Skill` 도구 | 있음 (`PostToolUse` matcher `Skill` 동작) | **없음** — 대체 신호 추측 금지 | 실측 |
| 파일 편집 도구 이름 | `Read` `Write` `Edit` … | 정규 도구명은 **`apply_patch`**, 패치 본문은 `tool_input.command`(V4A 형식: `*** Add/Update/Delete File:`, `*** Move to:`). `Edit`/`Write` matcher 별칭으로 훅이 걸려도 페이로드의 이름은 `apply_patch`. `Read`는 없고 shell(`cat`)로 읽음 | 공식·실측(감사 08-23) |
| 플러그인 루트 변수 | `CLAUDE_PLUGIN_ROOT` | `PLUGIN_ROOT` `PLUGIN_DATA` + 호환 `CLAUDE_PLUGIN_ROOT` `CLAUDE_PLUGIN_DATA` | 공식·실측 |
| 세션·호스트 식별 환경 변수 | `CLAUDE_PID`, `CLAUDE_CONFIG_DIR` | **자동 주입 없음** (`CLAUDE_PID` `CLAUDE_CONFIG_DIR` `CODEX_HOME` `OGHAM_HOST` 모두 미주입, 감사 08-23). `process.ppid`는 MCP와 `libs/run.cjs` 경유 훅에서 같은 값이라는 보장이 없음 | 실측 |
| 훅 활성화 | 기본 동작 | `[features] hooks = true` + 훅 소스 신뢰 승인(`~/.codex/config.toml` `hooks.state."<source>:<event>:i:j"`). 0.149.0에서 hooks는 stable/enabled | 실측 |
| 훅 출력 주입 | `hookSpecificOutput.additionalContext` | `SessionStart`·`UserPromptSubmit` 주입은 실제 관측. `PostToolUse.additionalContext`는 developer context로 추가(공식 문서) — 실측은 아직 | 실측/공식 |
| 훅 매니페스트 | `plugins/<p>/hooks/hooks.json` | `.codex-plugin/plugin.json`의 `hooks` 필드가 **공유 `hooks/hooks.json`을 가리킬 수 있음** — 전용 `.codex-plugin/hooks.json`은 필수가 아니며, 있으면 compiler가 생성하고 미지원 이벤트(`codex-unknown-event`)·미지원 matcher(`Skill`)를 제거 | 공식·코드 |
| 지침·규칙·에이전트 표면 | `CLAUDE.md`, `.claude/rules/*.md`, `.claude/agents/*.md` | `AGENTS.md` 계층, `.codex/agents/*.toml`. **`.codex/rules/*.rules`는 명령 승인 정책이지 행동 규칙의 대체물이 아님** | 공식(감사 08-23) |
| 로컬 설치 플러그인의 훅 파일 | 세션 중 고정되는 것은 **등록**, 파일 내용은 발화마다 새로 읽힘 | 미측정 | 실측/미측정 |

**경고**: 하니스 사실은 **명령 형태별·호스트별**로 확인한 뒤에만 표에 올린다. 표본 하나로 일반화한 것이 선례의 뿌리였다. 감사 중 새로 확인한 사실은 보고서 §7-5에 근거 등급과 함께 적는다.

## 3. 검사 범위

### 대상 (2026-08-23 현재 인벤토리 — 감사 시작 시 §5 Step 0으로 재확인)

11개 플러그인 전부 `.codex-plugin/plugin.json`을 가져 **Codex에 배포된다**. 전용 `.codex-plugin/hooks.json`은 filid·seiri 둘뿐이지만, 나머지 훅 플러그인은 `plugin.json`의 `hooks` 필드가 공유 `hooks/hooks.json`을 가리키므로 **등록 부재가 아니다**(감사 08-23 확인 — 초판의 "없음"은 오독이었다).

| 플러그인 | Claude 훅 (`hooks/hooks.json`) | Codex 훅 | 우선 |
| --- | --- | --- | --- |
| **filid** | `SessionStart` `UserPromptSubmit` `PreToolUse[Read\|Write\|Edit]` | 전용 매니페스트 — `PreToolUse[Read\|Write\|Edit\|Bash]` (`Bash`는 compiler의 `Read→Bash` 폴백, 선언된 차이) | 상 |
| **maencof** | `SessionStart` `UserPromptSubmit` `PreToolUse[*]` `PostToolUse[*]` | 공유 매니페스트 참조(등록 존재) | 상 |
| **seiri** | `SessionStart` `UserPromptSubmit` `PostToolUse[Bash,Skill]` `PostToolUseFailure[Bash]` `SubagentStart` | 전용 매니페스트 (`PostToolUseFailure`·`Skill` 제거됨) | 중 — 선례 |
| cennad | `SessionStart` `UserPromptSubmit` | 공유 매니페스트 참조(등록 존재) | 중 |
| maencof-lens | `SessionStart` | 공유 매니페스트 참조(등록 존재) | 하 |
| atlassian · deilen · entrez · imbas · prawf · r-statistics | 훅 없음 | `plugin.json`(+`skills`) | 하 — 축 E만 |
| `tools/plugin-compiler` | — | **호스트 어댑터 규칙의 소유자** | 상 |

### 검사 축

- **A. 등록** — 매니페스트: 이벤트·매처가 호스트별로 같은가. 다르면 **선언된 차이**인가(문서·주석·테스트에 근거가 있는가), 아니면 누락인가. Codex 매니페스트 **부재**는 의도인가(훅이 Claude 전용 기능이라서) 누락인가.
- **B. 소비** — 훅·MCP 소스가 페이로드에서 읽는 **모든** 필드: 필드의 존재·형태(객체/문자열/머리줄)를 가정하는 곳. 같은 필드를 읽는 소비자를 **전부** 센다(선례: organ 하나만 고치고 닫힌 줄 알았음).
- **C. 판정·폴백** — 신호가 없을 때의 기본값이 관대한가. 특히 **차단/허용 결정**(`PreToolUse` deny·redirect), **기록**(activity·signal 파일), **카운터**(연쇄·비율). "신호 없으면 통과/성공"은 신호가 구조적으로 없는 호스트에서 거짓 양성 기계가 된다.
- **D. 고정** — 호스트별 페이로드 픽스처가 같은 출력을 내는지 잠그는 테스트가 있는가. 없으면 다음 변경에서 조용히 다시 갈라진다.
- **E. 도구·환경 가정** (훅 밖) — 스킬 본문·MCP 응답·규칙 문서가 호스트 전용 **도구 이름**(`Skill` `Read` `Edit` `Task` `AskUserQuestion` …)·**경로**(`~/.claude`, `.claude/rules`)·**환경 변수**를 지시·가정하는가. Codex에서 그 지시는 무엇이 되는가(무동작인지, 다른 도구로 해석되는지).

### 범위 밖

Unix↔Windows 이식성(`.metadata/cross-platform/` — 다른 축), 호스트와 무관한 MCP 도구 내부 로직, 그리고 **수정**.

## 4. 결함 패턴 체크리스트 — 지점마다 여섯 질문

| # | 질문 | 어디를 보나 |
| --- | --- | --- |
| Q1 | 판정이 **한 호스트에만 있는 이벤트 이름**에 걸려 있나? | `hook_event_name` 비교, `PostToolUseFailure`·`InstructionsLoaded`·`Notification` 참조 지점 |
| Q2 | 페이로드 필드의 **형태**(객체 vs 문자열, `Exit code` 머리줄, 배열)를 가정하나? | `tool_response`·`tool_input.*`·`.stdout`·`.stderr`·`.error`·`is_interrupt`·`exit_code`를 읽는 지점 — 각각 `typeof` 가드 유무 |
| Q3 | 신호가 없을 때 **관대한 폴백**이 있나(통과·성공·met·allow)? | Q1·Q2 지점의 `??`·`\|\|`·`?? 0`·`?? true`·`default:` 분기 — "모름"이 어느 쪽으로 떨어지는지 |
| Q4 | 같은 페이로드를 읽는 **소비자를 전부** 셌나? | 한 필드를 한 지점에서 고쳤다면 같은 필드의 나머지 grep 결과를 대조. 번들 진입점(`bridge/*.mjs`)에서 호출 그래프를 따라감 |
| Q5 | **도구 이름·입력 스키마** 자체가 호스트별로 다르지 않나? | 매니페스트 `matcher` 값과 소스의 `tool_name ===` 비교 대상을 §2 표와 대조. `Skill`·`Read`·`Write`·`Edit`·`Task`가 걸리면 Codex 측 실측 여부 확인 |
| Q6 | 호스트별 **픽스처**로 패리티가 고정돼 있나? | `__tests__`에 Codex 페이로드 픽스처가 있는가. 없으면 D 축 미충족 |

찾는 법 — 저장소 루트에서 (테스트 파일 제외):

```sh
# Q1 — 이벤트 이름 의존
grep -rnE "hook_event_name|PostToolUseFailure|InstructionsLoaded|Notification" plugins/*/src --include='*.ts' | grep -v __tests__
# Q2 — 페이로드 필드 형태 가정
grep -rnE "tool_response|tool_input\.[a-z_]+|\.stdout|\.stderr|\.error\b|is_interrupt|exit_code" plugins/*/src --include='*.ts' | grep -v __tests__
# Q5 — 매처·도구 이름
grep -rnE '"matcher"' plugins/*/hooks/hooks.json plugins/*/.codex-plugin/hooks.json
grep -rnE "tool_name *===|HostTool\.|toolNames" plugins/*/src --include='*.ts' | grep -v __tests__
# Q6 — 호스트 픽스처
find plugins/*/src -path '*__tests__*' -name '*.ts' | xargs grep -lE "codex|Codex|hostParity|parity"
```

## 5. 절차

**Step 0 — 인벤토리 재확인** (표 §3가 낡았을 수 있다)

```sh
for f in $(find plugins tools -maxdepth 4 -name 'hooks.json' -not -path '*/node_modules/*' -not -path '*/dist/*' | sort); do
  ev=$(node -e "const h=require('./$f').hooks||{};console.log(Object.entries(h).map(([k,v])=>k+'['+v.map(x=>x.matcher||'*').join(',')+']').join(' '))" 2>/dev/null)
  echo "$f :: $ev"
done
for p in plugins/*/; do echo "$(basename $p) :: codex[$(ls $p/.codex-plugin 2>/dev/null | tr '\n' ',')] hooks-ref=$(node -e "try{console.log(require('./$p/.codex-plugin/plugin.json').hooks||'-')}catch{console.log('-')}")"; done
```

**Step 1 — 플러그인별 (축 A→B→C→D 순서, 축 E는 마지막)**

1. 두 호스트 매니페스트를 나란히 놓고 이벤트·매처 차이를 적는다. 차이마다 "선언됨/누락" 판정과 근거(문서·주석·테스트 경로).
2. 훅 진입점(`bridge/*.mjs` → `src/hooks/**`)에서 페이로드 필드를 읽는 지점을 **전부** 나열한다(Q2 grep → 호출 그래프). 각 지점에 대해 Q1·Q2·Q3를 답한다.
3. "신호가 없을 때"를 호스트별로 시뮬레이션한다: §2 표의 Codex 페이로드(문자열 `tool_response`, exit 없음, 실패 이벤트 없음, `Skill` 없음, 편집은 `apply_patch`)를 머릿속이 아니라 **픽스처로** 넣어 본다 — 기존 테스트가 있으면 그것을, 없으면 `node`로 번들에 stdin을 직접 먹여서(`echo '<payload json>' | node plugins/<p>/bridge/<hook>.mjs`).
4. D 축: 픽스처 테스트 유무를 적는다.
5. E 축: 스킬·규칙·MCP 응답 텍스트에서 호스트 전용 도구명·경로를 grep한다 — `grep -rnE "\b(Skill|AskUserQuestion|Task)\b tool|~/.claude|\.claude/rules|CLAUDE_PLUGIN_ROOT" plugins/<p>/skills plugins/<p>/templates plugins/<p>/src/mcp`.

**Step 2 — 의심 지점은 가능하면 실측, 못 하면 "미측정"으로 표기**

- 페이로드 캡처는 **신뢰 저장소의 임시 프로젝트 훅**으로 stdin을 파일에 tee 한다(`cat > /tmp/hook-$$.json`). Codex는 `[features] hooks = true`와 소스 승인이 필요하다. 측정 후 프로브 훅·임시 저장소를 **제거**하고 ogham 작업 트리에 남기지 않는다(선례 `.metadata/seiri/phase0/codex-hook-parity-2026-08-23.md`의 방법).
- 한 호스트·한 명령으로 얻은 결과는 **그 조합에 대한 사실**이다. 표 §2에 올리려면 명령 형태(출력 있음/없음, 성공/실패, stderr만)별로 확인한다.

**Step 3 — 등급 부여** (§6) → **Step 4 — 보고서** (§7)

## 6. 등급

심각도는 **얼마나 조용한가**로 매긴다 — 시끄러운 실패가 가장 덜 나쁘다.

| 등급 | 정의 | 예 |
| --- | --- | --- |
| **S1 조용한 오판정** | 한 호스트에서 에러 없이 **틀린 결정**을 낸다 — 거짓 met/성공/허용/차단, 잘못된 기록 | 선례: 거짓 met, 실패를 성공으로 기록 |
| **S2 조용한 무동작 (미선언)** | 한 호스트에서 기능이 **없는데** 어디에도 선언되지 않았다 | 훅은 등록됐지만 Post 경로가 정규화를 안 해 matcher 액션이 조용히 안 도는 경우(감사 #3) |
| **S3 선언된 차이** | 차이가 문서·테스트에 선언되어 있고 방향이 **보수적**(거짓 양성 없음) | seiri의 `Skill` 관측 부재 |
| **S4 시끄러운 실패** | 에러·크래시로 드러난다 | 필드 부재로 throw |

확신도: **실측** / **코드 추론**(읽고 따라가 확인) / **추정**(패턴만 닮음). 추정은 보고서에 넣되 S 등급을 매기지 않고 "검증 필요"로 둔다.

## 7. 보고서 형식

파일: `ogham/.metadata/agent-artifacts/host-parity-audit-<plugin>-<YYYY-MM-DD>.md` (요청자가 달리 지정하면 그에 따른다). 세션의 최종 응답에도 같은 내용을 돌려준다.

1. **한 줄 결론** — S1·S2 개수, 가장 심각한 지점 하나.
2. **발견 표** — 컬럼: `# · 지점(file:line) · 축(A–E) · 의존하는 신호(이벤트/필드/도구명) · 깨지는 호스트 · 실패 양상(무엇이 어떻게 틀리는가) · 등급 · 확신도 · 처방 방향`. 처방 방향은 **공통 채널**을 이름으로 적는다("출력 텍스트로 판정", "매니페스트에서 선언", "삼상태로") — 코드는 쓰지 않는다.
3. **검사했지만 문제 없음** — 지점과 이유. 부재의 증명도 기록이다(다음 감사가 같은 곳을 다시 파지 않도록).
4. **미측정** — 실측이 필요했지만 못 한 것과 이유.
5. **새로 확인한 호스트 사실** — §2 표에 추가할 행, 근거 등급·버전·명령 형태 포함.
6. **같은 필드의 소비자 목록** — Q4의 결과. 수정 세션이 이 목록으로 한 번에 고치게.

## 8. 하지 말 것

- **수정하지 않는다.** 1파일 20줄 미만이어도 하지 않는다 — 수정은 플러그인별 PR로, 픽스처와 함께, 별도 지시로.
- **표본 하나로 일반화하지 않는다.** "Codex에서 X였다"는 그 버전·그 명령 형태의 사실이다.
- **호스트에 없는 신호를 어댑터로 만들어내지 않는다.** 문자열 응답에서 exit code를 "추정"해 채우는 식의 처방은 제안하지 않는다 — 처방은 판정 입력을 좁히는 방향만.
- **회피를 처방으로 내지 않는다.** "이런 시퀀스를 피하라"는 그 문장을 읽은 사람에게만 듣는다. 형식이 스스로 견디게 하는 방향(선례: 포매터 문제를 `.prettierignore`가 아니라 마크다운 코드 스팬으로 푼 것)을 찾는다.
- **프로브 훅을 작업 트리에 남기지 않는다.** 신뢰 저장소에서만, 측정 직후 제거.
- 이름이 불명확한 Codex 도구를 Claude 도구의 **대체 신호로 추측하지 않는다.**

## 9. 선행 후보 (요청자가 훑은 것 — 전부 **추정**이었고, 감사 08-23 결과를 덧붙인다)

1. **filid** `PreToolUse` 매처 차이 → **부분 확인**. `Bash`는 compiler의 `Read→Bash` 폴백으로 선언된 차이였다. 진짜 결함은 다른 곳에 있었다: 공유 정규화기가 `apply_patch`의 **첫 파일 연산만** `Edit`로 접고 삭제는 `apply_patch`로 남겨, 뒤쪽 파일 위반과 `INTENT.md` 삭제가 조용히 통과했다(S1 #2 → DR-02).
2. **maencof** `activityRecorder`의 `tool_response` → **기각**. recorder는 maencof MCP mutation 결과에만 호출되고, MCP 응답은 양쪽 호스트 모두 MCP call result JSON이다. Bash 문자열 표본을 MCP에 일반화한 오류.
3. **cennad · maencof-lens** Codex 훅 부재 → **기각**. `plugin.json`의 `hooks`가 공유 매니페스트를 가리켜 등록은 존재한다. cennad의 진짜 결함은 세션 식별이었다: `CLAUDE_PID` 없을 때 `process.ppid` 폴백이 MCP와 훅에서 다른 값을 내 위임 수를 거짓 0으로 표시(S1 #1 → DR-01).
4. **seiri** 미결 12 → **확인**(S3 #9 → DR-09): compiler가 matcher capability를 선언하고 `Skill`을 Codex 생성물에서 제거.
5. **plugin-compiler** 미지원 matcher 미처리 → **확인**(DR-09로 닫힘).

## 10. 참조

**ogham 저장소** (`/Users/Vincent/Workspace/ogham`)

- 선례 코드: `plugins/seiri/src/hooks/postToolUse/utils/toCheckOutcome.ts` · `plugins/seiri/src/core/gates/record/judgeCheckOutcome.ts` · `plugins/seiri/src/hooks/postToolUse/utils/bashOutcome.ts` · `plugins/seiri/src/types/hooks.ts` · 픽스처 `plugins/seiri/src/hooks/postToolUse/__tests__/hostParity.test.ts` · `plugins/seiri/src/hooks/__tests__/hostParity.test.ts`
- 호스트 어댑터: `tools/plugin-compiler/src/constants/hosts.ts`(`CODEX_HOOK_EVENTS`, `CODEX_HOOK_MATCHER_CAPABILITIES`) · `tools/plugin-compiler/src/adapters/builders/buildCodexHooks.ts` · Codex 편집 정규화 `shared/cross-platform/src/codexHooks/`
- 설계 정본: `.metadata/seiri/04-GATES.md` §6(호스트 중립 판정)·§10 `AC-gates-host-parity`
- 실측 기록: `.metadata/seiri/phase0/codex-hook-parity-2026-08-23.md` · `.metadata/seiri/phase0/subagent-hook-payload-2026-08-22.md`

**vault (Nao)**

- [[03_External/topical/claude-code-insights/harness-facts-from-gates-ledger-dogfooding-2026-08-22]] — 호스트 비대칭 실측 원문(§4 Claude 실패 페이로드, §5 Codex 훅 형태)
- [[02_Derived/이식-가능한-판정은-호스트들의-공통-최소-채널로만-풍부한-신호에-걸면-그-호스트-전용이-된다]] — 원리와 처방의 형태
- [[04_Action/projects/code-rules-plugin-design-ledger]] — seiri 설계 원장 §3(실패 연쇄 삼상태·호스트 차이)·§6(교훈 3건)·§7 미결 8·11(닫힘)·12
- [[03_External/topical/claude-code-insights/hook-payload-subagent-measurement-2026-08-22]] — `agent_id` 실측
- [[04_Action/projects/seiri-extension-review]] — 훅·MCP 응용안 검토(07-24)

## 11. 감사 결과 (2026-08-23)

- **보고서**: `ogham/.metadata/agent-artifacts/host-parity-audit-all-plugins-2026-08-23.md` (브랜치 `fix/codex-cross-agent`, 요청문은 저장소 루트 `rq.md`로 건네졌고 커밋되지 않음). 11/11 플러그인, 발견 9건(S1 6·S2 1·S3 1·S4 1), 개발 요청 DR-01~09, 검사했지만 문제 없음 12항, 미측정 8항, 새 호스트 사실 9행(§2 표에 반영).
- **초판의 오독 정정**: §3 "Codex 훅 없음"(cennad·maencof·maencof-lens)과 §9 후보 2·3은 감사가 근거를 들어 기각했다. 위 본문은 정정본이며, 교훈은 §1의 뿌리와 같다 — 전용 파일의 부재를 등록의 부재로, Bash 표본을 MCP로 일반화했다.
- **발견의 두 층**: 제 진단과 같은 형태(판정이 풍부한 신호에 걸림·"모름"을 성공으로) — #1 cennad PID, #2 apply_patch 첫 연산만, #3 Post 경로 정규화 부재. 축 E가 연 다른 층(호스트별 **경로·설정 표면**) — #4~#8 `~/.claude` 고정 경로·`.claude/rules` 전용 스킬·R library 경로. 같은 원리(공통 채널·선언된 차이)로 풀리지만 수정 범위는 훨씬 넓다.
- **구현 검토**: 구현 브랜치 검토는 [[04_Action/projects/ogham-codex-cross-agent-branch-review-2026-08-23]].