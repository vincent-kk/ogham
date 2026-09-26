# DETAIL — seiri

## Structure

- `bridge/claude`는 Claude 런타임이며 Antigravity도 runner를 거쳐 이 번들을 실행한다. `bridge/codex`는 compiler 설정 `codexHookRuntime`이 선택하는 Codex 런타임이다. bridge 루트의 MCP 서버·Antigravity runner·Windows shim은 모든 호스트가 공유한다.
- 두 호스트 모두 플러그인 디렉터리 전체를 설치한다 — 이 분리는 설치 범위가 아니라 실행 경로를 나눈다.

## Requirements

### Rule deployment

- 규칙 문서는 `templates/rules/` 에 포함되며 설정 페이지 또는 `settings` 같은 셋업 표면만 배포한다. 세션 훅은 규칙 아티팩트에 쓰지 않는다.
- 배포 채널은 현재 호스트가 정한다. Claude 는 `<repoRoot>/.claude/rules/<filename>` 파일을 사용하고, Codex 는 유효한 루트 `AGENTS*.md` 에 `SEIRI` 소유 마커 섹션을 사용한다. 같은 공개 함수가 두 채널을 조정한다.
- Codex 채널은 마커 밖 사용자 텍스트와 다른 소유자의 섹션을 보존하고, 재실행해도 같은 섹션을 중복하지 않는다.
- Codex 후보 파일에 저장됐지만 override에 가려진 섹션은 stored target/hash/inSync로 UI의 선택·drift·relocate 입력을 보존하되, 별도 effective target/hash/inSync가 없는 한 활성 규칙으로 보고하지 않는다.
- 배포 상태는 파일시스템에서 읽는다. 설정에 미러링하지 않는다 — 미러는 그것이 설명한다고 주장하는 파일과 어긋날 수밖에 없다.
- 모든 규칙은 opt-in 이다. 필수 규칙도, 자동 배포도 없다.
- `seiri_function-boundaries` 는 함수 파일에 비공개 보조 함수를 최대 2개 허용하되, 각 보조 함수의 본문 구현만 8줄 이하여야 한다. 함수 선언·시그니처와 본문을 감싸는 중괄호는 세지 않으며, 더 긴 보조 함수는 별도 파일로 분리한다.
- 배포된 파일의 바이트가 배포 템플릿과 다르면 drift 이다. Core 는 호출자가 `resync` 에 해당 규칙 id 를 명시하기 전까지 drift 를 보존한다. 설정 페이지는 선택된 drift 규칙에 대해 최신 배포 템플릿으로 교체하는 선택을 기본 활성화하고, 사용자가 행별로 해제하면 로컬 편집을 보존한다. 읽을 수 없는 배포 파일은 일치가 아니라 drift 로 친다.
- 선택에 없는 규칙 id 는 opt-out 이며, 해당 파일을 제거한다.
- 은퇴한 아티팩트 정리는 `seiri` 소유 네임스페이스로 제한한다. 매니페스트의 첫 항목이나 다른 플러그인의 파일명으로 소유권을 추론하지 않는다.
- 부분 실패는 실패 항목을 이유와 함께 `skip` 으로 기록하고 계속한다. 묵시적 실패는 금지한다.

### Preview

- `plan` 은 `sync` 가 무엇을 할지 답하고 아무것도 쓰지 않으며 대상·선택을 묶은 revision 을 반환한다. 브라우저 저장은 이 revision 을 왕복시켜 현재 계획과 다르면 `skip` 하고 다시 preview 하므로, 더 최신 사용자 편집을 덮지 않는다.
- 브라우저 저장의 revision 이 없거나 stale 이면 config 와 규칙 채널 모두 한 바이트도 쓰지 않고 세션을 완료하지 않는다. 적용 중 lock/revision conflict 가 나도 config 를 쓰거나 저장 완료로 보고하지 않으며, 새 preview 를 확인한 다음에만 다시 저장할 수 있다.

### Session reporting

