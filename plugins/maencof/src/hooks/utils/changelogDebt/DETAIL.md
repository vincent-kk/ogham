# changelogDebt — Contract

## Requirements

- MCP bootSweep에서 vault당 한 번 감시 대상의 미기록 git 변경을 조회해 changelog state의 pending에 보존한다.
- 감시 대상은 `hostConfigurationSurfaces`의 두 host 소비 표면 합집합을 사용한다. 별도 Claude-only path 목록을 유지하지 않는다.
- changelog 출력 디렉터리 자체는 감지 결과에서 제외하고, git 실패나 내부 오류는 세션을 막지 않는다.
- pending changes는 상수로 정한 상한을 적용하며 큐레이션된 상태는 다시 만들지 않는다.

## API Contracts

- `detectWatchedChanges(cwd): Promise<string[]>` — registry-derived pathspec으로 porcelain 변경을 조회한다.
- `runChangelogDebt({ cwd }): Promise<{ continue: true }>` — pending 상태를 갱신하고 실패를 error log로 격리한다.

## Acceptance Criteria

### AC-host-watch-surfaces — host 설정 변경 감시

- Claude instruction/rules/agents와 Codex AGENTS/agents 변경이 같은 registry에서 파생된 pathspec으로 조회된다.
- Codex command approval rules는 행동 지침 감시 대상으로 추가하지 않는다.

### AC-changelog-output-excluded — 출력 자기 감지 방지

- changelog 문서 변경만 있으면 pending을 만들지 않는다.

### AC-failure-isolated — 감지 실패 격리

- git 또는 내부 상태 오류가 발생해도 `{ continue: true }`를 반환한다.

## Last Updated

2026-08-23 — changelog 감시 경로를 host configuration registry 소비자로 계약화했다.
