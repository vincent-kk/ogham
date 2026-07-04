# pathGuard

## Purpose

vault 루트 밖으로 벗어나는 사용자 경로 입력을 거부하는 경로 봉쇄 헬퍼. read/update/delete/move/create 핸들러가 파일 I/O 직전에 공통으로 호출하는 단일 진실 원천.

## Boundaries

### Always do

- `resolve(vaultPath, userPath)` 결과가 `resolve(vaultPath) + sep` 로 시작하는지 검사해 `../` traversal · 절대경로 탈출 · 루트 자기 자신을 모두 거부
- 순수 함수 유지 (경로 계산만; I/O 는 호출자가 반환된 절대경로로 수행)
- 통과 시 `{ absolutePath }`, 탈출 시 `{ error }` 반환 (형제 `resolveFilename` 결과객체 패턴)

### Ask first

- 반환 계약(`{ absolutePath } | { error }`) 변경
- symlink 추적(`realpath`) 하드닝 도입 여부

### Never do

- 파일 I/O 수행
- 예외 throw (제어 흐름은 결과 객체로)
