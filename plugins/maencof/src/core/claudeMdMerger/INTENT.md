# claudeMdMerger

## Purpose

CLAUDE.md 파일의 maencof 섹션 병합/읽기/제거. 마커 기반 섹션 관리.

## Structure

- `index.ts` — 순수 barrel (공개 API: mergeMaencofSection/readMaencofSection/removeMaencofSection/ClaudeMdMerger + MergeResult, 마커 재노출)
- `types/` organ — 공개 타입 (MergeResult)
- `operations/` organ — 섹션 병합/읽기/제거 + ClaudeMdMerger 클래스 (함수 1개/파일)

## Boundaries

### Always do

- MAENCOF_START_MARKER/END_MARKER 사용
- 기존 사용자 콘텐츠 보존

### Ask first

- 마커 포맷 변경

### Never do

- 마커 외부 콘텐츠 수정
