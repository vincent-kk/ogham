## Purpose

빌드 시점에 Windows `.cmd` shim 파일을 생성하는 generator. 각 플러그인이 자신의 build script에서 entry shim 생성을 호출한다.

## Conventions

- CRLF 줄바꿈 — Windows .cmd 호환.
- caller는 사용할 Node 경로를 명시하는 것을 권장한다.

## Boundaries

### Always do

- 출력 디렉토리 없으면 자동 생성.
- CRLF 줄바꿈으로 출력.

### Ask first

- PowerShell launcher (.ps1) 추가.
- shim 본문 템플릿 변경.

### Never do

- Unix 환경에서 .cmd 실행 시도 (본 모듈은 생성만 책임).
