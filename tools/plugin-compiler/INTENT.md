## Purpose

`@ogham/plugin-compiler` 패키지 루트. 모노레포 내부 전용 어댑터 생성기로, 각 플러그인의 **Claude 산출물을 무수정 정본**으로 읽어 Codex(`.codex-plugin/plugin.json`)·Antigravity(`mcp_config.json`)·루트 마켓플레이스(`.agents/*`) 어댑터를 결정적으로 생성한다. 설계 SSoT 는 [`.metadata/plugin-compiler/`](../../.metadata/plugin-compiler/), 적용 절차는 [migration-playbook.md](../../.metadata/plugin-compiler/migration-playbook.md).

## Structure

| Path               | Role                                            |
| ------------------ | ----------------------------------------------- |
| `src/`             | TypeScript 소스 (fractal 루트 — 진입 `main.ts`) |
| `vitest.config.ts` | 스펙 러너 (`src/**/__tests__/**`)               |
| `package.json`     | private 워크스페이스 (npm 게시 금지)            |

## Conventions

- `tsx` 로 실행 — dist 빌드 산출물 없음 (`private: true`).
- 진입은 루트 스크립트 `yarn plugin:adapters`(sync) / `yarn plugin:adapters:check`.
- 루트 `yarn typecheck` · `yarn test:run` 이 이 패키지를 포함한다.

## Boundaries

### Always do

- Claude 소비 파일(`.claude-plugin/**`·`.mcp.json`·`skills/`·`agents/`·`hooks/`)은 **읽기 전용**.
- 생성 MCP 선언에 `OGHAM_HOST` 호스트 마커 env 주입 (codex/agy; Claude 는 마커 없음).

### Ask first

- 어댑터 파일 집합 추가/제거 (호스트 추가·설치 채널 변경 — 플레이북과 동시 갱신).
- 서버명 오버라이드 규칙 변경 (Codex 도구명 표면에 영향).

### Never do

- Claude 소비 파일 쓰기 — 무결손은 이 금지로 구조 보장된다.
- 어댑터 손편집 허용 로직 (diff 감지 시 항상 재생성이 이긴다).
- 훅 진입을 쉘 스크립트로 emit (`node <script>` 직접 호출 유지).

## Dependencies

- **개발**: `typescript ^5.7`, `vitest`, `tsx`(루트) — Node.js ≥ 20, Yarn 4.12 workspaces. 런타임 의존성 없음(Node 내장만).
- 버전 동기화는 [`scripts/injectVersion.mjs`](../../scripts/injectVersion.mjs) 가 담당(`.claude-plugin` + `.codex-plugin`).
