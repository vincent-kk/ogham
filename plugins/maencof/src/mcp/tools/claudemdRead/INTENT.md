# claudemdRead

## Purpose

CLAUDE.md maencof 섹션 읽기 도구.

## Conventions

파일 부재와 소유 섹션 부재를 구별해 미설치와 병합 실패를 혼동하지 않게 한다.

## Boundaries

### Always do

- 병합과 같은 instruction manager의 호스트 대상을 조회

### Ask first

- 입출력 스키마 변경

### Never do

- 읽기에서 파일이나 그래프 캐시를 변경
