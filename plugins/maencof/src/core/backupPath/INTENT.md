# backupPath

## Purpose

파일 덮어쓰기 전 타임스탬프 백업 경로(`<file>.bak-<ts>`)를 만드는 순수 util. companionMigration·companionEdit이 공유하는 백업 명명 규칙의 단일 진실 원천.

## Conventions

편집과 마이그레이션이 같은 백업 명명 규칙을 공유한다. 파일 복사는 호출자가 소유하여 경로 생성이 저장 책임을 갖지 않게 한다.

## Boundaries

### Always do

- 콜론·점을 하이픈으로 치환해 파일시스템 안전한 접미사 생성
- 순수 함수 유지 (경로 문자열만; 파일 복사는 호출자)

### Ask first

- 백업 접미사 포맷 변경

### Never do

- 파일 I/O 수행
