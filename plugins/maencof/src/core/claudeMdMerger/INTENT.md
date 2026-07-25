# claudeMdMerger

## Purpose

호스트별 지침 파일의 maencof 섹션 병합/읽기/제거. 호출자가 결정한 파일에서
`<!-- MAENCOF:START -->` / `<!-- MAENCOF:END -->` 마커만 소유한다.

## Structure

- `index.ts` — 순수 barrel (기존 raw filePath API·타입·마커 재노출)
- `types/` organ — 공개 타입 (MergeResult)
- `operations/` organ — exact-path 호환 래퍼와 project instruction manager 조립

## Boundaries

### Always do

- MAENCOF_START_MARKER/END_MARKER 사용
- raw filePath API는 `createResolvedInstructionSectionManager`로 정확한 경로만 관리
- 호스트 인식 호출자는 project target과 instruction manager 사용
- 읽기는 마커 내부의 trim된 내용 또는 `null`을 반환
- 쓰기·제거 시 마커 외부 사용자 콘텐츠를 그대로 보존
- 기존 파일을 변경할 때 쓰기 전 바이트를 같은 경로의 `.bak`에 백업
- dry-run과 동일 내용 재병합처럼 실제 쓰기가 없으면 백업하지 않음

### Ask first

- 마커 포맷 변경
- 호출자가 선택하는 Claude/Codex 지침 파일 채널 변경

### Never do

- raw filePath API에서 호스트/프로젝트를 다시 해석
- MAENCOF 구간 밖 파일 또는 다른 소유자의 구간 수정

## Dependencies

- `@ogham/agent-artifacts/instructions`,
  `@ogham/agent-artifacts/targets/project/instructions`,
  `@ogham/cross-platform/host-registry`.