- 최초 스킬 선택은 사용자 또는 호스트에 맡깁니다. 설치, Skill 로드, 프롬프트의 완료 표현, 일반 실패만으로 참여를 시작하거나 스킬을 선출하지 않습니다.
- off/advisory의 SessionStart·UserPromptSubmit·SubagentStart는 상태 배너·선출·원장 상기를 주입하지 않습니다. 그 결과 additionalContext 및 wire stdout은 비어 있습니다. standard/strict의 SessionStart는 선출 문구·체인 한 줄·활성 규칙 요약·다이얼·drift(strict는 posture 포함)를 주입하며, compact에서 이 actor 자신의 바인딩이 active면 진행 줄을 마지막에 덧붙입니다. 활성 바인딩이 있으면 UserPromptSubmit은 매 턴, SubagentStart는 부모 main의 활성 바인딩일 때 1회 진행 줄을 주입하고, PostToolUse는 `created`·`switched`에서만 진행 줄 형식 ACK를 냅니다(strict UserPromptSubmit은 활성 바인딩이 없으면(paused 포함) 체인 한 줄). 정적 훅 프로세스 실행 비용과 MCP 스키마 비용은 남으며, 전체 토큰 절감률을 실측 없이 주장하지 않습니다.
- standard/strict는 명시적으로 참여한 작업의 lifecycle ACK, CHECK 판정 변화와 반복 실패 관측, 그리고 선출·체인·진행 줄을 제공합니다. 어느 것도 모델의 방법 선택을 제한하지 않습니다. 규칙·드리프트 상세는 명시적 settings 조회, 런타임 다이얼은 `runtime` 도구의 `dial`(`dial_op: get`)에서 확인합니다.
- runtime 요청은 명시적 절대 project_root, kebab-case task, action을 받으며 start/resume에는 change 또는 review intent를 요구하고, `step`의 intent는 선택이며 생략하면 `parseWorkflowRequest`가 유도합니다(review-plan·request-review·receive-review → review, 나머지 → change, 명시 intent 우선). 도구의 accepted는 입력 검증일 뿐입니다. 같은 native invocation ID·actor·turn·generation·입력에 대응하는 성공한 Post만 상태를 적용하고 ACK를 보냅니다.
- Claude와 Codex는 build 시 고정된 host runtime을 사용하고 plugin-compiler가 Codex 경로를 선택합니다. event payload의 필드 유무로 호스트를 추측하여 다른 namespace의 참여를 만들지 않습니다.
- 진입 `step`(write-plan, execute)과 `start`만 새 바인딩을 만들거나 다른 task로 교체하며 카운터를 초기화합니다. `resume`과 나머지 `step`은 같은 task의 기존 바인딩(active 또는 paused)만 갱신하고, 바인딩이 없으면 아무것도 만들지 않습니다. pause는 중단, finish는 연결 종료이며 작업 성공 인증이 아닙니다. 이미 활성인 같은 작업에서 스킬만 바뀌면 무ACK로 조용히 갱신됩니다.
- UserPromptSubmit은 standard/strict에서 binding이 없어도 native-turn anchor를 조용히 만들되 이전 binding을 suspend하지 않고 활성 바인딩이면 진행 줄을 유지합니다(paused는 standard에서 무주입, strict는 활성 바인딩이 없으면(paused 포함) 체인 한 줄). off/advisory에서는 이전 binding을 suspend합니다. 어느 다이얼에서도 진행 중 호출은 폐기합니다. suspend된 바인딩(off/advisory 턴·세션 경계 뒤)이나 pause한 작업을 이어 갈 때만 모델이 task 이름으로 resume합니다. Pre/Post는 anchor를 만들거나 교체하지 않습니다.
- off/advisory는 신규 참여 관측과 주입을 하지 않습니다. 예외로 신뢰되는 턴·세션 경계에서는 기존 metadata/anchor를 무효화하여 이전 참여가 살아남지 않게 합니다. 기존 상태가 없으면 새 파일을 만들지 않습니다. 명시 gates API의 동작은 유지합니다.
- startup/resume/clear/fork는 기존 바인딩을 suspend하며 compact는 유지합니다. 자식은 자신의 최초 agent-stable turn anchor만 받고 부모 binding을 상속하지 않습니다. 자식도 필요한 경우 명시적 `start`나 진입 `step`을 호출합니다.
- 상태는 host/session/agent 해시별로 격리됩니다. actor는 7일 무관측, invocation은 24시간 후 만료하며 해당 actor 접근 시 정리합니다. 별도로 MCP 서버 시작 시 72시간 넘게 수정되지 않은 `sessions`·`tasks` 항목을 정리하며 git 추적·ignore 여부는 보지 않습니다. 구 `session-signals.json`/`.lock` 이름은 ignore 목록에만 남고 더 이상 읽거나 쓰지 않습니다.
- Bash의 Pre 관측과 Post 결과가 현재 참여와 일치할 때만 활성 task의 CHECK를 기록합니다. 다른 task의 같은 명령은 건드리지 않습니다. 동일 판정/증거의 재알림은 억제하고 회귀와 agent 증거 표시는 보존합니다. 중단한 실행은 판정·실패로 세지 않습니다.
- 락 실패 시 무잠금 mutation을 하지 않습니다. 경계 철회 실패는 revocation marker를 시도합니다. marker가 있는 동안 관측·완료·전이와 바인딩 읽기는 거부되고, 같은 actor의 다음 경계 트랜잭션(UserPromptSubmit·SessionStart·SubagentStart)이 커밋하면 실패한 경계의 suspend 의도를 적용하고 generation을 올려 진행 중 호출을 폐기한 뒤 자신이 본 marker를 지웁니다. actor와 marker 쓰기가 모두 실패하면 저장 복구 뒤 옛 상태가 나타날 수 있어 무누출 보장 범위 밖입니다. actor 상태와 원장은 별도 파일이므로 crash 시 정확히 한 번 기록·알림을 보장하지 않습니다.
- 훅은 차단·허용·입력수정 결정을 반환하지 않습니다. 무주입 entry는 stdout을 비우고 오류는 진단 채널에 기록합니다. 규칙 본문, 명령 원문, 전체 출력, EXPECT 원문이나 거부한 설정값을 지시문처럼 반사하지 않습니다. 외부 timeout은 stdin fail-open deadline보다 길어야 합니다.
- InstructionsLoaded는 dormant이며 주입하지 않습니다. 실제 두 호스트의 ID·응답 형식 기록은 확보했지만, 이전 턴 Pre/Post를 새 턴 뒤로 강제 지연한 native interleave는 직접 관측하지 못했습니다. 합성 역순·지연 테스트를 native 스케줄링 수용으로 바꾸어 보고하지 않습니다.

### Configuration

