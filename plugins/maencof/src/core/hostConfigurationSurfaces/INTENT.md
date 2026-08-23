# hostConfigurationSurfaces

## Purpose

Claude와 Codex가 실제로 소비하는 지침·행동 규칙·에이전트 정의·changelog 감시 표면을 하나의 host-neutral 계약으로 해석하고, canonical skill reference를 생성한다.

## Conventions

`hostConfigurationSurfaces.ts`가 canonical 소스이고 `skills/.shared/host-configuration.md`는 생성물이다.

## Boundaries

### Always do

- project instruction target은 `@ogham/agent-artifacts` resolver에서 파생
- host 상태 루트는 `@ogham/cross-platform` registry에서 파생
- Codex 규칙 표면은 미지원으로 명시하고 maencof 소유 AGENTS 섹션으로 안내
- skill reference와 changelog 감시 경로를 같은 행에서 렌더링

### Ask first

- 지원 호스트나 설정 surface 종류 추가
- 생성 reference 형식 변경

### Never do

- `.codex/rules/*.rules`를 행동 지침의 대체물로 제시
- Claude 또는 Codex home 경로를 별도 리터럴 registry로 복제
- 생성된 skill reference를 직접 수정
