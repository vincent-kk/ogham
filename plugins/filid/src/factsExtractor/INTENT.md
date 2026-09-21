# factsExtractor — `filid-facts` 추출 프로그램

## Purpose

에이전트가 자기 Bash로 실행하는 독립 프로그램(`bridge/filid-facts.mjs`)이다. 프로젝트 루트와 파일 목록을 받아 파일마다 `FileFacts` 레코드를 만들고, 프로젝트 트리 밖의 출력 파일 하나에 JSON으로 쓴다. MCP 서버는 이 코드를 import하지 않는다.

## Conventions

- 소스 판독(`analysis/`)을 소유한다: lexer, 참조 추출, entry surface 판독, case 계수, contract marker. 생태계의 이름 규칙은 소유하지 않고 adapter에서 가져온다.
- 한 파일의 텍스트는 한 번 scan하고 모든 판독이 그 결과를 나눠 쓴다. `indeterminate`는 그대로 싣는다.
- `factsExtractor.entry.ts`만 부작용(argv, stdin, 출력 파일, 종료 코드)을 가진다. 나머지는 반환값으로 말한다.
- 판단 우선순위: 1. 밖을 읽거나 쓰지 않음 2. adapter와 같은 값 3. 결정적 출력 4. 속도.

## Boundaries

### Always do

- 입력 경로가 문자열로나 실제 위치로나 프로젝트 밖이면 그 항목을 거부하고 요약에 센다.
- 파일 하나의 실패는 그 파일의 `toolError` 레코드로 남기고 계속한다.
- 출력은 임시 이름에 쓴 뒤 rename한다.

### Ask first

- `FileFacts` 레코드 형식이나 CLI 인자 변경
- 판독이 보는 문법 범위 변경

### Never do

- `core`·`mcp`·`hooks`·zod·MCP SDK import
- 생태계 상수(확장자, entry 이름, 접미사)를 여기에 복제 — adapter가 유일한 출처다
- 네트워크, 출력 파일 하나 외의 쓰기
- 하위 프로세스 실행. 추출 프로그램은 프로세스를 띄우지 않으며 범위도 정하지 않는다. 범위는 서버가 `extractionList`로 준다.
- 범위를 스스로 고르기. 파일 목록이 없으면 사용 오류이고, 범위는 서버의 `extractionList`가 정한다
