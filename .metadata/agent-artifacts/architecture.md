# Agent Artifacts 아키텍처

## 결정

지침, 규칙 문서, MCP 서버 등록을 호스트별로 관리하기 위한 새 내부
워크스페이스 `@ogham/agent-artifacts`를 만든다.

이 패키지는 `@ogham/cross-platform` 위에 위치한다.

```text
plugins
  └─ @ogham/agent-artifacts
       └─ @ogham/cross-platform
```

- `cross-platform`은 OS 경로, 호스트 상태 루트, 파일 시스템 호출, 잠금,
  원자적 교체, CLI 실행을 담당한다.
- `agent-artifacts`는 호스트/범위 대상 선택, 소유권, 드리프트 정책,
  미리 보기/적용, 아티팩트별 형식을 담당한다.
- `cross-platform`에서 역방향으로 향하는 의존성이 없으므로 그래프는 DAG로
  유지된다.

최초 지원 호스트는 Claude Code와 Codex다. Antigravity의 지침 채널을
측정할 때까지 기존 플러그인에서 명시적 호환 어댑터로 유지한다. 새 패키지는
알 수 없는 호스트를 Claude로 암묵적으로 취급해서는 안 된다.

## 이 구조를 선택한 이유

### 선택지 A — `@ogham/cross-platform` 확장

패키지 수를 최소화할 수 있지만 두 가지 책임이 섞인다. 호스트를 인식하는
규칙/MCP 조정기는 OS 호환성 프리미티브가 아니며, 파일 시스템 변경과 형식
파서를 얇은 훅 번들이 사용하는 저수준 패키지로 끌어들이게 된다.

### 선택지 B — 아티팩트 종류별 패키지 생성

`rule-docs`, `instruction-docs`, `mcp-config`는 경계가 좁아지지만 범위 해석,
소유권, 리비전, 잠금, 결과, 미리 보기/적용 의미 체계가 중복된다.

### 선택지 C — 단일 `@ogham/agent-artifacts` 패키지

서로 분리된 `rules`, `instructions`, `mcp` 엔진을 유지하면서 범위 및 트랜잭션
모델을 공유한다. MCP를 단순한 또 하나의 Markdown 문서로 간주하지 않으면서
현재의 Filid/Seiri 중복을 해결한다.

선택지 C를 채택한다.

## 측정된 출발점

- Filid는 이미 Claude 규칙을 `.claude/rules/*.md`로, Codex 규칙을
  `AGENTS.md`의 마커 소유 섹션으로 해석한다.
- Seiri에는 이미 더 강한 순수 정책 경계가 있다. 하나의 결정 함수가 미리
  보기와 적용 양쪽에 결과를 제공하지만 물리적 대상은 `.claude/rules/`로
  고정되어 있다.
- `@ogham/cross-platform/instructions`는 이미 순수하고 훅에 안전한 마커
  연산을 제공한다. 이는 저수준 프리미티브로 유지한다. 옮기면 의존성 방향이
  역전되거나 세 번째 패키지가 필요해진다.
- Maencof는 유효 instruction 파일의 마커 섹션을 독립적으로 관리한다.
- Cennad는 서로 다른 메커니즘으로 MCP를 프로비저닝한다. Antigravity에는
  JSON 변경을, Codex에는 `codex mcp`를 사용한다.

따라서 Filid의 호스트 대상 분리를 구조의 기반으로, Seiri의 순수한
계획/적용 결정을 동작의 기반으로 삼는다.

## 범위는 타입의 일부

다음과 같은 모호한 단일 함수를 노출하지 않는다.

```ts
manageArtifacts({ path, scope: "project" | "user" });
```

두 생성자를 노출한다.

```ts
createProjectArtifactManager({
  host: "codex",
  projectRoot: "/absolute/repository",
  owner: "seiri",
});

createUserArtifactManager({
  host: "claude",
  owner: "seiri",
});
```

`createProjectArtifactManager`에는 절대 프로젝트 루트가 필요하다.
`createUserArtifactManager`는 호출자가 선택한 경로를 받지 않는다. 호스트의
사용자 위치를 `@ogham/cross-platform`을 통해 해석하며, 여기에는
`CODEX_HOME`/`CLAUDE_CONFIG_DIR`가 포함된다. 테스트는 프로덕션 API를 넓히지
않고 동일한 환경 계약을 통해 해당 루트를 재배치한다.