- 프로젝트 다이얼의 config.json은 커밋되는 baseline이며 셋업 표면만 씁니다. runtime.json은 비추적 밸브이며 `runtime` 도구의 `dial` 액션이 씁니다. 같은 .seiri 경계의 actor 상태와 task 원장은 각 소유 모듈이 별도로 관리합니다.
- 실제로 적용되는 dial 은 `runtime ?? baseline ?? user ?? off` 이다. 훅은 실행마다 해석하므로, 변경은 세션 재시작 없이 적용된다. 기존 파일의 `advisory`·`standard`·`strict` 값은 그대로 유효하다.
- Runtime 값이 baseline 과 다르면, dial 이 렌더되는 모든 곳에서 그 사실을 명시한다. 묵시적 override 는 금지한다.
- 읽기는 절대 throw 하지 않는다. 손상된 계층은 건너뛰고 다음 계층을 적용하며, 무시한 파일을 경고에 명시한다.
- `.seiri/` 에 처음 쓸 때(설정 저장·밸브 조작 어느 쪽이든) `.gitignore` 도 만들어, 그 디렉터리의 untracked 구성원을 나열한다. 저장소 루트 ignore 파일은 절대 편집하지 않는다.
- 이미 있는 `.gitignore` 는 seiri 가 쓴 것일 때만 손댄다 — 헤더로 판별하고, 빠진 구성원만 덧붙이며 기존 줄은 지우지 않는다. 헤더가 없으면 사용자가 쓴 파일이므로 그대로 둔다. 구성원이 늘어도 기존 프로젝트가 갱신을 받지 못하면, 새 untracked 파일이 커밋에 흘러든다.

### Skill posture

- 스킬은 적용 범위를 만족할 때 선택하며, 파일 로드나 설치만으로 수행·완료·다음 단계의 필요성을 추정하지 않습니다. 설명·읽기 전용 리뷰·짧은 조사에는 개발 계획과 원장을 강제하지 않습니다.
- 실행 스킬은 승인된 목표와 경계를 지키되 가역적인 방법 선택을 모델에 남깁니다. 검증은 주장에 비례하며 같은 산출물·환경·범위에서 유효한 근거를 재사용합니다. 동작 변경의 fail-first, 리팩터링의 기존 동작 보존, 문서 변경의 산출물 검사를 구별합니다.
- 원장은 지속 검증이 필요한 작업에만 두며 조회는 해당 task로 한정합니다. 관련 없는 원장이나 실패한 테스트가 사용자의 keep 선택을 막지 않습니다. 이미 승인된 독립 검토를 다시 허가받도록 요구하지 않습니다.
- 스킬 선택 분류는 `src/constants/skillPolicy.ts`가 소유합니다. 분류는 호출 가능성을 나타내며 실행 순서나 질문을 강제하지 않습니다. 테스트는 모델 노출·명시호출 경계와 필요한 문서 계약을 검사하며, 설명 문구 일치만으로 모델 행동의 효용을 입증했다고 판단하지 않습니다.
- 모델 목록 노출과 실제 참여는 별개입니다. 사용자 시작 스킬도 발견 가능하며, 사용자 전용 게이트만 disable-model-invocation으로 숨깁니다. 분류는 고정 실행 순서나 훅 선출을 뜻하지 않습니다.
- `clarify-request` 는 구현 결과를 실질적으로 바꾸는 미확정 사항만 질문하고, 저장소에서 확인할 수 있는 사실은 먼저 조사한다. 낮은 위험의 가정은 밝히고 진행할 수 있지만 중대한 미결정은 지어내지 않는다.
- `architect` 는 여러 세션이 이어서 사용할 요구사항·시스템 관점·결정을 저장소 근거로 남긴다. PRD·C4·ADR 같은 이름은 서로 다른 목적을 환기할 뿐 필수 세트·고정 형식·작성법이 아니며, 현재 상태·제안·결정·열린 질문을 구분하고 구현 계획·코드 편집·구조 강제로 내려가지 않는다.
- `write-plan`은 사용자 명시 방법, 저장소 규칙·템플릿, 호스트가 선택한 계획 스킬, 내장 기본법 순서로 적용 가능한 방법을 고릅니다. 선택된 방법의 고유 구조를 보존하고 대화 독립성·현재 상태 근거·요구사항과 검증의 연결·placeholder 금지를 지킵니다. 지속 검증 추적이 유용할 때만 별도 원장을 만들며 실행 스킬의 선택 자체는 원장 생성 사유가 아닙니다. 구조적 결정을 내리면 계획 옆 `adr.md`에 맥락·결정·근거·대안·영향을 독립적으로 남깁니다.
- 자동 호출 규율은 자율 판단을 우선한다: 선택이 필요하면 보수적 기본값을 택하고 한 줄로 공개한다. 사용자만 결정할 수 있는 진짜 blocker 는 AskUserQuestion 1회로 묻되, 관례적 체크포인트 질문은 하지 않는다. frontmatter 도구 차단(`disallowed-tools`)은 사용하지 않는다.
- `review-plan`은 선택된 방법과 공통 불변조건에 맞춰 불확실한 주장을 검토합니다. 중요한 경계 변경·이관·미해결 위험에는 독립 검토를 사용하되, 새 파일이나 다른 작성자라는 이유만으로 요구하지 않습니다. 이미 허가된 검토를 재질문하지 않고 검토 중에도 독립 작업을 계속할 수 있습니다. 독립 검토 없는 결과는 grounded-only로 기록하며 수정 후에는 바뀐 주장만 한 번 범위 검토합니다.
- 게이트 원장은 write-plan → review-plan → execute → verify → request-review → finish 를 가로지르는 횡단 관심사이며, 포맷 정본은 `skills/execute/references/gates-format.md` 다.
- CHECK와 EXPECT는 함께 설계한다. CHECK가 실제 결과 조건을 검사하고 충족 시에만 고정 성공 문자열을 출력하며, EXPECT는 그 문자열의 줄 단위 리터럴 매칭을 맡는다. write-plan은 이 쌍을 작성하고 review-plan은 조건 실패 시 마커가 나오지 않는지 검토한다. 정규식 모드와 구형 원장 이관은 없다.
- scaffold-pr 는 작업 시작 게이트다: 브랜치·빈 커밋·Draft PR 만 만들고 소스 파일은 건드리지 않는다(이슈·티켓 연동 없음). git·gh 시퀀스는 동봉 `scaffold-pr.mjs` 가 결정적으로 수행하고(셸 미사용 argv spawn — 크로스플랫폼), LLM 은 브랜치·제목·본문 결정과 JSON 결과의 안정 실패 코드 해석만 맡는다. finish 가 닫는 브랜치 수명의 반대쪽 끝을 연다.
- scaffold-pr 의 옵션은 목적이 아니다. 목적 없이 `--base`·`--ready` 같은 옵션만 주어지면 목적 선택을 한 번 묻고, 옵션은 그 선택과 함께 실행 인자로 보존한다.
- implement 에서 missing import/export는 새 심볼의 부재 자체가 변경 전 상태일 때만 올바른 red 증거다. 이미 있어야 하는 심볼의 부재나 경로 오타는 계속 setup failure로 다룬다.
- trace-cause 는 보고된 증상을 실제로 재현하는 명령을 기준선으로 삼는다. 지정 verification이 그 증상을 재현할 때는 그것을 쓰고, 그렇지 않으면 증상 전용 명령을 쓰며 수정 전후에 같은 재현 명령을 다시 실행한다.
- 문서를 쓰는 스킬의 정본은 `src/constants/skillPolicy.ts`의 `DOCUMENT_WRITING_SKILLS`(architect·clarify-request·review-plan·write-plan)다 — 파티션이 아니라 횡단 축이며, 각 이름은 위 파티션 중 정확히 하나에도 속한다. 구성원은 세션 응답 언어 정본 문장을 본문에 그대로 담는다: 문서는 세션 응답 언어(하니스가 응답에 설정한 언어, 없으면 응답이 이미 쓰는 언어)로 쓰고, 기계가 읽는 토큰·식별자·경로·코드·명령은 원문을 유지한다. `skillPolicy.test.ts`가 문장을 바이트 단위로 검사한다. 원장은 `gates-format.md`의 언어 규칙이 덮고, HTML 설명 스킬은 지정된 독자를, PR 제목·본문과 리뷰 인계물은 저장소 관례를 따르므로 목록에 넣지 않는다. seiri 는 언어를 저장하지 않는다 — 하니스 설정이 정본이고 사본은 드리프트한다.

