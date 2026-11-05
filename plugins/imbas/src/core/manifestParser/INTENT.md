# manifestParser

## Purpose

stories/estimation 매니페스트 파일 로드 및 요약 생성.

## Conventions

요약은 이미 검증한 매니페스트만 받아 계산한다. 다시 파일을 읽어 호출 사이의 상태를 섞지 않는다.

## Boundaries

### Always do

- 파일 I/O는 lib/fileIo.ts 경유

### Ask first

- 매니페스트 포맷 변경

### Never do

- 직접 fs.writeFileSync 호출
