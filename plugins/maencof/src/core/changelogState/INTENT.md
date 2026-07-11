# changelogState

## Purpose

`.maencof-meta/changelog-state.json` 읽기/쓰기. 세션 경계 스캔이 남긴 감시 경로 미기록 변경(`pending`)과 마지막 큐레이션 시각(`lastCuratedAt`)을 보관한다. 쓰기 주체는 MCP bootSweep 의 `changelogDebt` 관심사와 `/maencof:changelog` 스킬(기록 후 pending 비움 + lastCuratedAt 갱신).

## Structure

- `index.ts` — barrel (공개 API: changelogStatePath/readChangelogState/writeChangelogState)
- `operations/` organ — 상태 IO (changelogStatePath + read(수동 정규화 내장)/write, 함수 1개/파일)

## Boundaries

### Always do

- ChangelogState 타입 준수, 손상 파일은 빈 상태로 폴백
- Zod-free 수동 정규화 유지 (SessionStart 훅 번들에서 직접 import 됨)

### Ask first

- 상태 파일 스키마 필드 추가/변경 (`/maencof:changelog` SKILL.md 와 동기화 필요)

### Never do

- mcp/ 또는 hooks/ 직접 의존
- git 호출 (감지는 hooks 측 changelogDebt 소관)
