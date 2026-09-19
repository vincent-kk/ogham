# restructure — Filid 1.0 Contract

## Requirements

- `plan`, `precondition`, `postcondition` action만 허용한다.
- plan은 같은 snapshot에서 placement evidence를 계산하고 크기와 무관하게 ephemeral artifact로 저장한다.
- validation은 absolute `planPath`의 common payload 또는 bare plan을 read-only로 검사한다.
- project source와 plan artifact를 수정하지 않는다.
- 세 action의 summary는 status와 결과로 고른 다음 단계 `nextAction`을 싣는다: 실행 절차, `decisions`·진단·finding의 `nextAction`을 따를 것, 또는 완료 보고. graph가 `unsupported`인 plan은 진단보다 먼저 status `unsupported`로 정한다. 그다음 계획에 관련된 `unknownFiles`가 있거나, `dependencies`나 `boundaries`에 영향을 선언한 진단(또는 `affects`가 없는 진단)이 있을 때만 `indeterminate`다. 무관한 `unknownFiles`(`unknownFiles.other`)에 귀속된 진단은 세지 않는다. 귀속은 진단의 경로가 그 파일이고 코드가 그 파일의 원인일 때다. precondition과 postcondition도 같은 규칙이다. `affects: []`인 진단(예: 버려도 분석이 더 엄격해지기만 하는 config 항목의 `config-warning`)은 status를 바꾸지 않는다.
- plan summary는 `alreadyPlacedCount`와 `affectedImportCount`(모든 move의 `affectedImports` 합)를 싣는다.
- plan artifact schema는 4다. 계획이 `unknownFiles`와 postcondition 기준선(`baseline`)을 싣는다. 기준선이 없는 옛 artifact를 받으면 계획 전부터 있던 순환·위반이 모두 새 finding으로 보이므로, 버전으로 거절해 새 계획을 만들게 한다. 옛 버전 artifact는 마이그레이션하지 않는다. artifact는 ephemeral이어서 계획을 다시 만드는 것으로 충분하다.
- plan artifact는 호출자가 고칠 수 있는 입력이다. `projectRoot`가 절대 경로가 아니거나, `readPaths`·`probePaths`의 항목이 경로 문자열로 또는 symlink를 따라간 실제 위치로 `projectRoot` 밖이면 어떤 파일도 읽기 전에 `plan-artifact-invalid`로 거절한다. 실제 위치 판정은 core restructure의 `isPhysicallyWithin`을 쓴다. MCP 서버는 호출자의 sandbox 밖에서 돌아, 밖의 경로를 hash하면 finding 유무가 그 파일 내용의 오라클이 되기 때문이다. 오류는 어느 필드가 밖인지만 말하고 파일 내용은 싣지 않는다.
- plan artifact는 서버가 쓴 그대로일 때만 읽는다. `planPath`의 실제 위치가 restructure 도구의 artifact 저장소(`<plugin cache>/artifacts/restructure/`) 안이고, 파일 이름(확장자 제외)이 파일 내용의 sha256과 같아야 한다(`persistToolArtifact`가 그 digest로 이름을 짓는다). 어기면 `plan-artifact-invalid`이고, 다음 행동은 "plan을 다시 만들고 돌려받은 경로를 그대로 써라"다.
  - 이유: `baseline`·`affectedImports` 같은 값은 호출자가 준 artifact에서 오고 `readHash`에 묶이지 않는다. 실패한 postcondition을 통과시키려고 artifact를 "고치는" 행동(예: 새 순환을 `baseline.cycles`에 적기)이 막으려는 대상이다.
  - 위협 모델은 정직하지만 틀릴 수 있는 에이전트다. digest를 다시 계산해 저장소에 써 넣는 의도적 위조는 범위 밖이다.
  - 안쪽 방어(경로 봉쇄, schema 검사)는 그대로 둔다. `baseline`과 `unknownFiles`의 경로에도 `readPaths`·`probePaths`와 같은 봉쇄 규칙(`projectRoot` 안의 절대 경로)을 적용한다.
- plan artifact 읽기 실패는 `plan-path-not-absolute`, `plan-artifact-not-found`, `plan-artifact-invalid`(다른 schema version 포함) 코드의 `ToolDiagnosticError`다. 옛 schema의 artifact는 `plan-artifact-invalid`로 새 계획을 만들라는 다음 행동을 받는다.

## API Contracts

| Action          | Input              | Delegation              | Payload                                   |
| --------------- | ------------------ | ----------------------- | ----------------------------------------- |
| `plan`          | `path`, `requests` | placement-plan handler  | plan summary + `persistence: always` data |
| `precondition`  | `path`, `planPath` | plan-validation handler | precondition summary + validation result  |
| `postcondition` | `path`, `planPath` | plan-validation handler | postcondition summary + validation result |

## Acceptance Criteria

### AC-restructure-dispatch — action별 단일 위임

- plan은 planner를 한 번 호출하고 validation action은 대응 core validator를 한 번 호출한다.
- validation action은 missing, relative 또는 invalid artifact를 코드와 `nextAction`을 가진 trust-boundary error로 거부한다. schema 3 artifact도 `plan-artifact-invalid`다.

### AC-restructure-payload — 기존 payload 보존

- plan의 summary, data, diagnostics와 always-persist 의미를 유지한다.
- validation의 mode, snapshot hash, finding count와 result를 유지한다.

### AC-restructure-next-action — summary 다음 단계

- plan ok, plan unresolved, postcondition ok, postcondition violations는 각자 다른 summary `nextAction`을 낸다.
- adapter가 없어 graph가 `unsupported`인 plan은 진단이 있어도 status `unsupported`다.

### AC-restructure-scopes — plan validation 범위

- precondition과 postcondition summary의 `scopes`는 입력 echo가 아니라 canonical 여섯 scope 전체다.
- plan validation input은 `scopes`를 받지 않는다.

## History

- 2026-09-20 — plan artifact schema를 4로 올렸다. 계획이 `unknownFiles`와 postcondition 기준선을 싣는다. 무관한 `unknownFiles`에 귀속된 진단은 상태를 흐리지 않는다.
- 2026-09-20 — plan artifact schema를 3으로 올렸다. import 요구의 모양과 precondition 기준(`readPaths`·`probePaths`·`readHash`)이 바뀌었다. summary의 `delegatedImportCount`를 `affectedImportCount`로 바꿨다. 위임 import가 `affectedImports`에 합쳐졌기 때문이다. artifact의 root 밖 경로(symlink 경유 포함)를 읽기 전에 거절하게 했다.
- 2026-09-19 — 응답 summary와 plan artifact 오류에 다음 단계를 붙였다. 호출자가 여러 단계로 된 절차의 다음 호출을 스킬 문서에서 추측해야 했다. adapter 없는 프로젝트가 진단 때문에 `indeterminate`로만 보고되어 `unsupported` 판정이 도달하지 않던 순서도 바꿨다.

## Last Updated

2026-09-20