## API Contracts

| Export                                     | Contract                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `loadConfig(projectRoot)`                  | Baseline 계층만: `{ config \| null, path, warning? }`. 절대 throw 하지 않음.                                                     |
| `loadIntervention(projectRoot)`            | 세 계층: `{ effective, source, baseline, user, runtime, warnings }`. 절대 throw 하지 않음.                                       |
| `writeConfig(projectRoot, config)`         | Baseline 을 원자적으로 쓰고 `.seiri/.gitignore` 도 처리; 쓴 경로를 반환.                                                         |
| `writeRuntime(projectRoot, level)`         | 밸브를 원자적으로 쓰고 `.seiri/.gitignore` 도 처리; 경로를 반환.                                                                 |
| `clearRuntime(projectRoot)`                | 밸브를 제거하고, 존재 여부를 반환.                                                                                               |
| `loadManifest(pluginRoot)`                 | 잘못된 manifest 또는 없는 `templateHash` 에서 throw.                                                                             |
| `getRuleDocsStatus(projectRoot, plugin)`   | 현재 호스트 채널의 규칙별 스냅샷 (`inSync` 포함).                                                                                |
| `planRuleDocs(...)` / `applyRuleDocs(...)` | 동일한 호스트 대상·revision 을 사용; `applied` 로 preview 와 write 를 구분.                                                      |
| `settings`                                 | `action` 은 `open` · `status` · `manifest` · `plan` · `sync`; `open` 은 `{ status: saved \| closed \| pending, url, summary? }`. |
| `runtime` `action: dial`                   | `{ action, op, changed, dial, posture }`. `dial_op: set` 은 유효한 `intervention` 필요; baseline 은 절대 쓰지 않음.              |

### Distribution preparation

- 생성 runtime·adapter는 소스 커밋에 섞지 않고, 소스 커밋 뒤의 별도 build 커밋으로 커밋합니다. 지정 provider와 seiri 빌드 후 prepareSeiriDistribution이 package allowlist의 정본과 새 runtime을 복사하고 compiler로 임시 배포본의 adapters를 생성합니다. tracked adapter를 입력으로 재사용하지 않습니다.
- CI는 해당 job에서 runtime을 먼저 빌드하고 임시 배포본의 재생성 결정성·정본 해시·manifest 일치·참조 존재를 확인합니다. marketplace는 커밋된 트리를 그대로 설치하므로, 같은 job은 새 빌드 후 커밋된 seiri runtime·adapter에 차이가 남으면 실패합니다. 다른 플러그인과 루트의 committed-adapter drift 검사도 유지합니다.
- 로컬 generated distribution 수용과 공개 배포는 다릅니다. Vincent의 배포 채널 결정 및 설치 수용 전에는 버전 변경·공개 출시와 marketplace가 읽는 Git ref로의 push/merge를 하지 않습니다.

## Scope

범위 밖: 아키텍처 강제, 에이전트 오케스트레이션, 작업 분해, 지식 관리, 알림, 상태 표시, 코드 검색·분석 도구. seiri 가 소유하는 것은 컨텍스트 — 저장소의 진실도, 모델의 판단도 아니다.

## Acceptance Criteria

