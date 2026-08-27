# hostConfigurationSurfaces — Contract

## Requirements

- `claude`와 `codex` 두 host 행은 project instruction, behavioral rule, project/user agent, changelog watch surface를 함께 제공한다.
- project instruction target은 `resolveProjectInstructionTarget`의 effective path와 candidates를 그대로 사용한다. 이 결과는 MCP `createProjectInstructionManager`가 선택하는 대상과 같아야 한다.
- Claude behavioral rule은 project `.claude/rules/*.md`를 지원한다. Codex command approval rules는 행동 지침과 의미가 다르므로 behavioral rule은 `unsupported`이고 maencof 소유 instruction section을 대안으로 제시한다.
- Claude agent는 Markdown, Codex agent는 TOML이며 project와 user 경로 모두 host registry의 state root에서 파생한다. 생성 reference의 user 경로는 각 host의 `stateRootEnv` override와 기본 디렉터리를 함께 표시한다.
- changelog paths는 지식 레이어와 해당 host의 instruction, supported rule, agent surface를 포함한다. Codex 행에 `.codex/rules`를 넣지 않는다.
- shared skill reference는 이 registry가 결정론적으로 렌더링하고 생성 스크립트가 동기화 또는 drift 검사한다.

## Structure

`skills/.shared/host-configuration.md`는 배포되는 설명 사본이고 이 fractal의 renderer가 canonical 소스다. 스킬은 생성 사본을 읽지만 판단을 다시 적지 않는다.

## API Contracts

- `resolveHostConfigurationSurfaces(options): HostConfigurationSurfaces` — 절대 project root와 명시된 `claude | codex` host를 받아 실제 소비 표면을 반환한다.
- `resolveRuntimeHostConfigurationSurfaces(projectRoot, env?): HostConfigurationSurfaces | null` — runtime host가 Claude/Codex일 때만 행을 반환하고 다른 host는 추측하지 않는다.
- `inspectHostConfigurationSurfaces(surfaces): HostConfigurationInspection` — registry가 정한 실제 instruction/rule/agent 경로의 존재와 파일 수를 보고하며 unsupported rule을 성공으로 위장하지 않는다.
- `renderHostConfigurationReference(): string` — 두 host 행과 사용 지침을 안정된 Markdown으로 렌더링한다.
- `HOST_CONFIGURATION_WATCHED_PATHS` — 두 host 행의 changelog 경로 합집합. 기존 `WATCHED_PATHS` 호환 표면은 이 값에서 파생한다.

## Acceptance Criteria

### AC-instruction-manager-parity — MCP 지침 대상 일치

- 두 host에서 registry instruction target과 `createProjectInstructionManager(...).inspect().target`이 같다.

### AC-host-surface-semantics — host별 의미 보존

- Claude는 CLAUDE.md/rules/Markdown agent 흐름을 유지한다.
- Codex는 AGENTS owned section과 필수 `name`·`description`·`developer_instructions`를 갖춘 standalone TOML agent를 사용하고 behavioral rule을 미지원으로 보고한다.
- user agent 표면은 `CLAUDE_CONFIG_DIR`·`CODEX_HOME` override가 기본 home 경로보다 우선함을 표시한다.

### AC-changelog-consumer-parity — changelog 소비 표면 일치

- Codex instruction candidates와 project agent TOML surface 변경은 감시하고, command approval rule directory는 감시하지 않는다.
- Claude instruction/rules/agents 변경은 계속 감시된다.

### AC-generated-reference-current — 생성 reference 최신성

- `host-surfaces:check`가 renderer와 배포된 shared reference의 byte drift를 실패로 보고한다.
- Four canonical configuration skills load the shared reference.

## Last Updated

2026-08-23 — Claude/Codex 설정 표면, changelog 소비자, canonical skill reference 계약을 추가했다.
