# changelogDebt — Contract

## Requirements

- MCP bootSweep에서 vault당 한 번 감시 대상의 미기록 git 변경을 조회해 changelog state의 pending에 보존한다.
- 감시 대상은 `hostConfigurationSurfaces`의 두 host 소비 표면 합집합을 사용한다. 별도 Claude-only path 목록을 유지하지 않는다.
- changelog 출력 디렉터리 자체는 감지 결과에서 제외하고, git 실패나 내부 오류는 세션을 막지 않는다.
- pending changes는 상수로 정한 상한을 적용하며 큐레이션된 상태는 다시 만들지 않는다.

## API Contracts

감지는 부팅 경계에 두고 SessionStart는 pending 권고만 표면화한다. 매 턴 git spawn과 종료 차단을 피하기 위한 분리이며 실제 큐레이션은 changelog 스킬이 소유한다.

## Acceptance Criteria

### AC-host-watch-surfaces — host 설정 변경 감시

- Claude instruction/rules/agents와 Codex AGENTS/agents 변경이 같은 registry에서 파생된 pathspec으로 조회된다.
- Codex command approval rules는 행동 지침 감시 대상으로 추가하지 않는다.

## Last Updated

호스트별 변경 감시 표면, pending 보존 범위 또는 부팅 감지와 큐레이션의 책임 분리가 바뀔 때 갱신한다.
