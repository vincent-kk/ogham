# claudemdMerge

## Purpose

CLAUDE.md maencof 섹션 병합 도구.

## Conventions

대상은 호스트 instruction manager가 결정한다. 읽지 않는 지침 파일에 쓰면 성공처럼 보이는 무효 변경이 된다.

## Boundaries

### Always do

- maencof 마커 밖 내용 보존; dry_run은 적용·백업 없이 계획만 보고

### Ask first

- 입출력 스키마 변경

### Never do

- 호스트 지침 경로를 재조립하거나 입력 content를 응답에 에코
