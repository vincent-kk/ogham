## Purpose

호스트별 규칙을 캡슐화하는 fractal. 각 프로파일이 매니페스트/MCP 렌더링·토큰 해석·agent/hook 전략을 소유하고, emitter 는 호스트 무지 상태로 프로파일을 호출한다.

## Structure

| Path                     | Role                                                  |
| ------------------------ | ----------------------------------------------------- |
| `index.ts`               | barrel — `getProfile(id)` · `availableHosts()`        |
| `claude.ts`              | Claude Code 프로파일 (등가성 오라클의 대응물)         |
| `codex.ts`               | Codex 프로파일 (cwd 전략·서버명 오버라이드·훅 미생성) |
| `agy.ts`                 | Antigravity 프로파일 (mcp_config·훅 named-group)      |
| `shared/manifestMeta.ts` | organ: 호스트 공통 매니페스트 메타 필드               |

## Conventions

- 프로파일은 `HostProfile` 를 구현하는 단일 `const` export.
- 호스트 지식은 오직 이 디렉터리에만 — emitter/ir 에 호스트 분기 금지.
- 도구명 형식·경로 전략의 실측 근거는 [`.metadata/plugin-compiler/host-capability-matrix.md`](../../../../.metadata/plugin-compiler/host-capability-matrix.md).

## Boundaries

### Always do

- Claude 프로파일은 현행 산출물 관례를 재현 (mcpServers 래퍼, full-form 도구명).
- Codex 는 서버명을 플러그인명으로 오버라이드, `cwd` 전략, 훅 미생성.

### Ask first

- `HostProfile` 인터페이스 변경 (전 프로파일·emitter 영향).

### Never do

- Codex 프로파일에서 hooks 산출물 생성.
- 프로파일에서 디스크 접근 (순수 렌더링만 — I/O 는 pipeline).

## Dependencies

- `types/profile`, `types/ir`, `types/output`.
