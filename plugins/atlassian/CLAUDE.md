# CLAUDE.md — @ogham/atlassian

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md), 설계 맥락은 [`.metadata/atlassian/INDEX.md`](../../.metadata/atlassian/INDEX.md)를 따른다.

## Context

- Cloud와 Server/DC 차이는 skill과 MCP 계층에서 흡수한다. agent와 dispatcher에는 배포 환경 분기를 올리지 않는다.
- Jira·Confluence의 교차 도메인 조정은 dispatcher가 맡는다. agent끼리 통신하거나 skill이 다른 skill을 호출하게 만들지 않는다.
- `src/converter/`는 Python `mcp-atlassian`에서 포팅한 호환 계층이다. ADF·Storage 노드 매핑 변경은 원본 의미와 왕복 변환 계약을 함께 검토한다.
