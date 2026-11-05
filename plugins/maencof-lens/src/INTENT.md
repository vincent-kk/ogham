## Purpose

maencof 볼트 지식에 대한 읽기 전용 MCP 접근을 개발 컨텍스트에 제공하는 플러그인 소스 루트.

## Conventions

- maencof handler·타입은 소스 alias로 연결된다. 이 경계는 additive로만 바꾼다. maencof 배럴에서 심볼이 빠지면 이 패키지가 깨진다.
- 루트 배럴은 설정·볼트·필터를 공개하며 MCP를 재노출하지 않는다. 서버의 생성 버전 참조와 결합하면 루트로 돌아오는 순환이 된다.
- 훅이 도달하는 코드는 concrete 파일을 직접 import한다. 배럴 재노출 그래프가 훅 번들 크기 가드를 넘기지 않게 한다.

## Boundaries

### Always do

- 볼트 접근은 읽기 전용으로 유지한다
- 설정·볼트·필터 심볼만 index.ts 배럴로 공개한다 — mcp/ 는 재노출하지 않는다

### Ask first

- 읽기 전용 5개 툴 외 새 MCP 툴 추가 시
- 레이어 필터링 교집합 로직 변경 시

### Never do

- 볼트 파일시스템에 쓰기
- maencof의 mutation 핸들러 호출
