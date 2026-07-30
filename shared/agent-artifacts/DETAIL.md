# Agent Artifacts Public Contract

## Requirements

- 지원 호스트는 `claude`와 `codex`이며 알 수 없는 호스트는 암묵적으로
  호환 처리하지 않는다.
- 프로젝트 관리자는 절대 `projectRoot`를 요구한다. 사용자 관리자는 경로를
  받지 않고 `@ogham/cross-platform`의 호스트 상태 루트를 사용한다.
- 규칙, 지침, MCP는 각각 독립된 manager로 `inspect`, `plan`, `apply` 계약을
  제공한다.
- `plan`은 읽기 전용이며 대상 리비전을 기록한다. `apply`는 잠금 아래에서
  리비전을 다시 확인하고 stale plan을 `conflict`로 거부한다.
- 규칙 파일명, 소유자 ID, MCP 이름은 대상 경로 또는 명령으로 전달하기 전에
  검증한다.
- 비소유 텍스트·파일·MCP 서버 및 명시적으로 교체하지 않은 drift는 보존한다.
- 프로덕션 소스의 경로, 파일 시스템, 잠금, 원자적 쓰기, CLI 실행은 모두
  `@ogham/cross-platform`을 통해 수행한다.
- sibling 엔진은 상대 모듈의 `index.ts` 계약만 사용하고, facade가 다시
  구현을 참조해 생기는 타입 의존 순환을 만들지 않는다.
- `smol-toml`은 크기가 제한된 Codex 프로젝트 TOML을 편집 전후 검증하는
  용도로만 사용하며 전체 문서를 재직렬화하지 않는다.

## API Contracts

### Package entry point

`@ogham/agent-artifacts`는 패키지 루트 하나만 공개하며 현재 도달 가능한 80개
심볼을 구체 소유 파일에서 이름으로 재수출한다. `sideEffects: false`를 유지해
hook 소비자도 같은 루트를 쓰면서 비기여 manager·planning·apply 모듈을 번들에서
제거한다.

`HookInstructionSnapshot`은 hook instruction 판독의 중간 단계 타입이라 루트
계약에서 뺐다. 공개 계약 타입은 `types/` organ이 소유하는데 이 타입은 거기
속하지 않고, 공개 심볼 어느 시그니처에도 나타나지 않는다. 파일은 그대로 두고
루트 재수출만 멈춘다.

### Scope and manager types

```ts
type ArtifactHost = "claude" | "codex";

interface ProjectArtifactManagerOptions {
  host: ArtifactHost;
  projectRoot: string;
  owner: string;
}

interface UserArtifactManagerOptions {
  host: ArtifactHost;
  owner: string;
}

interface ArtifactManager {
  readonly rules: RuleDocumentManager;
  readonly instructions: InstructionSectionManager;
  readonly mcp: McpServerManager;
}
```

프로젝트/사용자 생성자 구현은 각 scope 프랙털에 위치한다. 사용자 옵션에는
프로젝트 루트나 임의 사용자 루트 속성을 추가하지 않는다.
`resolveProjectTargets`와 `resolveUserTargets`는 기존 계약을 유지하되 목적별
resolver의 결과를 조합만 한다.

### Shared outcomes

`ArtifactAction`은 `copy`, `update`, `remove`, `relocate`, `unchanged`,
`drift`, `skip`, `conflict`, `unsupported`만 허용한다.
`ArtifactOutcome`은 `id`, `action`, 표시용 `target`, 선택적 `reason`을 가진다.
계획은 요청, 예상 outcome, 대상별 revision을 보존한다. 설정 UI에는 outcome과
revision의 직렬화 가능한 preview만 전달하고, 저장 시 원래 요청으로 다시
계획한다.

### Rules

`ManagedRuleDocument`는 `id`, `filename`, `content | null`, 선택적
`legacyFilenames`를 가진다. `null`은 템플릿 누락을 뜻하며 inspect는 배포
상태를 계속 보고하되 plan은 원하는 문서를 `skip`한다.
`RuleDocumentRequest`는 문서 목록과 `desired`, `replaceDrift` ID 집합을
분리하여 제품 정책을 엔진 밖에 둔다.