이 구분은 권한 부여 경계다. 사용자 생성자를 선택한다는 것은 모든 프로젝트가
상속하는 구성을 변경하려는 호출자의 의도를 나타낸다.

## 공개 계약

```ts
export type ArtifactHost = "claude" | "codex";

export interface ProjectArtifactManagerOptions {
  host: ArtifactHost;
  projectRoot: string;
  owner: string;
}

export interface UserArtifactManagerOptions {
  host: ArtifactHost;
  owner: string;
}

export interface ArtifactManager {
  readonly rules: RuleDocumentManager;
  readonly instructions: InstructionSectionManager;
  readonly mcp: McpServerManager;
}

export function createProjectArtifactManager(
  options: ProjectArtifactManagerOptions,
): ArtifactManager;

export function createUserArtifactManager(
  options: UserArtifactManagerOptions,
): ArtifactManager;
```

프로젝트 및 사용자 진입점도 각각 `@ogham/agent-artifacts/project`와
`@ogham/agent-artifacts/user`로 내보낸다. 소비자는 사용하는 범위만 번들에
포함할 수 있다.

### 공유 결과 어휘

```ts
export type ArtifactAction =
  | "copy"
  | "update"
  | "remove"
  | "relocate"
  | "unchanged"
  | "drift"
  | "skip"
  | "conflict"
  | "unsupported";

export interface ArtifactOutcome {
  id: string;
  action: ArtifactAction;
  target: string;
  reason?: string;
}
```

모든 엔진은 `inspect`, `plan`, `apply`를 제공한다.

- `inspect`는 원하는 상태 없이 물리적 배포 상태를 보고한다.
- `plan`은 읽기 전용이며 결과와 대상 리비전을 반환한다.
- `apply`는 해당 계획을 받아 대상 잠금 아래에서 리비전을 다시 확인하고,
  오래된 계획을 `conflict`로 거부한다.

설정 페이지에는 직렬화 가능한 미리 보기만 표시할 수 있다. 저장 핸들러는
표시된 리비전으로 계획을 다시 수립한 후 적용한다. 미리 보기와 저장 사이에
발생한 사용자 편집은 절대 덮어쓰지 않는다.

## 대상 매트릭스

모든 아티팩트에 공통으로 적용되는 단일 "Claude 루트" 또는 "Codex 루트"는
없다. 대상은 전체 튜플 `(scope, host, artifact kind)`로 선택한다.

| 범위    | 종류         | Claude Code                                                                               | Codex                                                    |
| ------- | ------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| project | rules        | `<root>/.claude/rules/<owned>.md`                                                         | 유효 루트 `AGENTS*.md`의 소유 섹션                       |
| project | instructions | `CLAUDE.md` 또는 `.claude/CLAUDE.md`의 기존 소유 섹션, 기본값은 `CLAUDE.md`               | 유효 루트 `AGENTS*.md`의 소유 섹션                       |
| project | MCP          | `<root>/.mcp.json`                                                                        | `<root>/.codex/config.toml`                              |
| user    | rules        | `$CLAUDE_CONFIG_DIR/rules/<owned>.md`                                                     | `$CODEX_HOME/AGENTS*.md`의 소유 섹션                     |
| user    | instructions | `$CLAUDE_CONFIG_DIR/CLAUDE.md`                                                            | `$CODEX_HOME/AGENTS*.md`의 소유 섹션                     |
| user    | MCP          | `claude mcp --scope user`                                                                 | `codex mcp`                                              |

Codex 지침에서 "유효"는 `AGENTS.override.md`가 존재하고 비어 있지
않으면 해당 파일을, 그 외에는 `AGENTS.md`를 뜻한다. 사용자가 나중에
override를 추가하거나 제거하면 소유 섹션을 재배치할 수 있도록 관리자는 두
후보를 모두 스캔한다. override가 가리고 있는 동안 `AGENTS.md`에만 쓰는 것은
드러나지 않는 실패다.

Claude의 사용자 MCP 레지스트리는 사용자 규칙과 같은 경로 아래가 아니라
`~/.claude.json`에 물리적으로 존재한다. 라이브러리는 여러 용도가 섞인 이
상태 파일을 다시 쓰는 대신 의도적으로 Claude의 CLI를 사용한다.