### AC-context-only — 소유 범위

- 어떤 도구도 코드 읽기·검색·분석 기능을 노출하지 않는다.
- 어떤 훅도 차단 결정을 반환하지 않는다.

### AC-rule-body-not-injected — 규칙 본문 비주입

- 훅 주입에 배포된 규칙 문서 본문이 복제되지 않는다. 이름과 상태만 나간다.

### AC-dial-precedence — 다이얼 우선순위

- 유효 다이얼이 `runtime ?? project ?? user ?? off` 로 정해지고 출처가 함께 보고된다.
- off/advisory는 신규 관측·주입 없이 동작하며, 기존 참여의 신뢰되는 경계 무효화만 허용합니다. 무주입 stdout은 비어 있습니다.
- standard/strict의 비참여 작업에는 SessionStart의 선출·체인·규칙 요약과 strict의 활성 바인딩이 없는 턴의 체인 한 줄 외에 절차를 주입하지 않고, 실제 참여 여부는 대응하는 Pre/Post로 적용된 바인딩으로 결정합니다.

### AC-deployment-consent — 배포 동의

- 규칙 파일 쓰기가 사용자의 명시적 확인 뒤에만 일어난다.
- 드리프트한 파일은 `resync` 에 id 가 명시될 때만 덮어쓰인다.

### AC-tool-surface-fixed — 도구 표면

- 등록 도구는 settings, gates, runtime 세 개이며 설정·지속 증거·세션 런타임(참여·단계·다이얼 밸브)의 서로 다른 계약을 소유합니다.

### AC-host-parity — 호스트가 판정을 바꾸지 않는다

- 같은 활성 작업·유효한 호출 대응·저장소 상태·명령·원장이면 Claude Code와 Codex가 같은 판정 줄과 같은 원장 바이트를 냅니다. 게이트 판정은 정규화된 출력 텍스트와 `EXPECT` 만으로 결정되며, exit code·훅 이벤트 이름·`tool_response` 의 형태는 판정에 들어가지 않는다.
- 호스트에 이벤트나 필드가 없을 때만 차이를 허용하고(Codex 의 `PostToolUseFailure`·`is_interrupt` 부재), 그 차이는 보수적 방향으로만 나타난다 — 어떤 호스트에서도 거짓 met 은 생기지 않는다.
- 실패 연쇄는 명시적 failure 이벤트, 알려진 exit, CHECK 판정 순으로 근거를 사용한다. 앞의 두 근거가 없는 Codex 호출은 CHECK가 `unmet`이면 실패로 세고 모든 판정이 `met`이면 성공으로 초기화한다. 판정 불가능한 Codex 명령은 기존 실패 카운터를 건드리지 않는다.

### AC-skill-visibility — 모델 목록과 워크플로우 선출 분리

- 모델-visible 사용자 시작 스킬에는 disable-model-invocation이 없으며, 설치나 발견만으로 실행되지 않습니다.
- 모델에게 숨기는 사용자 전용 게이트에는 disable-model-invocation: true가 있으며 명시 호출 범위를 유지합니다.
- 모든 배포 스킬은 자동 호출 규율·조건부 질문·visible 사용자 시작·hidden 사용자 전용 중 정확히 하나에 속한다.

### AC-check-expect-pair — 조건 검사와 성공 문자열은 한 쌍이다

- CHECK는 활동의 정상 종료뿐 아니라 게이트가 약속한 결과 조건을 검사한다. 충족된 경우에만 EXPECT의 고정 문자열을 출력한다.
- write-plan과 review-plan은 CHECK의 조건 검사와 EXPECT의 리터럴 문자열을 함께 작성·검토한다. 자연 출력에 고정 성공 문자열이 이미 있으면 재사용할 수 있다.
- EXPECT의 정규식 문법을 제공하지 않으며 출력·증거·호스트 동일 판정 계약을 유지한다.

### AC-user-started-shaping — 필요한 요청 불확실성만 다루기

- `clarify-request` 의 이름과 description 만으로 모호한 요청을 실행 가능한 범위로 만드는 역할이 드러나며, 구현을 바꾸지 않는 질문은 강제하지 않는다.
- 질문 횟수·순서·고정 출력 형식을 계약하지 않는다. 저장소 근거, 관찰 가능한 성공, 중대한 가정과 미결정만 결과에 필요한 만큼 남긴다.

### AC-architecture-records — 아키텍처 의도를 지속 가능한 기록으로

- `architect` 는 모델-visible 사용자 시작 문서 스킬이며 표준 워크플로우 체인이나 `write-plan`의 필수 전후 단계가 아니다.
- PRD·C4·ADR과 비슷한 기록은 서로 다른 목적을 환기하는 선택지다. 스킬은 전부 작성하거나 특정 절·표기·도구를 따르도록 강제하지 않고, 저장소 관례와 현재 과제에 필요한 가장 가벼운 조합을 택한다.
- 결과는 관찰한 현재 상태, 제안, 수용된 결정, 열린 질문을 구분하고 중요한 근거·tradeoff·가정·위험·가역성을 보존한다. 다른 세션이 대화 없이 이어갈 수 있어야 하며 같은 주장을 중복하거나 불확실성을 결정으로 굳히지 않는다.
- 구현 태스크·정확한 코드 편집·실행 계획은 범위 밖이다. 저장소 아키텍처 도구가 소유한 구조 경계·임계치·검증을 대신 강제하지 않는다.

### AC-planning-method-selection — 선택된 계획법과 기본법의 경계