`RuleDocumentManager.inspect(documents)`는 문서별 저장 상태와 현재 호스트가
읽는 활성 상태를 분리해 반환한다. 기존 target/displayTarget/deployedHash/
inSync/source와 `deployed`는 canonical-first managed candidate의 저장 사실을
설명하여 UI 선택·drift·relocation을 보존한다. 별도 activeTarget/
activeDisplayTarget/activeDeployedHash/activeInSync/activeSource와 `active`는
effective target에서 실제 읽히는 current→legacy 섹션만 설명한다. Effective
target에 섹션이 없으면 active target은 effective 파일, active source/hash는
null, `active`는 false다. Directory 규칙은 저장과 활성 facts가 같다.
Planning은 canonical-first stored inspection으로 relocation을 판단한다.
`inspectRuleDocumentStatus(options, documents)`는 같은 상태 엔진만 사용하는
read-only API로, 크기 제한이 있는 hook에서 hash와 drift 상태는 유지하면서
계획·적용 코드를 번들하지 않게 한다.
`inspectRuleDocumentPresence(options, selector)`는 `filename`과 선택적
`legacyFilenames`만 받아 단일 문서가 현재 호스트의 effective channel에
배포됐는지와 그 표시 대상만 반환하는 hook 전용 계약이다. 가려진 section
후보는 effective target의 `deployed: false`로 보고한다. 이 함수는 ID·본문
검증, hash, 다중 문서 상태, 계획·적용 코드를 실행하지 않는다.
`inspectTrustedRuleDocumentPresence`는 플러그인에 정적으로 내장되고 테스트된
고정 owner·selector만 받는 hook 전용 API이며 런타임 식별자 검증도 import하지
않는다.
`plan(request)`와 `apply(plan)`은 directory/section 채널에서 같은 사실표를
사용한다. 기존 이름과 현재 이름이 함께 있으면 현재 이름이 상태의 정본이다.
Section relocation은 모든 managed current/legacy marker를 제거한 뒤 effective
target에 canonical marker 하나만 남긴다.
Directory의 legacy-only drift는 본문 바이트를 바꾸지 않고 current 주소로
이동하되 outcome은 `drift`로 유지한다.

### Instructions

`InstructionSectionRequest`는 선택적 `id`, `content | null`,
`replaceDrift`, 선택적 `backup: "none" | "sibling"`을 가진다.
`content: null`은 소유 구간 제거를 뜻한다.

Hook instruction API는 크기 제한 훅이 이미 해석된 section target을 검사하고
동기화한다. 읽기는 `inspectHookInstructionSection`, 쓰기는
`applyHookInstructionSection`을 사용하며 `sideEffects: false` 기반 tree-shaking으로
상대 목적의 코드를 번들에서 제외한다. 두 API 모두 범용 manager, plan,
revision, lock을 실행하지 않는다. marker 충돌과 복수 후보는 쓰지 않고
거부하며, 적용은 marker 밖 바이트를 보존하고 실제 기존 파일 변경에만 sibling
backup을 만든다.
`effective` placement는 가려진 section을 유효 후보로 재배치하고
`existing-or-effective`는 유일한 기존 후보를 유지한다.

### MCP

`McpServerDefinition`은 `stdio`와 `http`의 판별 합집합이다.
`McpServerRequest`는 이름, 정의 또는 제거를 뜻하는 `null`,
`replaceDrift`를 가진다.
Claude 사용자 CLI의 가변 옵션보다 필수 위치 인자를 먼저 둔다. stdio는
`<name>` 뒤에 `--env <env...>`와 `-- <command> [args...]`를, HTTP는
`<name> <url>` 뒤에 `--header <header...>`를 둬 이름·URL이 옵션 값으로
소비되지 않게 한다.

Claude 사용자 정의 적용은 먼저 add를 시도한다. 같은 이름이 있다는 Claude의
명시적 결과에서 `replaceDrift`가 false면 기존 항목을 보존하고 멱등 성공으로
정규화하며, true면 user scope에서 제거한 뒤 add를 재시도해 drift 교체를 실제
상태에 반영한다. 제거할 이름이 없다는 명시적 결과만 멱등 성공으로 취급한다.
다른 제거 실패는 재시도하지 않고 그대로 실패하며, 정의 제거 요청도 같은
absent 결과만 성공으로 정규화한다. Codex 사용자 CLI의 단일 명령 적용 계약은
바꾸지 않는다.

## History

2026-07-26 — Claude 사용자 MCP 인자 순서와 멱등 재조정 계약을 추가했다.

## Last Updated

2026-07-30 — 공개 주소를 패키지 루트 하나로 통합하고 기존 80개 심볼 계약을
유지했다.
