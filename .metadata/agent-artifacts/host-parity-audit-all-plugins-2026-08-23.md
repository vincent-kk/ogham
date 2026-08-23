# 전체 플러그인 호스트 패리티 감사 및 개발 요청서

- 감사일: 2026-08-23 (Asia/Seoul)
- 범위: `plugins/` 아래 11개 플러그인 전체
- 비교 기준: Claude Code 2.1.239/2.1.240 기준 계약, Codex CLI 0.149.0 실측
- 현재 설치 버전: Claude Code 2.1.241, Codex CLI 0.149.0
- 변경 원칙: 이 문서는 조사 결과와 수정 요청만 기록하며 제품 코드는 수정하지 않는다.

## 1. 한 줄 결론

**S1 6건, S2 1건이며, 가장 심각한 지점은 Codex에서 cennad 훅과 MCP 서버가 서로 다른 PID를 세션 식별자로 사용해 실제 위임 수를 오류 없이 0으로 바꾸는 오판정이다.** 별도로 S3 1건, S4 1건이 확인됐다.

## 2. 판정 기준과 조사 방법

심각도는 실패가 얼마나 조용히 잘못된 결과를 만드는지에 따라 매겼다.

- S1: 에러 없이 틀린 결정, 성공, 허용, 차단 또는 기록을 만든다.
- S2: 한 호스트에서 기능이 조용히 빠지며 그 차이가 선언되지 않았다.
- S3: 차이가 선언돼 있고 거짓 양성을 만들지 않는 보수적 차이다.
- S4: 에러 또는 후속 검증 실패로 드러나는 시끄러운 실패다.
- `추정`은 등급을 매기지 않고 미측정 항목에 둔다.

각 플러그인에 대해 다음 축을 확인했다.

- A: 훅 등록과 호스트별 매니페스트
- B: 훅 입력 정규화와 이벤트/필드 소비
- C: 출력, 상태 기록, 경로 및 설정 표면
- D: 호스트 패리티 픽스처와 번들 수준 검증
- E: 스킬·에이전트·MCP 작업 흐름의 호스트 가정