이 위치는 현재의
[Claude 지침/규칙 계약](https://code.claude.com/docs/en/memory),
[Claude MCP 범위](https://code.claude.com/docs/en/mcp),
[Codex AGENTS.md 계약](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Codex MCP 계약](https://learn.chatgpt.com/docs/extend/mcp)을 따른다.

## 규칙

공유 규칙 엔진은 정책 중립적 의도를 받는다.

```ts
export interface ManagedRuleDocument {
  id: string;
  filename: string;
  content: string;
  legacyFilenames?: readonly string[];
}

export interface RuleDocumentRequest {
  documents: readonly ManagedRuleDocument[];
  desired: ReadonlySet<string>;
  replaceDrift: ReadonlySet<string>;
}
```

제품 정책은 호출자가 유지한다.

- Filid는 `required || selected`를 `desired`에 매핑한다.
- Filid는 `required || resync`를 `replaceDrift`에 매핑한다.
- Seiri는 사용자의 선택과 명시적 재동기화를 직접 매핑한다.
- 제목, 설명, 추천 메타데이터는 플러그인이 소유하는 UI 관심사로 유지한다.

물리적 어댑터:

- `directory`: 규칙마다 하나의 소유 Markdown 파일을 사용하며 Claude에
  적용한다.
- `sections`: 규칙마다 마커로 구분된 하나의 섹션을 사용하며 Codex에
  적용한다.

고아 아티팩트 폐기는 관리자의 소유자 네임스페이스로 제한한다. 관리자는
`seiri_*.md`를 소유자 `seiri`에 대해 제거할 수 있지만, 첫 번째 매니페스트
항목으로 소유권을 추론하거나 다른 플러그인의 파일을 제거해서는 안 된다.

## 지침

지침은 사용자 파일 전체가 아니라 하나 이상의 소유 섹션을 관리한다.

```ts
export interface InstructionSectionRequest {
  id?: string;
  content: string | null;
  replaceDrift: boolean;
  backup?: "none" | "sibling";
}
```

`content: null`은 제거를 뜻한다. 마커 식별자의 기본값은
`sectionMarkers(owner.toUpperCase(), id)`다. Maencof가 기존
`<!-- MAENCOF:START -->` 계약을 유지할 수 있도록 어댑터가 레거시 마커를
제공할 수 있다.

소유 마커 쌍 외부의 텍스트는 변경할 수 없다. 형식이 잘못되었거나 겹치는
마커는 `conflict`를 생성하며, 주변 콘텐츠를 삭제하는 방식으로 "복구"하지
않는다.

## MCP

MCP는 Markdown 구현이 아닌 계획/결과 모델을 공유한다.

```ts
export type McpServerDefinition =
  | {
      transport: "stdio";
      command: string;
      args?: readonly string[];
      env?: Readonly<Record<string, string>>;
    }
  | {
      transport: "http";
      url: string;
      bearerTokenEnvVar?: string;
      headers?: Readonly<Record<string, string>>;
    };

export interface McpServerRequest {
  name: string;
  definition: McpServerDefinition | null;
  replaceDrift: boolean;
}
```

어댑터는 명시적으로 유지한다.

- Claude 프로젝트: 관련 없는 `.mcp.json` 키와 서버를 보존한다.
- Claude 사용자: `claude mcp add/remove --scope user`를
  `cross-platform/spawn`을 통해 호출한다.
- Codex 사용자: `codex mcp add/remove`를 `cross-platform/spawn`을 통해
  호출한다.
- Codex 프로젝트: `.codex/config.toml`에서 Ogham 소유 블록만 관리하고,
  교체 전에 전체 TOML을 파싱하고 검증하며, 같은 이름의 비소유 서버는
  `conflict`로 거부한다.

Codex 프로젝트 어댑터는 주석과 관련 없는 서식을 보존해야 한다. 자체 마커가
있는 TOML 블록을 추가하거나 교체할 수 있지만, 전체 파일을 파싱한 뒤
직렬화해서는 안 된다.

## 파일 시스템 및 경로 경계

`@ogham/agent-artifacts/src`는 `node:fs`, `node:path`, `node:os`,
`node:child_process`를 가져와서는 안 된다.

`@ogham/cross-platform`에 다음 기능을 추가한다.

- 명시적 런타임 호스트 및 호스트 상태 루트 해석
- 절대 루트 및 루트 내 경로 검증
- UTF-8 읽기, 디렉터리 목록 조회, 안전한 제거, 원자적 교체
- 제한 시간이 있고 소유권 토큰을 사용하는 파일 잠금
- 호스트 소유 구성 명령을 위한 기존 `spawnCli`

아티팩트 경로는 대상 매트릭스로 고정한다. 규칙 파일명, 소유자 ID, MCP 이름은
경로를 결합하기 전에 검증한다. 프로젝트 루트 밖으로 나가는 심볼릭 링크/상대
경로 순회를 거부한다. 사용자 범위는 사용자 지정 출력 루트를 받지 않는다.

원자성의 단위는 물리적 파일이다. 여러 파일로 구성된 Claude 규칙 배포에서
후속 파일이 실패하면 정확한 부분 결과를 보고한다. 단일 `AGENTS.md`,
`CLAUDE.md`, JSON, TOML 파일은 모든 소유 편집을 조합한 뒤 한 번만 교체한다.

## 소유권 및 호환성

- 소유자 ID는 소문자 kebab case를 사용한다.
- 기존 Filid 파일명과 마커 쌍을 정식 형식으로 유지한다.
- 기존 Seiri 파일명을 정식 형식으로 유지하며 Codex 섹션 형식만 새로
  추가한다.
- 기존 Maencof 마커를 정식 형식으로 유지한다.
- MCP 소유권은 정확한 서버 이름과 호출하는 관리자의 소유자로 결정한다.
- 비소유 드리프트는 기본적으로 보존한다.
- 원하지 않게 된 아티팩트를 제거할 때는 해당 소유 파일, 섹션 또는 서버
  항목만 제거한다.

기존 `ruleDocsTarget()`과 플러그인의 직접 파일 시스템 구현은 모든 소비자가
마이그레이션할 때까지만 유지한다. 장기적으로 병행할 API가 아니다.

## 실패 모델

- 유효하지 않은 루트, ID, 파일명, 정의는 쓰기 전에 실패한다.
- 지원하지 않는 호스트/범위/종류 조합은 `unsupported`를 반환한다.
- 누락된 템플릿은 `skip`이 된다.
- 호출자가 명시적으로 교체를 요청하지 않으면 사용자 편집은 `drift`가 된다.
- 대상 리비전이 변경되면 `conflict`가 된다.
- CLI 부재/실패는 MCP 결과에 나타낸다. 라이브러리는 원하는 상태만으로 성공을
  주장하지 않는다.
- 훅은 규칙이나 지침을 쓰지 않는다. 초기 설정/설정 페이지가 변경을
  담당한다.

## 인수 조건

1. 동일한 규칙 의도는 Claude 파일과 Codex 섹션에서 상태, 드리프트, 재동기화,
   제거, 고아 아티팩트 폐기 의미 체계가 동일한 결과를 생성한다.
2. 프로젝트 API와 사용자 API는 컴파일 시점에 혼동할 수 없으며, 사용자
   API에는 경로 매개변수가 없다.
3. 두 플러그인은 서로의 섹션이나 사용자가 작성한 텍스트를 건드리지 않고
   하나의 `AGENTS.md`에 공존할 수 있다.
4. 오래된 미리 보기는 더 최신 편집을 덮어쓸 수 없다.
5. Claude/Codex 사용자 지침과 규칙은 재배치된 호스트 루트를
   준수한다.
6. MCP 어댑터는 관련 없는 서버와 구성을 보존한다.
7. `agent-artifacts`의 프로덕션 코드는 모든 경로, 파일 시스템, 실행 연산을
   `cross-platform`을 통해 수행한다.
8. Filid와 Seiri는 새 규칙 엔진을 공유하면서 기존 공개 MCP/설정 응답을
   유지한다.

## 비목표

- Codex 명령 승인 `.rules` 파일을 지침 규칙으로 취급하는 것
- 대화형 호스트 측정 전에 Antigravity 지침 경로를 추측하는 것
- 조직/관리형 정책 지침 위치를 관리하는 것
- 플러그인별 매니페스트 또는 설정 UI 메타데이터를 교체하는 것
- 여러 파일로 구성된 배포를 파일 시스템 전체에서 전역 트랜잭션으로 만드는 것