- `write-plan` 은 사용자 명시 방법 → 저장소 planning 규칙·템플릿 → 호스트가 선택한 planning skill → Seiri 기본법 순서에서 처음 적용되는 방법을 고르고 그 출처를 한 줄로 기록한다. 설치된 스킬은 존재만으로 선택되지 않는다.
- 선택된 방법이 있으면 그 방법의 고유 구조를 보존하고 Seiri 기본법을 합치지 않는다. 기본법은 다른 적용 가능한 방법이 없을 때만 작업 분해와 계획 형태를 제공한다.
- 대화 없이 실행 가능함, 현재 상태 주장의 저장소 근거, 모든 요구사항과 검증의 연결, placeholder 금지는 planning method와 무관한 불변조건이다.
- 계획이 모듈 경계·의존 방향·공개 소유권 또는 계약·장기 코드 배치를 선택하면 실제 계획과 같은 디렉터리에 `adr.md` 를 쓴다. 이 문서만으로 맥락·결정·이유·검토한 대안·주요 영향을 파악할 수 있어야 하며 실행 단계는 계획에 남긴다. 구조적 판단이 없으면 `adr.md` 를 만들지 않는다.
- `review-plan`은 사용자 요청·저장소 지침에서 method 출처를 확인하고 선택된 방법과 공통 불변조건을 검토합니다. 원장은 지속 검증 추적이 필요한 경우에만 작성하며, 존재하는 원장의 CHECK/EXPECT 계약은 그대로 검사합니다.

### AC-workflow-entry-validity — 실제 진입 경로를 잃지 않는 워크플로우

- scaffold-pr 는 옵션-only 호출을 목적 입력으로 오인하지 않고 목적을 한 번 결정한 뒤 옵션을 보존한다.
- implement 는 새 심볼을 추가하는 변경에서 그 심볼의 부재를 유효한 변경 전 실패로 허용하되, 일반적인 missing import는 허용하지 않는다.
- trace-cause 는 테스트·CLI·UI·runtime 중 보고된 증상을 재현하는 명령을 기준선으로 삼고 같은 명령으로 수정 전후를 비교한다.

### AC-hook-input-confinement — 저장소 입력은 컨텍스트 명령이 아니다

- 미충족 게이트의 훅 판정 줄에는 `EXPECT` 원문이 없고, 잘못된 intervention 경고에는 거부된 원값이 없다.
- stdin fail-open deadline은 이를 사용하는 모든 활성 훅의 외부 timeout보다 짧다.

### AC-explain-explanation — 개념·관계 중심 시각 설명

- 완전한 산출물은 실행 환경이 선택한 저장소 밖의 쓰기 가능한 임시 저장 위치나 스크래치패드에 기록한 `single self-contained HTML` 한 개다. 대화는 한 문장 방향 요약과 경로만 건네며 별도의 Markdown 보고서를 만들지 않는다.
- HTML 작성과 렌더링 점검을 마치면 대화로 인계하기 전에 완성된 파일을 시스템 기본 브라우저로 연다.
- 가리킨 자료만으로 설명하지 않는다. 호출자·피호출자·설정·테스트·문서 등 연결된 자료를 이해가 접지될 때까지 따라간 뒤에 쓴다. 주석과 문서는 의도를 보여줄 뿐이므로 모든 주장은 코드가 실제로 하는 일에 접지한다.
- 설명의 뼈대는 개념-관계 지도다. 독자가 답을 이해하는 데 필요한 용어를 고르고, 각 용어에 한 문장 구체 정의와 다른 용어와의 관계 — 호출·소유·선행·제약 — 를 부여하며, 질문과 관계없는 개념은 싣지 않는다.
- 실제 입력이나 값을 실제 코드 경로 끝까지 따라가며 모든 추상을 관찰 가능한 흐름에 연결한다.
- 서술은 스킬 동봉 `reference.md` 의 편집 스타일을 따른다 — 문제 장면 선행 도입, 질문이 개념에 앞서는 전개, 용어 첫 등장 정의, 코드 전후 설명 샌드위치, 트레이드오프를 밝히는 마무리. 본문 언어는 여전히 지정된 독자를 따른다.
- 도해는 관계·구조·순서·상태·비교를 산문보다 빨리 이해시키는 설명 수단이다. 삭제해도 정보가 줄지 않는 장식은 만들지 않고, 내용에 맞는 소수의 시각 문법을 일관되게 쓴다.
- 페이지는 읽기 쉬운 위계·대비·여백과 차분한 중립색을 바탕으로, 하나의 중심 강조색으로 정체성을 세우고 보조 강조색은 의미 있는 비교나 상태에만 쓴다. 글자·도해·코드·컨트롤은 한 시각 계열을 유지한다. 실제 색·서체·크기·구성과 토큰·템플릿은 고정하지 않으며 데스크톱·모바일 구성을 확인한다.
- 렌더링 검증은 대표 데스크톱·모바일 뷰포트 각 1개와 인터랙션 유형별 1회로 제한하고, 수정 뒤에는 영향받은 뷰만 재확인한다. 전면 브라우저 커버리지나 분석 대상의 정확성 검증으로 확장하지 않는다.
- 중요한 주장은 `traced`·`inferred`·`assumed`로 근거 강도를 드러내고, 확인하지 못한 한계를 숨기지 않는다.

### AC-trace-change-explanation — 시각적 변경 설명

