# claudemdRead — Contract

## Requirements

- `claudemd_read` 도구는 CWD 의 호스트 지침 파일에서 maencof 섹션만 읽는다. 대상 파일은 `createProjectInstructionManager(cwd)` 가 런타임 호스트로 해석한다(Claude=`CLAUDE.md` · Codex=`AGENTS.md`) — 병합한 쪽에서 읽는다.
- 읽기 전용이다. 파일도 캐시도 건드리지 않으며 `registerReadTool({ needsFreshness: false })` 로 등록된다 — 지침 파일은 KG 그래프와 무관해 freshness 게이트가 필요 없다.
- 입력 파라미터가 없다. 등록 스키마는 빈 객체이고 핸들러 인자는 vault 경로 하나뿐이다.
- "파일이 없음"과 "파일은 있는데 섹션이 없음"을 구분해 보고한다. 두 경우를 한 플래그로 뭉치면 호출자가 병합 실패와 미설치를 구별할 수 없다.

## API Contracts

### Handler

`handleClaudeMdRead(cwd: string): ClaudeMdReadResult` — 동기. `cwd` 는 vault 루트 절대 경로.

### Output (`ClaudeMdReadResult`)

- `exists` — 마커 구간이 존재하는지(`inspect().status === 'present'`).
- `content` — 마커를 제외한 섹션 내용. 섹션이 없으면 `null`.
- `file_exists` — 지침 파일 자체의 존재 여부(`inspect().targetExists`). `exists` 와 독립이다.

## Acceptance Criteria

### AC-read-only — 읽기 전용

- 어떤 입력으로도 파일을 쓰지 않고 그래프 캐시를 무효화하지 않는다.

### AC-absent-file-vs-absent-section — 부재 구분

- 지침 파일이 없을 때와 파일은 있으나 섹션이 없을 때가 `file_exists` / `exists` 조합으로 구분된다.

## Last Updated

2026-07-30 — 읽기 전용·부재 구분 계약을 문서화했다.
