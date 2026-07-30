# shared — Contract

## Requirements

- 훅 특화 로직을 두지 않는다. 여기 있는 것은 네 훅이 전부 같은 방식으로 쓰는 것뿐이다.
- 지침 경로는 runtime host → 목적별 project instruction target → `instructions/hook/status` 순으로 해석한다. 훅이 경로를 직접 조립하지 않는다.
- vault 판정(`isMaencofVault`)이 모든 훅의 첫 게이트다. 볼트가 아니면 훅은 아무 일도 하지 않는다.
- stdin·stdout 처리는 이 fractal 이 소유한다. envelope 형태를 훅마다 다시 만들면 Claude Code 가 조용히 버리는 필드가 섞인다.

## API Contracts

- `isMaencofVault(cwd)` — 볼트 루트 여부. 모든 훅의 진입 게이트.
- `isInsideMaencofVault(path)` — 경로가 볼트 안에 드는지.
- `readStdin()` — 훅 stdin JSON 파싱.
- `writeResult(result)` — 훅 응답 envelope 출력.
- `metaPath(cwd, ...segments)` · `maencofPath(cwd, ...segments)` — `.maencof-meta` · `.maencof` 하위 경로.
- `MAENCOF_MCP_TOOLS` · `isMaencofMcpToolName(name)` · `normalizeMaencofToolName(name)` — 훅이 참조하는 MCP 도구 이름 목록과 판별·정규화.
- `instructionsPath(...)` — 호스트별 지침 파일 경로.

## Acceptance Criteria

### AC-vault-gate-first — 볼트 게이트 우선

- 볼트가 아닌 cwd 에서 훅이 부수효과 없이 통과한다.

### AC-envelope-no-unsupported-fields — 미지원 필드 부재

- `writeResult` 출력에 `message`·`hookMessage` 같은 미지원 top-level 필드가 없다.

## Boundary Exemptions

### `isMaencofVault.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 지침 경로 해석과 MCP 도구 목록까지 전부 번들에 끌려 들어와 가드를 넘긴다 — 볼트 게이트만 필요한 훅이 대부분이다.

### `readStdin.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. 훅 진입점은 stdin 파싱만 필요하다.

### `writeResult.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. 훅 진입점은 envelope 출력만 필요하다.

### `metaPath.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `maencofMcpTools.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

## Last Updated

2026-07-30 — 훅 공통 게이트·envelope 계약과 훅 직접 import 면책 5건을 문서화했다.
