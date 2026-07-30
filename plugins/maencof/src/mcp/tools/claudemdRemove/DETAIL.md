# claudemdRemove — Contract

## Requirements

- `claudemd_remove` 도구는 CWD 의 호스트 지침 파일에서 maencof 섹션만 제거한다. 대상 파일은 `createProjectInstructionManager(cwd)` 가 런타임 호스트로 해석한다(Claude=`CLAUDE.md` · Codex=`AGENTS.md`) — 병합한 쪽에서 지운다.
- 마커 바깥의 사용자 콘텐츠는 손대지 않는다. 제거는 `plan({ content: null })` 이 만든 `remove` outcome 을 적용하는 것뿐이며, 파일 삭제가 아니다.
- 계획 단계에서 `remove` 가 아닌 결과가 나오면 — 즉 지울 섹션이 없으면 — 적용하지 않고 `removed: false` 로 끝낸다. 부재는 오류가 아니다.
- `dry_run` 은 적용을 건너뛰고 계획 결과만 보고한다. 이때 파일은 불변이고 `backup_path` 도 없다.
- 계획은 `replaceDrift: false`, `backup: 'sibling'` 으로 세운다 — 제거 경로는 드리프트를 교체할 대상이 없고, 실제 쓰기가 일어날 때만 백업을 남긴다.

## API Contracts

### Handler

`handleClaudeMdRemove(cwd: string, input: ClaudeMdRemoveInput): ClaudeMdRemoveResult` — 동기. `cwd` 는 vault 루트 절대 경로.

### Input (`ClaudeMdRemoveInput`)

| Field     | Type      | Required | Notes                                         |
| --------- | --------- | -------- | --------------------------------------------- |
| `dry_run` | `boolean` | no       | 기본 false. true 면 계획만 세우고 쓰지 않는다 |

### Output (`ClaudeMdRemoveResult`)

- `removed` — 계획(dry-run) 또는 적용의 첫 outcome action 이 `remove` 일 때 true.
- `backup_path` — 실제 적용에서 백업이 생겼을 때만 존재하는 선택 필드. dry-run 에서는 붙지 않는다.

### Registration

`registerMutateTool` 로 등록된다(`server/registrations/claudeMd.ts`). 영향 경로는 호출마다 `inspect().target` 을 vault 상대 경로로 환산해 보고한다 — 호스트별로 파일이 달라 상수로 고정할 수 없다.

## Acceptance Criteria

### AC-section-scope-only — 섹션 범위 한정

- 마커 구간만 제거하고 파일의 나머지 내용과 파일 자체는 남긴다.

### AC-absent-section-not-error — 부재 시 무해

- 지울 섹션이 없으면 쓰기 없이 `removed: false` 를 반환한다.

### AC-dry-run-pure — dry-run 무변경

- `dry_run: true` 호출은 파일을 쓰지 않고 `backup_path` 도 반환하지 않는다.

## Last Updated

2026-07-30 — 섹션 범위 한정·부재 무해·dry-run 무변경 계약을 문서화했다.