Codex 호스트 계약은 공식 [Hooks 문서](https://learn.chatgpt.com/docs/hooks), [Subagents 문서](https://learn.chatgpt.com/docs/agent-configuration/subagents), [AGENTS.md 문서](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Rules 문서](https://learn.chatgpt.com/docs/agent-configuration/rules)를 기준으로 교차 확인했다. 공식 문서에 따르면 플러그인 매니페스트는 공유 훅 파일을 가리킬 수 있고, Codex의 `apply_patch` 입력은 정규 도구명과 패치 명령을 제공하며, `AGENTS.md`와 `.codex/agents/*.toml`은 각각 지침과 사용자 정의 에이전트의 Codex 표면이다. `.codex/rules/*.rules`는 행동 지침 문서가 아니라 명령 승인 규칙이므로 `.claude/rules/*.md`의 기계적 대체물로 취급하지 않았다.

## 3. 발견 표

| #   | 지점(file:line)                                                                                                                                                                                                                                                                            | 축(A–E) | 의존하는 신호(이벤트/필드/도구명)                                     | 깨지는 호스트 | 실패 양상(무엇이 어떻게 틀리는가)                                                                                                                                                                              | 등급   | 확신도        | 처방 방향                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `plugins/cennad/src/hooks/shared/hostPid.ts:7`, `plugins/cennad/src/utils/parentPid.ts:6`, `plugins/cennad/src/hooks/injectDynamic/utils/loadCounter.ts:14`                                                                                                                                | B·C·D   | `CLAUDE_PID`, `process.ppid`, 카운터의 `parent_pid`                   | Codex 0.149.0 | MCP 프로세스가 기록한 세션 PID와 `libs/run.cjs` 아래 훅 프로세스가 계산한 PID가 달라 실제 위임 수가 있어도 “No delegations yet”과 0 카운트를 반환한다.                                                         | **S1** | **실측**      | 훅과 MCP가 함께 받는 **명시적 세션 식별 채널**을 사용한다. 그런 채널이 없으면 `unknown` 삼상태로 처리하고 0을 합성하지 않는다.                                                                              |
| 2   | `shared/cross-platform/src/codexHooks/normalizeToolUse.ts:28`, `plugins/filid/src/hooks/preToolUse/preToolUse.entry.ts:14`, `plugins/maencof/src/hooks/preToolUse/preToolUse.entry.ts:14`                                                                                                  | B·D     | `PreToolUse`, `tool_name=apply_patch`, `tool_input.command`           | Codex 0.149.0 | 한 패치의 첫 파일 연산만 `Edit`로 정규화한다. 두 번째 이후 파일은 경계 검사에서 사라지고, 삭제 연산은 `apply_patch`로 남아 `Write\|Edit` 전용 가드가 보지 못한다. 뒤쪽 파일의 위반이 조용히 허용될 수 있다.    | **S1** | **실측**      | 패치를 **전체 연산 목록**으로 파싱하고 모든 연산에 판정을 적용한다. 하나라도 거부면 전체를 보수적으로 거부하며 삭제를 명시적 연산으로 보존한다.                                                             |
| 3   | `plugins/maencof/src/hooks/postToolUse/postToolUse.entry.ts:10`, `plugins/maencof/src/hooks/utils/lifecycleDispatcher/lifecycleDispatcher.ts:125`, `plugins/maencof/skills/lifecycle/reference.md:39`                                                                                      | B·D·E   | `PostToolUse`, `tool_name`, 라이프사이클 matcher `Write\|Edit`        | Codex 0.149.0 | Codex 매니페스트의 `Edit` 별칭은 정규 `apply_patch` 입력으로 훅을 호출하지만 Post 경로는 정규화하지 않는다. `Edit` matcher 액션이 조용히 실행되지 않는다.                                                      | **S2** | **실측**      | Pre/Post가 공유하는 **호스트 중립 matcher 어휘와 정규화 채널**을 둔다. 관측된 별칭만 명시적으로 대응하고 MCP/Bash 이름은 보존한다.                                                                          |
| 4   | `plugins/maencof/skills/instruct/SKILL.md:30`, `plugins/maencof/skills/rule/SKILL.md:29`, `plugins/maencof/skills/configure/SKILL.md:38`, `plugins/maencof/skills/craft-agent/SKILL.md:69`, `plugins/maencof/skills/changelog/SKILL.md:31`, `plugins/maencof/src/constants/changelog.ts:1` | C·D·E   | `CLAUDE.md`, `.claude/rules/*.md`, `~/.claude/agents/*.md`, 감시 경로 | Codex 0.149.0 | Codex에 배포된 정식 스킬이 Claude 전용 파일을 쓰고 성공으로 보고할 수 있다. Codex가 실제로 읽는 `AGENTS.md`와 `.codex/agents/*.toml` 변경은 changelog 감시에서 빠져 “변경 없음”으로 오판정될 수 있다.          | **S1** | **코드 추론** | 기존 MCP instruction manager와 같은 **호스트 설정-표면 레지스트리**를 스킬·상태 점검·changelog가 함께 사용한다. 지원 불가능한 Claude 기능은 `.codex/rules`로 추측 매핑하지 말고 명시적으로 미지원 처리한다. |
| 5   | `plugins/maencof/src/mcp/server/graphCache/graphCache.ts:16`                                                                                                                                                                                                                               | C·D     | `MAENCOF_VAULT_PATH`, 보호 루트 목록, 경로 포함 판정                  | Codex 0.149.0 | 보호 목록이 `~/.claude`와 `~/.config`만 포함한다. `~/.codex`를 vault로 지정하면 정상 경로로 해석돼 Codex 설정 트리가 vault CRUD 대상이 될 수 있다.                                                             | **S1** | **실측**      | 모든 지원 호스트가 공유하는 **호스트 상태-루트 레지스트리**에서 보호 경로를 만들고, 단순 문자열 prefix가 아니라 경계 안전한 하위 경로 판정을 사용해 실패 시 닫힌다.                                         |
| 6   | `plugins/cennad/src/mcp/pages/settings/index.html:1081`, `plugins/cennad/public/settings.html:1087`, `plugins/cennad/src/constants/paths.ts:14`                                                                                                                                            | C·D     | 설정 UI의 활성 home 표시, `OGHAM_HOST`, `pluginCache`                 | Codex 0.149.0 | 실제 상태는 `~/.codex/plugins/cennad`에 있는데 UI가 `~/.claude/plugins/cennad`를 활성 home으로 안내한다. 사용자가 잘못된 설정·기록 위치를 검사하게 된다.                                                       | **S1** | **실측**      | UI에 **런타임이 계산한 호스트별 표시 경로**를 전달하거나 호스트 중립 이름을 표시하고, 생성된 public 산출물도 같은 원본에서 갱신한다.                                                                        |
| 7   | `plugins/atlassian/skills/setup/references/setup-flow.md:20`, `plugins/atlassian/src/constants/paths.ts:3`                                                                                                                                                                                 | C·E     | setup 성공 메시지, `OGHAM_HOST`, `pluginCache`                        | Codex 0.149.0 | 설정은 `~/.codex/plugins/atlassian/config.json`에 저장되지만 스킬이 `~/.claude/plugins/atlassian`에 저장됐다고 보고한다. 성공 결과의 위치가 조용히 틀린다.                                                     | **S1** | **실측**      | 성공 메시지는 하드코딩 대신 **MCP 결과가 반환한 해석 완료 경로** 또는 호스트 중립 상태 위치를 사용한다.                                                                                                     |
| 8   | `plugins/r-statistics/skills/setup/references/packages.md:43`, `plugins/r-statistics/skills/setup/references/windows.md:22`, `plugins/r-statistics/src/constants/paths.ts:5`, `plugins/r-statistics/src/mcp/tools/runR/operations/buildRunEnv.ts:55`                                       | C·D·E   | `CLAUDE_CONFIG_DIR`, R library 경로, `MANAGED_R_LIB_DIR`              | Codex 0.149.0 | setup 명령은 기본 `~/.claude/.../runtime/r-lib`에 패키지를 설치하지만 `run_r`는 `~/.codex/.../runtime/r-lib`를 사용한다. 설치는 끝난 뒤 후속 재검증에서 패키지 부재로 드러난다.                                | **S4** | **실측**      | setup과 `run_r`가 동일한 **공유 호스트 경로 resolver 또는 MCP 반환 경로**를 사용하고, POSIX/Windows 명령은 그 결과만 안전하게 인용한다.                                                                     |
| 9   | `plugins/seiri/.codex-plugin/hooks.json:39`, `tools/plugin-compiler/src/adapters/builders/buildCodexHooks.ts:38`, `plugins/seiri/src/constants/hooks.ts:4`                                                                                                                                 | A·D·E   | `PostToolUse[Skill]`, 호스트별 도구 capability                        | Codex 0.149.0 | 현재 Codex 도구 표면에는 `Skill` 도구가 없어 해당 matcher는 실행되지 않는다. 차이는 보수적이고 기존 문서·테스트가 부재를 전제로 하므로 거짓 판정은 없지만, 생성 매니페스트가 무효 기능을 활성 기능처럼 남긴다. | **S3** | **코드 추론** | 컴파일러가 **호스트별 matcher capability 선언**으로 지원되지 않는 matcher를 제거하거나 의도적 비활성을 진단한다. 대체 신호를 추측해 만들지 않는다.                                                          |

등급 집계는 S1 6건, S2 1건, S3 1건, S4 1건이다. 동일한 원인과 수정 seam을 공유하는 maencof의 Claude 전용 지침·에이전트·changelog 표면은 1건으로 묶었다.

## 4. 개발 요청

아래 요청은 구현 방향과 완료 조건만 정한다. 구체적인 함수·타입·패치 형태는 해당 수정 세션에서 기존 패턴을 재조사해 결정해야 한다.

### DR-01 — cennad 세션 식별을 프로세스 부모 PID에서 분리

**대상:** cennad의 MCP 카운터 생산자와 SessionStart/UserPromptSubmit 소비자.

**문제:** Claude의 `CLAUDE_PID`가 없을 때 양쪽이 각각 `process.ppid`를 사용하지만 Codex에서는 프로세스 계층이 다르다. 소비자가 stale 카운터를 버린 뒤 “위임 없음”이라는 실제 값처럼 표현한다.

**요청 결과:**

- 두 실행 경로가 같은 값을 관측하는 명시적 세션 식별 채널을 우선한다.
- 공통 식별자를 호스트가 제공하지 않는 경우 `unknown`을 유지한다.
- 식별 실패, 파일 부재, 실제 0회를 서로 구분한다.
- 호스트가 제공하지 않는 PID나 세션 ID를 응답 문자열에서 추정하지 않는다.

**수용 기준:**

- Codex launcher 경유 훅과 MCP 생산자가 같은 fixture 세션을 식별하고 4/2/1 같은 비영 카운트를 보존한다.
- 식별자가 없는 fixture는 0회로 표시되지 않고 명시적 미측정 상태가 된다.
- 실제 0회 fixture는 기존 사용자 경험을 유지한다.
- Claude `CLAUDE_PID` 경로는 회귀하지 않는다.

**필수 검증:** 직접 bundle 호출과 `libs/run.cjs` 경유 호출을 같은 테스트에서 비교하는 Claude/Codex 프로세스 토폴로지 fixture.

### DR-02 — `apply_patch`의 모든 파일 연산을 경계 검사에 전달

**대상:** `shared/cross-platform` Codex 훅 정규화기와 이를 쓰는 filid·maencof PreToolUse 가드.

**문제:** 첫 연산만 단일 Claude형 `Edit` 입력으로 축소해 나머지 파일과 삭제 연산을 숨긴다. 현재 shared 테스트는 이 제한을 기대값으로 고정한다.

**요청 결과:**

- 한 패치 안의 추가·수정·삭제를 순서가 보존된 전체 연산 목록으로 제공한다.
- filid와 maencof의 각 가드가 모든 연산을 판단하고 결과를 하나의 보수적 결정으로 합친다.
- 파싱 불능을 허용 가능한 빈 입력으로 바꾸지 말고 각 가드 계약의 unknown/deny 경로로 보낸다.
- 공식 Codex 입력의 `tool_name=apply_patch`와 `tool_input.command`만 사용하며 다른 도구 신호를 추측하지 않는다.

**수용 기준:**

- 첫 파일 허용·두 번째 파일 거부인 패치가 전체 거부된다.
- 두 번째 파일에만 구조/레이어 위반이 있는 패치가 놓치지 않는다.
- 삭제 대상 `INTENT.md` 등 보호 파일이 검사된다.
- 단일 파일 패치와 Claude `Write`/`Edit` 동작은 유지된다.
- malformed patch는 조용한 허용이 아니다.

**필수 검증:** shared parser 단위 fixture와 filid·maencof 실제 hook bundle fixture. 기존 “첫 파일만” 기대값은 새 계약으로 교체한다.

### DR-03 — maencof 라이프사이클 matcher를 Pre/Post 공통 어휘로 통일

**대상:** maencof lifecycle dispatcher, PreToolUse/PostToolUse 진입점, lifecycle 문서.

**문제:** Codex 훅 등록은 `Edit` 별칭으로 `apply_patch`를 받지만 Post 경로는 정규 도구명을 그대로 exact-match한다.

**요청 결과:**

- Pre와 Post에서 동일한 호스트 중립 matcher 해석기를 사용한다.
- Claude `Edit`와 Codex `apply_patch`가 같은 논리적 edit matcher에 대응한다.
- Bash와 MCP 도구명은 별칭 변환의 부작용 없이 유지한다.
- 실제 관측하지 않은 도구명은 대체 신호로 추가하지 않는다.

**수용 기준:**

- 같은 lifecycle action이 Claude `Edit`와 Codex `apply_patch` Post 이벤트에서 각각 한 번 실행된다.
- 일치하지 않는 도구명은 실행되지 않는다.
- Pre/Post의 같은 matcher가 같은 결과를 낸다.
- 성공·실패 tool response 형태가 matcher 판정에 섞이지 않는다.

**필수 검증:** lifecycle bundle에 Claude/Codex 동일 시나리오와 음성 대조군을 추가한다.

### DR-04 — maencof 설정 표면을 호스트 레지스트리로 단일화

**대상:** `instruct`, `rule`, `configure`, `craft-agent`, `changelog` 스킬과 changelog 감시 상수.

**문제:** Codex에 배포되는 정식 스킬이 Claude 전용 설정 표면을 정답으로 가르친다. 반면 MCP instruction manager에는 이미 `AGENTS.md`를 선택하는 호스트 인식 패턴이 있다.

**요청 결과:**

- 지침 파일, 행동 규칙, 에이전트 정의, 변경 감시 대상의 호스트별 표면을 하나의 레지스트리에서 파생한다.
- Codex 지침은 `AGENTS.md` 계층과 maencof 소유 섹션을 사용한다.
- Codex 에이전트는 `.codex/agents/*.toml` 계약을 따르는 별도 변형을 사용한다.
- `.claude/rules/*.md`와 의미가 다른 `.codex/rules/*.rules`를 행동 규칙 대체물로 매핑하지 않는다. 동등 기능이 없으면 미지원으로 선언한다.
- health/configure 결과와 changelog 감시가 같은 레지스트리를 사용한다.

**수용 기준:**

- Codex에서 Claude 전용 파일만 쓴 뒤 성공으로 보고하는 흐름이 없다.
- `AGENTS.md`와 `.codex/agents/*.toml` 변경이 changelog에 잡힌다.
- Codex command approval rules를 행동 지침으로 쓰지 않는다.
- Claude의 기존 CLAUDE.md/rules/agents 흐름은 유지된다.
- 두 호스트의 설정 상태 점검이 실제 소비 표면과 일치한다.

**필수 검증:** 임시 home/project에서 instruct·rule·craft-agent·configure·changelog를 잇는 호스트별 E2E fixture. MCP instruction manager와 스킬이 같은 표면을 선택하는지도 교차 검증한다.

### DR-05 — maencof vault 보호 루트에 모든 호스트 상태 디렉터리 포함

**대상:** graph cache의 vault 경로 해석과 CRUD 진입 전 검증.

**문제:** `~/.codex`가 보호 루트에서 빠지고 현재 포함 판정도 문자열 prefix에 의존한다.

**요청 결과:**

- 지원 호스트의 상태 루트를 공통 레지스트리에서 보호 목록으로 가져온다.
- 정규화한 절대 경로의 디렉터리 경계를 기준으로 exact/descendant를 판정한다.
- 환경 변수 override가 보호 루트이거나 그 하위면 CRUD 전에 실패한다.
- 판정 불능은 허용하지 않는다.

**수용 기준:**

- `~/.codex`와 하위 경로가 차단된다.
- `~/.claude`와 `~/.config`의 기존 차단이 유지된다.
- 이름만 비슷한 sibling 경로는 오탐 차단하지 않는다.
- 상대 경로, 심볼릭 링크, `..`를 통한 우회가 보호 결과를 바꾸지 않는다.

**필수 검증:** 임시 home 아래 exact, descendant, sibling-lookalike, symlink, env override 표를 두 호스트에 적용한다.

### DR-06 — cennad 설정 UI의 상태 경로를 런타임 값으로 표시

**대상:** settings 페이지 원본과 생성된 public HTML.

**문제:** UI 문구가 `~/.claude/plugins/cennad`를 활성 home으로 고정하지만 런타임은 host-aware `pluginCache`를 사용한다.

**요청 결과:**

- 페이지가 런타임에서 계산한 표시용 상태 경로를 받거나 호스트 중립 명칭을 사용한다.
- 원본과 생성 산출물의 canonical 관계를 유지해 두 사본이 따로 드리프트하지 않게 한다.

**수용 기준:**

- Codex 페이지는 `~/.codex/plugins/cennad`, Claude 페이지는 해당 Claude 상태 위치를 안내한다.
- 실제 읽기/쓰기 경로와 UI 표시가 같은 resolver 결과다.
- 생성 public 파일 검증이 원본과의 불일치를 잡는다.

**필수 검증:** 두 `OGHAM_HOST` 값으로 settings HTML을 렌더링/생성해 표시 경로를 검사한다.

### DR-07 — atlassian setup 성공 메시지를 실제 저장 경로와 결합

**대상:** setup 스킬의 완료 단계와 구성 MCP 응답.

**문제:** 저장 구현은 host-aware인데 참고 문서가 Claude 경로를 성공 메시지로 고정한다.

**요청 결과:**

- setup 완료 메시지가 MCP가 확정한 경로 또는 호스트 중립 저장 위치를 사용한다.
- 스킬이 별도로 환경 변수를 해석해 런타임과 두 번째 경로 계산을 만들지 않는다.

**수용 기준:**

- Codex/Claude 각각의 setup 결과 메시지가 실제 생성 파일 위치와 일치한다.
- custom home/config root fixture에서도 메시지와 저장 위치가 같다.
- 실패한 저장은 성공 경로를 출력하지 않는다.

**필수 검증:** 임시 home에서 setup MCP 결과와 최종 스킬 메시지를 비교하는 호스트별 fixture.

### DR-08 — r-statistics 설치와 실행이 같은 관리형 R library를 사용

**대상:** setup 패키지 설치 안내, Windows 안내, 런타임 환경 구성.

**문제:** 설치 명령은 `CLAUDE_CONFIG_DIR`를 직접 해석하고 런타임은 host-aware 상수를 사용해 Codex에서 서로 다른 library가 된다.

**요청 결과:**

- 설치할 library 경로를 공유 resolver 또는 MCP의 구조화된 결과에서 한 번만 확정한다.
- POSIX와 Windows 안내는 확정된 경로를 안전하게 인용한다.
- 설치 직후 재검증과 `run_r`가 같은 library를 관측한다.

**수용 기준:**

- Codex와 Claude 각각에서 installer와 `run_r`의 library 경로가 일치한다.
- 기본 환경 변수가 없는 깨끗한 home fixture에서도 Codex가 `.claude`로 fallback하지 않는다.
- 공백을 포함한 경로와 Windows 경로가 올바르게 전달된다.
- 설치 성공 뒤 동일 세션의 패키지 재검증이 통과한다.

**필수 검증:** 실제 패키지 다운로드 없이 설치 명령의 대상 경로와 `buildRunEnv` 결과를 비교하는 단위 fixture, 그리고 별도 허용 환경의 최소 통합 설치 검증.

### DR-09 — seiri Codex 훅에서 지원되지 않는 `Skill` matcher를 명시적으로 처리

**대상:** plugin compiler의 Codex hooks builder, seiri Codex manifest, 관련 상수 설명과 wiring 테스트.

**문제:** compiler는 미지원 이벤트를 거르지만 미지원 도구 matcher는 남긴다. 현재 동작은 보수적이나 매니페스트가 실제 capability를 설명하지 못한다.

**요청 결과:**

- 호스트별 이벤트뿐 아니라 matcher capability도 컴파일 입력으로 선언한다.
- Codex에 없는 `Skill` matcher를 생성물에서 제거하거나 의도적 비활성 상태로 검증 가능한 진단을 제공한다.
- Claude의 Skill workflow 추적은 유지한다.
- Codex에 없는 대체 신호를 추측하지 않는다.

**수용 기준:**

- 생성된 Codex manifest에 지원되지 않는 matcher가 활성 기능처럼 남지 않는다.
- Claude manifest는 `Skill` 관측을 유지한다.
- Codex의 workflow skill 부재는 여전히 거짓 met를 만들지 않는 보수적 결과다.
- 소스 설명과 wiring 테스트가 두 호스트 차이를 정확히 명시한다.

**필수 검증:** compiler 골든 fixture와 seiri host-parity wiring fixture.

## 5. seiri 수정 독립 검증

rq.md가 별도로 요구한 seiri Codex 수정은 **확인됨**으로 판정한다.

### 검증 결과

- `yarn workspace @ogham/seiri test:run`: 35개 파일, 264개 테스트 통과.
- `yarn workspace @ogham/plugin-compiler test:run`: 20개 파일, 151개 테스트 통과.
- `yarn workspace @ogham/cross-platform test:run`: 52개 파일, 376개 테스트 통과.
- `plugins/seiri/src/hooks/postToolUse/__tests__/hostParity.test.ts`는 Claude 성공/실패 객체, Codex 문자열, 고전 exit header, 빈 문자열의 보수적 unmet, 실패 체인/reset/ledger 경계를 검증한다.
- `plugins/seiri/src/hooks/__tests__/hostParity.test.ts`는 SessionStart, UserPromptSubmit, SubagentStart의 호스트 동등성을 검증한다.
- 배포된 `plugins/seiri/bridge/post-tool-use.mjs`를 임시 저장소에서 직접 실행했다. Codex 문자열 응답으로 세 번 unmet을 주자 세 번째 실행이 `trace-cause`와 `G1 unmet`을 냈고, `HOST_PARITY_OK` 응답 뒤 `G1 met`, 체크된 ledger, `HOST_PARITY_OK | complete`, 상태 0을 기록했다.

### 판정

문자열/객체 응답을 판정 입력으로 좁힌 수정은 source test와 실제 배포 bridge 모두에서 재현된다. Claude 전용 `PostToolUseFailure`가 삼상태 실패 근거로 남는 것은 호스트 사실을 꾸며내지 않는 의도된 차이다. 이 검증은 발견 #9의 무효 `Skill` matcher와 별개다.

## 6. 플러그인별 감사 범위

| 플러그인     | A 등록                        | B 입력                        | C 상태/출력                | D 픽스처                       | E 워크플로                   | 결론                                |
| ------------ | ----------------------------- | ----------------------------- | -------------------------- | ------------------------------ | ---------------------------- | ----------------------------------- |
| atlassian    | 훅 없음                       | 해당 없음                     | host-aware runtime 확인    | 경로 상수 검사                 | setup 메시지 검사            | 발견 #7                             |
| cennad       | shared hooks 등록 확인        | self-provider와 PID 흐름 검사 | counter/UI 경로 검사       | bundle launcher 재현           | provider 스킬 검사           | 발견 #1, #6; provider 의미론 미측정 |
| deilen       | 훅 없음                       | 해당 없음                     | 호스트 전용 상태 경로 없음 | 관련 정적 검사                 | 스킬 표면 검사               | 등급 발견 없음                      |
| entrez       | 훅 없음                       | 해당 없음                     | MCP env host 설정 확인     | 생성 persona 정적 검사         | Codex persona load 절차 확인 | 등급 발견 없음                      |
| filid        | dedicated Codex hooks 확인    | Pre 정규화·가드 소비 검사     | rule/path host 분기 확인   | host fixture와 compiler 검사   | generated Codex persona 검사 | 발견 #2의 소비자                    |
| imbas        | 훅 없음                       | 해당 없음                     | MCP env host 설정 확인     | 생성 persona/E2E 근거 검사     | Codex persona load 절차 확인 | 등급 발견 없음                      |
| maencof      | shared hooks 등록 확인        | Pre/Post·response 소비 검사   | vault/config surface 검사  | bundle/단위 fixture gap 확인   | 전 스킬의 host path 검색     | 발견 #2–#5                          |
| maencof-lens | shared SessionStart 등록 확인 | payload 비의존 확인           | compatibility root 확인    | integration bundle 확인        | 스킬 표면 검사               | 등급 발견 없음                      |
| prawf        | 훅/MCP 없음                   | 해당 없음                     | 해당 없음                  | compiler 제외 정적 검사        | TeamCreate/Task 흐름 검사    | live 의미론 미측정                  |
| r-statistics | 훅 없음                       | 해당 없음                     | managed R lib 비교         | resolver 실측                  | setup 문서 검사              | 발견 #8                             |
| seiri        | dedicated Codex hooks 확인    | 전 이벤트/response 판정 검사  | ledger 증거 검사           | source와 shipped bundle 재검증 | Skill matcher 검사           | 수정 확인, 발견 #9                  |

## 7. 검사했지만 문제 없음

다음 지점은 후보였으나 현재 근거로 패리티 결함이 아니다.

- **훅 등록:** cennad, filid, maencof, maencof-lens, seiri의 Codex 등록은 모두 존재한다. cennad·maencof·maencof-lens는 `.codex-plugin/plugin.json`이 공유 `hooks/hooks.json`을 가리키며, 전용 `.codex-plugin/hooks.json` 부재만으로 무동작이 아니다.
- **cennad self-provider 입력:** `PLUGIN_DATA`와 `OGHAM_HOST`를 사용한다. prompt 필드 부재는 안전한 문자열 fallback이며 상태 저장 경로도 host-aware다. 문제는 그 뒤의 PID 동일성이다.
- **filid의 단순 도구 정규화:** filid Pre 진입점은 Codex 정규화기를 거치고 compiler의 Bash matcher rewrite도 명시돼 있다. 단일 파일 Read/Write/Edit 경로 자체는 보수적이다. 발견 #2는 복수 연산과 삭제의 정보 손실에 한정한다.
- **maencof activity recorder의 `tool_response`:** recorder는 maencof MCP mutation allowlist에만 호출된다. 공식 Codex 계약상 MCP 응답은 MCP call result JSON이며, 로컬 도구도 `{content:[{type:'text',text:...}]}` 형태를 반환하고 extractor가 이를 처리한다. Bash 문자열 표본을 MCP에 일반화한 rq.md 후보는 기각한다.
- **maencof MCP 지침 도구:** `claudemd_merge/read/remove`라는 레거시 이름과 달리 `createProjectInstructionManager`가 Codex에서 AGENTS 소유 섹션을 선택한다. 발견 #4는 이 패턴을 사용하지 않는 canonical skills에 한정한다.
- **maencof-lens SessionStart:** 훅은 payload 필드를 판정에 사용하지 않고 호환성 변수로 plugin root를 받는다. 현재 Codex 계약에서 문제를 재현하지 못했다.
- **seiri PostToolUse:** `tool_response` 객체/문자열 분기, 빈 응답 보수 처리, failure chain과 ledger 경계를 source test와 실제 bridge에서 확인했다. `PostToolUseFailure`의 Claude 전용 분기는 의도된 삼상태다.
- **atlassian runtime 경로:** 실제 config resolver는 host-aware다. 결함은 setup 완료 메시지에만 있다.
- **r-statistics runtime 경로:** `run_r` 환경은 host-aware managed library를 사용한다. 결함은 setup이 제시하는 별도 terminal 명령에만 있다.
- **deilen:** 검색된 호스트 전용 설정·상태 경로가 현재 공개 동작에 관여하지 않았다.
- **entrez·imbas:** plugin compiler가 Codex용 persona load protocol을 생성한다. imbas에는 기존 Codex E2E 근거가 있고, 이번 감사에서 반대 동작을 발견하지 못했다.
- **filid·seiri 규칙 배포:** 템플릿 설명에 Claude라는 단어가 남은 곳과 별개로 실제 rule deployment는 Codex에서 AGENTS 소유 섹션을 사용한다.

## 8. 미측정

다음 항목은 정적 근거만으로 성공/실패를 확정할 수 없어 등급을 매기지 않았다.

- **prawf 협업 의미론:** canonical `peer-review` 스킬은 `TeamCreate`, `Task`, `TeamDelete`, `team_name`, `subagent_type` 의미론을 요구한다. compiler는 prawf를 Codex skill 변환에서 제외하고 “그대로 동작”한다고 가정하지만, Codex 0.149.0의 자연어 subagent 지원이 Claude의 팀 생성·작업 배정·삭제 계약과 정확히 같은지는 live E2E로 측정하지 않았다. 수정 세션은 persona 로딩, 두 리뷰 라운드, 팀 정리까지 실제 Codex에서 검증하고, 동등하지 않으면 호스트 변형 또는 명시적 저하를 선택해야 한다.
- **cennad provider 스킬:** `codex`, `claude`, `antigravity` provider 스킬은 description으로 에이전트를 찾고 background `Agent` 실행을 요구한다. 현재 Codex spawn 계약의 이름/등록 규칙과 완전히 동등한지 live E2E로 측정하지 않았다. MCP fallback이 명시돼 있어 이번에는 등급을 매기지 않는다.
- **Claude Code 2.1.241 live payload:** rq.md의 기준은 2.1.239/2.1.240이다. 현재 설치된 2.1.241에서 모든 훅 payload를 다시 캡처하지 않았다. Claude 쪽 평가는 기존 fixture와 기준 계약에 의존한다.
- **Codex MCP `tool_response` live capture:** 공식 문서와 로컬 MCP result shape를 확인했지만 신뢰 저장소에 probe hook을 설치해 실제 MCP 응답을 다시 캡처하지 않았다.
- **plugin hook 설정 live reload:** 이번 조사 중 훅 매니페스트를 변경하지 않았으므로 Codex 0.149.0의 reload 시점은 재측정하지 않았다.
- **`~/.codex` 실제 파괴적 쓰기:** maencof resolver의 false allow까지만 측정했다. 사용자 설정 디렉터리에 쓰기·삭제하는 위험한 재현은 수행하지 않았다.
- **R 패키지 실제 설치:** 설치 명령과 runtime resolver의 불일치만 측정했다. 외부 패키지 다운로드와 system R library 변경은 수행하지 않았다.
- **일반적인 AskUserQuestion/Task 명칭:** 여러 스킬의 자연어 지시는 모델이 호스트 도구로 번역할 수 있다. 이름 일치만으로 결함을 만들지 않았고, 구체적 실패 경로가 있는 prawf/cennad만 위에 남겼다.

조사 중 임시 함수 실행과 임시 저장소만 사용했으며 작업 트리에 probe hook을 만들지 않았다.

## 9. 새로 확인한 호스트 사실

| 호스트 사실                                                                                                                            | 근거 등급             | 버전               | 확인 명령 형태/근거                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | ---------------------------------------------------------------------------- |
| Codex 플러그인 매니페스트의 `hooks` 필드는 공유 훅 JSON 경로를 가리킬 수 있다. 전용 `.codex-plugin/hooks.json`은 필수가 아니다.        | 공식 문서 + 코드 추론 | Codex 0.149.0      | 공식 Hooks 문서와 각 `.codex-plugin/plugin.json`의 `hooks` 경로 대조         |
| `Edit`/`Write` matcher 별칭으로 `apply_patch` 훅이 선택돼도 입력의 정규 도구명은 `apply_patch`이고 패치는 `tool_input.command`에 온다. | 공식 문서 + 실측      | Codex 0.149.0      | 복수 파일 patch parser/normalizer 실행 및 Hooks 문서의 apply_patch 입력 계약 |
| `PostToolUse.additionalContext`는 developer context로 추가된다. `PostToolUse`는 Bash 비영 종료에도 발생한다.                           | 공식 문서             | Codex 0.149.0 문서 | Hooks 문서의 PostToolUse 출력·종료 동작                                      |
| `tool_response`는 JSON 값이며 MCP 호출에는 MCP call result가 전달된다. Bash 문자열 응답을 MCP 도구에 일반화하면 안 된다.               | 공식 문서 + 코드 추론 | Codex 0.149.0      | Hooks 문서와 maencof MCP `toolResult`/extractor 대조                         |
| Codex 프로젝트 지침 표면은 `AGENTS.md` 계층이고 사용자 정의 에이전트 표면은 `.codex/agents/*.toml` 또는 `~/.codex/agents/*.toml`이다.  | 공식 문서             | Codex 0.149.0 문서 | AGENTS.md 및 Subagents 공식 문서                                             |
| `.codex/rules/*.rules`는 명령 승인 정책이며 `.claude/rules/*.md` 행동 지침의 동등 표면이 아니다.                                       | 공식 문서             | Codex 0.149.0 문서 | Rules 공식 문서                                                              |
| 현재 설치에서 hooks 기능은 stable/enabled다.                                                                                           | 실측                  | Codex 0.149.0      | `codex features list`에서 `hooks stable true` 확인                           |
| Codex 기본 실행 환경에는 이번 측정에서 `CLAUDE_PID`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `OGHAM_HOST`가 자동 주입되지 않았다.           | 실측                  | Codex 0.149.0      | 현재 main tool environment의 해당 변수 존재 여부 검사                        |
| MCP와 `libs/run.cjs` 경유 hook은 `process.ppid`가 같은 세션 식별자라는 보장이 없다.                                                    | 실측                  | Codex 0.149.0      | 같은 counter fixture를 direct bundle과 launcher 경유 bundle에 입력해 비교    |

이 사실들은 해당 버전과 명령 형태에 한정한다. 다음 호스트 버전에서 계약이 바뀌면 fixture와 표를 함께 갱신해야 한다.

## 10. 같은 필드의 소비자 목록

수정 시 한 소비자만 고쳐 다른 플러그인에 같은 결함을 남기지 않도록, 이번 감사에서 확인한 생산 소비자를 신호별로 묶었다.

### `tool_response`

- seiri: `toCheckOutcome.ts` → `bashOutcome.ts` → `judgeCheckOutcome`; Bash check 결과와 증거 ledger를 판정한다.
- maencof: `activityRecorder.ts`; maencof MCP mutation 결과에서 활동 기록을 만든다.
- maencof lifecycle dispatcher의 타입에도 필드가 전달되지만 현재 matcher 결정에는 내용을 읽지 않는다.

### `tool_name` / `tool_input` / `tool_input.command`

- shared: `normalizeToolUse.ts`; Codex `apply_patch`를 호스트 중립 edit 입력으로 바꾼다.
- filid PreToolUse: `preToolUse.entry.ts` 뒤의 validator, structure guard, intent injector가 정규화 결과를 소비한다.
- maencof PreToolUse: `preToolUse.entry.ts` 뒤의 layer guard, vault redirector, lifecycle dispatcher가 소비한다.
- maencof PostToolUse: lifecycle dispatcher가 raw `tool_name`을 exact matcher와 비교한다.
- seiri PostToolUse: Bash와 Skill routing이 `tool_name`에 의존한다.

### `CLAUDE_PID` / `process.ppid` / counter `parent_pid`

- cennad hook 생산·소비: `hostPid.ts`, `parentPid.ts`, `loadCounter.ts`.
- 이 세 지점은 하나의 세션 식별 계약으로 함께 수정해야 한다.

### plugin state root / `OGHAM_HOST` / `pluginCache`

- shared cross-platform path resolver가 host별 plugin cache root를 계산한다.
- cennad runtime은 올바른 resolver를 쓰지만 settings UI 문자열이 별도 계산을 한다.
- atlassian runtime은 올바른 resolver를 쓰지만 setup 참고 문서가 별도 경로를 말한다.
- r-statistics runtime은 올바른 resolver를 쓰지만 setup shell 명령이 `CLAUDE_CONFIG_DIR`로 별도 계산한다.
- maencof graph cache의 보호 루트는 별도 하드코딩 목록을 사용한다.

### instruction / rule / agent configuration surface

- maencof canonical skills: `instruct`, `rule`, `configure`, `craft-agent`, `changelog`.
- maencof changelog watcher: `src/constants/changelog.ts`와 `detectWatchedChanges.ts`.
- 이미 host-aware인 비교 기준: shared `createProjectInstructionManager`를 쓰는 maencof MCP instruction tools.
- Codex 실제 소비자: AGENTS chain과 `.codex/agents/*.toml`; `.codex/rules/*.rules`는 승인 정책으로 별도다.

### `Skill` matcher / workflow skill 상태

- seiri Codex hook manifest의 `PostToolUse[Skill]`.
- seiri workflow-chain recorder와 PostToolUse 진입점.
- plugin compiler `buildCodexHooks.ts`의 이벤트/matcher 필터.
- source 설명과 wiring/host-parity 테스트.

### `PLUGIN_DATA` / `OGHAM_HOST`

- cennad self-provider가 prompt 및 host context를 받는다.
- filid·maencof·seiri의 rule/path resolver가 host 상태를 선택한다.
- Codex hook compatibility 환경이 제공하는 값과 plugin compiler의 MCP env 설정을 함께 확인해야 한다.

## 11. 수정 순서 권고

의존성 기준 권고 순서는 다음과 같다.

1. DR-02 shared `apply_patch` 전체 연산 계약을 먼저 확정한 뒤 filid와 maencof 소비자를 함께 검증한다.
2. DR-04/DR-05에서 사용할 host configuration/state-root 레지스트리 seam을 합의한다.
3. DR-01과 DR-03은 각각 cennad, maencof의 독립 훅 PR로 처리한다.
4. DR-06–DR-08의 문서/UI 경로는 공통 resolver 결과에 연결하되 플러그인별 PR과 fixture로 분리한다.
5. DR-09는 plugin compiler와 seiri 생성물의 원자적 변경으로 처리한다.

각 수정 PR은 해당 DETAIL 계약을 먼저 갱신하고, 실패하는 호스트 fixture를 관찰한 뒤 구현하며, scoped test와 plugin compiler/cross-platform 회귀 테스트를 함께 실행해야 한다. 이 보고서의 미측정 항목은 별도 조사 없이는 등급 발견으로 승격하지 않는다.

## 12. 검토 인계 ledger

- 리뷰 범위: 이 보고서 1개 파일. 제품 코드 변경은 범위에 없다.
- 요구사항 원본: 저장소 루트의 `rq.md`, 특히 §5의 플러그인별 절차와 §7의 보고서 형식.
- 범위 게이트: 11/11 플러그인에 대해 A–E 적용 가능성을 기록했다.
- 발견 게이트: 등급 발견 9/9를 표와 대응 개발 요청 DR-01–DR-09에 연결했다.
- 형식 게이트: 한 줄 결론, 발견 표, 무이상, 미측정, 새 호스트 사실, 같은 필드 소비자 목록 6/6을 포함했다.
- seiri 검증 게이트: 지정한 3/3 test suite와 배포 bridge 시나리오 1/1을 새로 실행했다.
- 알려진 위험과 수행하지 않은 검증은 §8에 열거했다. **ABANDON 없음** — 그 항목들은 근거 없이 결론 내리지 않고 후속 실측으로 유보한 것이다.
- 리뷰 재현 명령: 표의 각 `file:line`, §5의 세 test 명령, §9의 명령 형태를 저장소 루트에서 확인한다.
