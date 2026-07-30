# claudemdMerge — Contract

## Requirements

- `claudemd_merge` 도구는 CWD 의 호스트 지침 파일에서 maencof 섹션만 삽입/업데이트한다. 대상 파일은 호출자가 고르지 않는다 — `createProjectInstructionManager(cwd)` 가 런타임 호스트로 해석하며 Claude 는 `CLAUDE.md`, Codex 는 `AGENTS.md` 다. 안 읽는 쪽에 쓰면 에러가 아니라 조용한 무효라서(파일은 생기고 모델은 못 본다) 대상 결정을 이 핸들러가 다시 하지 않는다.
- 파일 I/O 를 직접 수행하지 않는다. 검사(`inspect`)·계획(`plan`)·적용(`apply`) 세 단계를 `core/claudeMdMerger` 의 instruction manager 에 위임한다.
- `had_existing_section` 은 계획을 세우기 **전** 의 `inspect()` 결과에서 온다 — 적용 후 상태는 언제나 "존재함"이라 그 시점에 읽으면 항상 true 가 되어 신호가 죽는다.
- `dry_run` 은 적용을 건너뛰고 계획만으로 결과를 만든다. 이때 파일은 불변이고 `backup_path` 도 없다.
- 계획은 항상 `replaceDrift: true`, `backup: 'sibling'` 로 세운다 — 드리프트한 기존 섹션을 새 내용으로 교체하고, 실제 쓰기가 일어날 때만 같은 경로 옆에 백업을 남긴다.

## API Contracts

### Handler

`handleClaudeMdMerge(cwd: string, input: ClaudeMdMergeInput): ClaudeMdMergeResult` — 동기. `cwd` 는 vault 루트 절대 경로.

### Input (`ClaudeMdMergeInput`)

| Field     | Type      | Required | Notes                                         |
| --------- | --------- | -------- | --------------------------------------------- |
| `content` | `string`  | yes      | 마커 사이에 넣을 maencof 지침 (markdown)      |
| `dry_run` | `boolean` | no       | 기본 false. true 면 계획만 세우고 쓰지 않는다 |

### Output (`ClaudeMdMergeResult`)

- `changed` — 계획(dry-run) 또는 적용의 첫 outcome action 이 `copy` · `update` · `relocate` 중 하나일 때 true. `noop` 은 false.
- `had_existing_section` — 호출 시점에 마커 구간이 이미 있었는지.
- `backup_path` — 실제 적용에서 백업이 생겼을 때만 존재하는 선택 필드. dry-run 에서는 붙지 않는다.
- `section_content` — `input.content` 를 trim 한 값. 파일에서 다시 읽지 않는다.

### Registration

`registerMutateTool` 로 등록된다(`server/registrations/claudeMd.ts`). 영향 경로는 호출마다 `inspect().target` 을 vault 상대 경로로 환산해 보고한다 — 호스트별로 파일이 달라 상수로 고정할 수 없다.

## Acceptance Criteria

### AC-host-target-not-reresolved — 호스트 대상 재해석 금지

- 대상 파일 경로를 이 핸들러가 직접 조립하지 않고 instruction manager 가 해석한 값만 쓴다.

### AC-dry-run-pure — dry-run 무변경

- `dry_run: true` 호출은 파일을 쓰지 않고 `backup_path` 도 반환하지 않는다.

### AC-preexistence-before-plan — 기존 섹션 판정 시점

- `had_existing_section` 이 적용 이전 `inspect()` 상태를 반영한다.

## Last Updated

2026-07-30 — 호스트 해석 위임·dry-run 무변경·기존 섹션 판정 시점 계약을 문서화했다.