- 완전한 산출물은 저장소 밖의 `single self-contained HTML` 한 개다. 대화는 방향 요약과 경로만 건네며 별도의 장문 설명을 복제하지 않는다.
- HTML 작성과 렌더링 점검을 마치면 대화로 인계하기 전에 완성된 파일을 시스템 기본 브라우저로 연다.
- 설명은 결론 우선·문제 중심으로 전개한다. 대화하듯 쓰되 정확성을 잃지 않고, 짧은 단락과 독자 질문으로 전환하며, 전문 용어는 처음에 정의하고 한계와 트레이드오프를 숨기지 않는다.
- 독자는 이 페이지 하나로 기존 시스템, 변경의 핵심, 동일 입력의 전후, 이를 만드는 코드, 바뀌지 않은 경계를 설명하고 이해도 질문에 답할 수 있다. 작성자는 이 질문들을 내용에 맞게 묶고 배열한다.
- 도해는 실제 `concrete values`로 위치나 전후 차이를 이해시키며, 내용에 맞는 소수의 시각 문법을 재사용한다. 삭제해도 정보가 줄지 않는 장식용 도해는 만들지 않는다.
- 페이지는 읽기 쉬운 위계·대비·여백과 차분한 중립색을 바탕으로, 하나의 중심 강조색으로 정체성을 세우고 보조 강조색은 의미 있는 비교나 상태에만 쓴다. 글자·도해·코드·컨트롤은 한 시각 계열을 유지한다. 실제 색·서체·크기·구성과 토큰·템플릿은 고정하지 않으며 데스크톱·모바일 구성을 확인한다.
- 렌더링 검증은 대표 데스크톱·모바일 뷰포트 각 1개와 인터랙션 유형별 1회로 제한하고, 수정 뒤에는 영향받은 뷰만 재확인한다. 전면 브라우저 커버리지나 분석 대상의 정확성 검증으로 확장하지 않는다.
- 읽은 코드의 사실은 경로와 줄로 근거를 대고, 읽지 않았거나 의도를 추론한 내용은 `inference`로 구분한다.

### AC-document-language — 문서는 세션 응답 언어를 따른다

- `DOCUMENT_WRITING_SKILLS`의 모든 스킬 본문이 정본 문장을 바이트 단위로 담고, 목록의 모든 이름은 `SHIPPED_SKILLS`에 속한다.
- 목록 밖 스킬(execute·explain·trace-change·request-review·scaffold-pr·기타)의 본문에는 정본 문장이 없다 — 원장·HTML·PR·인계물의 언어는 각각 원장 포맷·독자·저장소 관례가 정한다.
- 게이트 원장 포맷은 게이트 서술·제목·ABANDON 사유를 세션 응답 언어로 쓰되 `Plan:`·`G<n>`·`CHECK:`·`EXPECT:`·`EVIDENCE:`·`ABANDON:`·`## Final`과 CHECK·EXPECT 값은 원문을 유지한다고 명시한다.
- seiri는 언어 설정을 저장·주입·노출하지 않습니다. 문서 언어 선택 때문에 훅·도구·SeiriConfig 필드를 추가하지 않습니다.

## History

- 2026-09-26 — 전역 선출과 스킬 로드 기반 체인을 명시적 작업 참여로 바꿨습니다. 설명·리뷰·일반 질문에서 불필요한 절차를 주입하지 않고 모델의 범위·방법 판단을 보존하기 위한 결정입니다.

