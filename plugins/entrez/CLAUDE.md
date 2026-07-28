# CLAUDE.md — @ogham/entrez

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md), 설계 정본은 [`.metadata/entrez/README.md`](../../.metadata/entrez/README.md)를 따른다.

## Context

- 최우선 목표는 recall이다. LLM은 검색식을 다양화하고 결과를 정렬하지만, 전수 수집·union·중복 제거는 결정적 service가 맡으며 rerank 단계가 레코드를 버리지 않는다.
- query 방법론은 `skills/.shared/query-strategy.md`, rerank는 `skills/.shared/rerank.md`, orchestration은 `skills/search/SKILL.md`, tool 계약은 MCP와 `skills/.shared/mcp-tools.md`, E-utilities 사실은 `skills/.shared/eutils.md`가 각각 소유한다.
- agent 참조 문서는 `skills/.shared/`에 둔다. `agents/` 아래의 모든 Markdown을 플러그인 로더가 agent로 해석하며 하위 디렉터리를 허용하지 않는다.
