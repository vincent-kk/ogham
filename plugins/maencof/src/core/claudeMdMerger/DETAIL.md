# claudeMdMerger — Contract

## Requirements

- 이 모듈이 소유하는 것은 `MAENCOF_START_MARKER` / `MAENCOF_END_MARKER` 로 구분되는 한 구간뿐이다. 마커 바깥의 사용자 콘텐츠와 다른 소유자의 구간은 읽기만 하고 그대로 보존한다.
- 두 계층의 API 를 함께 제공한다. raw filePath API(`mergeMaencofSection` · `readMaencofSection` · `removeMaencofSection` · `ClaudeMdMerger`)는 호출자가 이미 해석한 절대 경로만 다루고 호스트·프로젝트를 다시 해석하지 않는다. 호스트를 아는 호출자는 `createProjectInstructionManager(projectRoot)` 로 대상까지 해석된 manager 를 받는다.
- 호스트 판정은 `resolveRuntimeHost(process.env)` 한 곳에서 한다. `codex` 만 codex 채널로 가고 agy·미지 호스트는 maencof 가 원래 쓰던 claude 채널 어댑터를 유지한다 — 모르는 호스트에 새 파일을 만드는 것보다 기존 채널에 남는 편이 안전하다.
- 마커 조작·계획·적용·백업은 직접 구현하지 않고 `@ogham/agent-artifacts` 의 instruction section manager 에 위임한다. 이 모듈은 owner(`'maencof'`)와 마커 쌍을 주입하는 조립 지점이다.
- 실제 쓰기가 일어날 때만 백업한다. dry-run 과 동일 내용 재병합처럼 바이트가 바뀌지 않는 경로에서는 `.bak` 을 남기지 않는다.
- 읽기는 마커 내부의 trim 된 내용 또는 `null` 을 반환한다. 파일 부재와 섹션 부재를 raw read API 는 모두 `null` 로 접는다 — 두 상태를 구분해야 하는 호출자는 manager 의 `inspect()` 를 쓴다.

## API Contracts

### Entry point (`index.ts`)

- `MAENCOF_START_MARKER` · `MAENCOF_END_MARKER` — `constants/markers.ts` 재노출. 마커 정본은 상수 모듈이고 이 배럴은 경로일 뿐이다.
- `mergeMaencofSection(filePath, maencofContent, options?): MergeResult`
- `readMaencofSection(filePath): string | null`
- `removeMaencofSection(filePath, options?): boolean`
- `ClaudeMdMerger` — 위 세 함수의 filePath 보관 래퍼 (`merge` · `read` · `remove` · `hasSection`)
- `createProjectInstructionManager(projectRoot): InstructionSectionManager`
- `MergeResult` (type)

### `mergeMaencofSection(filePath, maencofContent, options)`

- `options.dryRun` (기본 false) — 계획만 세우고 쓰지 않는다. `changed` 는 "쓰면 바뀌는가"를 뜻한다.
- `options.createIfMissing` (기본 true) — false 이고 파일이 없으면 아무것도 만들지 않고 `changed: false` 로 끝낸다.
- 계획은 `replaceDrift: true`, `backup: 'sibling'`. `changed` 는 outcome action 이 `copy` · `update` · `relocate` 일 때 true.

### `MergeResult`

`{ changed, hadExistingSection, backupPath?, content }` — `hadExistingSection` 은 계획 이전 `inspect()` 기준이고, `content` 는 병합 후 파일 전체 내용이다(섹션만이 아니다).

### `removeMaencofSection(filePath, options)`

계획 outcome 이 `remove` 가 아니면 적용 없이 `false`. `options.dryRun` 이면 계획 성공만으로 `true` 를 반환하고 쓰지 않는다.

## Acceptance Criteria

### AC-marker-scope-only — 마커 구간 한정

- 병합·제거가 마커 바깥의 내용을 변경하지 않는다.

### AC-raw-api-no-host-resolution — raw API 경로 고정

- raw filePath API 는 전달받은 경로에만 작용하고 호스트/프로젝트를 재해석하지 않는다.

### AC-backup-only-on-write — 쓰기 시에만 백업

- dry-run 과 무변경 재병합은 `.bak` 을 만들지 않는다.

### AC-unknown-host-keeps-claude-channel — 미지 호스트 채널

- `codex` 가 아닌 런타임 호스트는 claude 채널 대상으로 해석된다.

## Last Updated

2026-07-30 — 마커 구간 한정·raw/project 두 계층 API·쓰기 시 백업·호스트 판정 계약을 문서화했다.
