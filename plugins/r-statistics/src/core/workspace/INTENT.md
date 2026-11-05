## Purpose

temp 격리 워크스페이스 모듈. 세션별 디렉토리를 만들고(`data/` 입력·`artifacts/` 출력), 실행 종료 후 ARTIFACTS_DIR 에서만 산출물을 수집(해시·확장자 화이트리스트·symlink 탈출 거부)하며, 만료 워크스페이스를 정리한다.

## Conventions

- 수집 범위는 아티팩트 영역으로 한정하고 realpath로 격리를 확인한다. 경로 문자열만 확인하면 심링크로 외부 파일이 결과에 섞일 수 있다.
- 확장자 허용 목록과 제한된 디렉터리 권한을 유지한다. 허용하지 않은 파일은 수집하지 않는다.

## Boundaries

### Always do

- 산출물 해시(sha256) 부여 + realpath 격리 확인
- manifest 의 kind 를 우선, 없으면 확장자로 추론

### Ask first

- 확장자 화이트리스트 변경
- 수집 범위를 하위 디렉토리까지 확장

### Never do

- ARTIFACTS_DIR 밖 경로 수집
- Rscript 탐색·spawn 책임 침범 (rRuntime 소관)
