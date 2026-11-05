# hostConfigurationSurfaces — Contract

## Requirements

- `claude`와 `codex` 두 host 행은 project instruction, behavioral rule, project/user agent, changelog watch surface를 함께 제공한다.
- project instruction target은 `resolveProjectInstructionTarget`의 effective path와 candidates를 그대로 사용한다. 이 결과는 MCP `createProjectInstructionManager`가 선택하는 대상과 같아야 한다.
- Claude behavioral rule은 project `.claude/rules/*.md`를 지원한다. Codex command approval rules는 행동 지침과 의미가 다르므로 behavioral rule은 `unsupported`이고 maencof 소유 instruction section을 대안으로 제시한다.
- Claude agent는 Markdown, Codex agent는 TOML이며 project와 user 경로 모두 host registry의 state root에서 파생한다. 생성 reference의 user 경로는 각 host의 `stateRootEnv` override와 기본 디렉터리를 함께 표시한다.
- changelog paths는 지식 레이어와 해당 host의 instruction, supported rule, agent surface를 포함한다. Codex 행에 `.codex/rules`를 넣지 않는다.
- shared skill reference는 이 registry가 결정론적으로 렌더링하고 생성 스크립트가 동기화 또는 drift 검사한다.
`skills/.shared/host-configuration.md`는 배포되는 설명 사본이고 이 fractal의 renderer가 canonical 소스다. 스킬은 생성 사본을 읽지만 판단을 다시 적지 않는다.

## API Contracts

- 런타임 호스트가 지원 범위 밖이면 설정 좌표를 추측하지 않는다. unsupported를 성공으로 바꾸지 않는다.
- 생성 reference와 changelog 경로는 같은 registry에서 파생한다. 스킬이 경로 판단을 다시 쓰면 실제 MCP instruction target과 어긋난다.

## Acceptance Criteria

### AC-instruction-manager-parity — MCP 지침 대상 일치

- 두 host에서 registry instruction target과 `createProjectInstructionManager(...).inspect().target`이 같다.

### AC-generated-reference-current — 생성 reference 최신성

- `host-surfaces:check`가 renderer와 배포된 shared reference의 byte drift를 실패로 보고한다.
- Four canonical configuration skills load the shared reference.

## Last Updated

호스트별 설정 의미·생성 reference·소비 표면 일치 계약이 바뀔 때 갱신한다.