- 2026-09-05 — CHECK가 조건을 검사하고 EXPECT는 고정 성공 문자열만 확인하도록 책임을 정했다. 원장의 출력 증명은 유지하면서 훅에서 저장소 정규식을 실행하는 비용을 제거했다.
- 2026-09-05 — 플러그인 검증에서 발견된 워크플로우 진입 손실과 저장소 원문 반사·timeout 경합을 바로잡기로 했다. 새 심볼·증상 전용 재현·옵션-only 호출의 실제 경로를 계약에 포함하고, 프로젝트 입력은 훅 컨텍스트에 재출력하지 않으며 stdin fail-open 뒤 종료 여유를 보장한다.
- 2026-09-03 — `intervention: off`를 skills-only 기본값으로 추가했다. 스킬은 명시 호출할 수 있게 유지하면서 훅의 강제 체이닝·상태 변경을 모두 먼저 건너뛰고, 의미 없는 `{ continue: true }` wire 응답도 stdout에 남기지 않기 위해서다. 기존 저장 값은 그대로 명시적 opt-in으로 존중한다.
- 2026-09-01 — mental-model 스킬을 explain 으로 개명하고, 중심 원리를 세워 연역·공격하는 방법을 제거했다. 연결된 자료를 따라가 정확히 이해한 뒤 개념-관계 지도를 뼈대로 가르치는 방식이 하나의 원리 방어보다 설명력을 높인다는 판단에서다. 편집 스타일은 동봉 `reference.md` 가 계속 소유한다.
- 2026-09-01 — mental-model 아티클의 편집 스타일 정본을 스킬 동봉 `reference.md` 로 분리했다. toss.tech 아티클 10편 조사에서 도출한 문제 선행 서사·용어 도입·코드 샌드위치·도해 배치 규칙을 SKILL.md 4KB 예산 밖에서 상세화해, 참조 링크 없이도 같은 편집 스타일로 아티클을 쓰게 하기 위해서다.
- 2026-08-31 — 독립 `brainstorm` 스킬을 제거했다. 구현 방향은 실행 가능한 계획을 만드는 `write-plan`의 일반 추론으로 선택하고, 그 과정의 구조적 결정은 조건부 `adr.md` 계약에 따라 기록하며, 여러 세션에 남길 아키텍처 작업은 `architect`가 계속 소유하게 해 겹치는 발견 표면을 줄이기 위해서다.
- 2026-08-31 — write-plan 이 구조적 결정을 내린 경우에만 실제 계획 옆 `adr.md` 에 결정의 맥락·근거·대안·영향을 짧게 남기도록 했다. 긴 실행 계획을 전부 읽지 않아도 핵심 판단을 검토할 수 있게 하면서, 특별한 판단이 없는 작업에는 빈 기록을 만들지 않기 위해서다.
- 2026-08-31 — 구현 계획과 독립된 사용자 시작 `architect` 스킬을 추가하기로 했다. 최신 모델이 이미 아는 PRD·C4·ADR 형식을 다시 가르치지 않고, 필요한 관점의 선택·근거 구분·세션 독립성·구조 강제 금지만 남겨 장기 설계 작업을 돕되 판단 범위를 보존하기 위해서다.
- 2026-08-30 — write-plan 을 단일 계획 포맷에서 planning method 선택기로 바꿨다. 사용자·저장소·호스트가 고른 방법의 고유 구조를 보존하고, 그런 방법이 없을 때만 Seiri 기본법을 제공해 다른 계획 기법을 덮어쓰지 않도록 하기 위해서다. 기계가 읽는 게이트 원장과 방법에 무관한 최소 불변조건만 공통 계약으로 남겼다.
- 2026-08-28 — 마크다운 문서를 쓰는 스킬 4종에 세션 응답 언어 정본 문장을 넣고 `skillPolicy.test.ts`로 검사하게 했다. 스킬 템플릿이 영어라 계획·원장의 제목과 틀이 응답 언어와 어긋나게 섞이던 것을, 언어 설정을 새로 두지 않고 하니스 설정을 따르게 해 바로잡기 위해서다. 원장은 포맷 문서의 규칙으로, HTML·PR·인계물은 독자와 저장소 관례로 넘겨 사본을 넷으로 줄였다.
- 2026-08-28 — 시각 HTML 스킬의 렌더링 검증을 대표 데스크톱·모바일 뷰포트와 인터랙션 유형별 한 번의 스모크 체크로 제한했다. 표시 안정성을 유지하면서 설명 생성보다 검증에 과도한 시간을 쓰지 않도록 하기 위해서다.
- 2026-08-28 — HTML 설명 산출물을 작성한 뒤 시스템 기본 브라우저로 여는 종료 동작을 추가했다. 산출물 인계와 실제 열람 사이의 수동 단계를 없애기 위해서다.
- 2026-08-28 — mental-model 산출물의 임시 위치를 `/tmp` 같은 운영체제별 경로로 고정하지 않고 실행 환경이 선택하도록 바꿨다. 같은 스킬 계약이 플랫폼 경로 규칙과 무관하게 작동하도록 하기 위해서다.
- 2026-08-28 — 사용자 시작형 명료화·설계 스킬을 역할 중심 이름과 짧은 자립형 본문으로 재구성했다. 질문 순서·후보 수·문서 형식을 고정하지 않고 구현을 바꾸는 불확실성과 저장소 근거만 계약으로 남겨 최신 모델의 판단 범위를 보존하기 위해서다.
- 2026-08-28 — 두 HTML 설명 스킬의 목소리와 색조를 하나의 편집 언어로 맞췄다. 독자가 매체 차이보다 설명 방식에 집중하도록 trace-change도 mental-model의 결론 우선·문제 중심 논조를 따르고, 둘 다 중립색·중심 강조색·의미 기반 보조색 관계만 공유하되 구체 토큰과 템플릿은 내용에 맡겼다.
- 2026-08-27 — 시각 설명의 매체 계약을 목적별로 분리했다. mental-model은 반증을 견딘 중심 원리와 그 연역을 단일 HTML로 가르치고, trace-change는 변경의 전후 인과를 단일 HTML로 가르친다. 둘 다 도해와 이해도 점검을 설명의 일부로 두되 화면 구성은 내용에 맡긴다.
- 2026-08-24 — 모델 목록 노출과 워크플로우 선출을 분리했다. 사용자 시작 스킬은 발견 가능하지만 자동 체인에서는 제외하고, 명시 호출 전용 게이트만 모델에서 숨긴다.
- 2026-08-23 — 호스트마다 다른 이벤트·출력 형태가 판정을 바꾸지 않도록, 관측 출력의 EXPECT 일치만 게이트 성공으로 삼았다. exit·failure 이벤트는 근거를 보강할 뿐이며 판정 불가는 성공으로 바꾸지 않는다.
- 2026-08-22 — 실행 가능한 CHECK와 증거를 세션 독립 원장에 두고, verify가 미충족 완료 주장을 execute로 돌려보내게 했다. 완료를 세션 기억이 아니라 다시 읽을 수 있는 증명으로 만들기 위해서다.
- 2026-08-19 — 계획도 검증해야 할 주장 묶음이므로 write-plan과 execute 사이에 review-plan을 넣었다. challenge는 가장한 독립 검토 대신 실제 위임 여부를 묻고 판정을 계획에 남긴다.
- 2026-08-12 — scaffold-pr의 범위를 브랜치·빈 커밋·Draft PR로 제한하고 절차를 결정적 스크립트에 맡겼다. LLM 판단 범위와 플랫폼별 셸 편차를 줄이기 위해서다.
- 2026-07-31 — 질문 규율을 턴 한정 frontmatter 도구 차단에서 본문 계약으로 옮겼다. 기존 차단은 텍스트 질문을 막지 못하면서 정당한 질문 형식만 제한했다.
- 2026-07-30 — 계약을 검증 가능한 acceptance group으로 바꾸고 `loadIntervention`을 실제 3계층에 맞췄다.

## Last Updated

2026-09-27 — MCP 시작 시 git 추적·ignore 여부와 무관한 72시간 유휴 상태 정리를 반영했습니다.
