## Purpose

도구가 결선되는 빈 `McpServer` 인스턴스를 생성한다(서버 이름·버전 메타 포함).

## Boundaries

### Always do

- 서버 식별 메타(name/version)를 단일 출처에서 가져온다

### Ask first

- 서버 생성 옵션·전송 계층 변경

### Never do

- 여기서 도구를 직접 등록한다(등록은 registry 책임)
