## Purpose

도구가 결선되는 빈 `McpServer` 인스턴스를 생성한다(서버 이름·버전 메타 포함).

## Structure

| 파일/디렉터리 | 역할                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| `server.ts`   | `createServer`: `SERVER_NAME`·`VERSION` 메타를 단 `McpServer` 인스턴스 생성 |
| `index.ts`    | barrel: `createServer` 재노출                                               |

## Conventions

- name·version 메타는 `version.ts`의 `SERVER_NAME`/`VERSION` 단일 출처에서만 가져온다
- 빈 `McpServer`(capabilities tools만)만 생성하고 도구는 여기서 등록하지 않는다
- stdio 등 전송 계층 연결은 이 모듈이 아닌 호출자(root) 책임으로 남긴다

## Boundaries

### Always do

- 서버 식별 메타(name/version)를 단일 출처에서 가져온다

### Ask first

- 서버 생성 옵션·전송 계층 변경

### Never do

- 여기서 도구를 직접 등록한다(등록은 registry 책임)

## Dependencies

- 내부: `version`(서버 이름·버전 메타 단일 출처)
- 외부: `@modelcontextprotocol/sdk`(`McpServer`)
- 소비처: `mcp`, root
