## Purpose

`@ogham/plugin-compiler` 모노레포 내부 전용 어댑터 생성기. 각 플러그인의 **Claude 산출물을 무수정 정본**으로 읽어 Codex(`.codex-plugin/plugin.json`)·Antigravity(`mcp_config.json`)·루트 마켓플레이스(`.agents/*`) 어댑터 파일을 결정적으로 생성한다. 설계 SSoT 는 [`.metadata/plugin-compiler/`](../../.metadata/plugin-compiler/), 적용 절차는 [migration-playbook.md](../../.metadata/plugin-compiler/migration-playbook.md).

## Structure

| Path             | Role                                                         |
| ---------------- | ------------------------------------------------------------ |
| `src/main.ts`    | CLI 진입 (`sync [--check] [pluginDir ...]`, tsx 실행)        |
| `src/constants/` | organ: 호스트 상수 (Codex 이벤트셋 · 어댑터 경로 · env 마커) |
| `src/types/`     | organ: PluginFacts · GeneratedFile · Diagnostic 계약         |
| `src/json/`      | organ: `stableJson` 직렬화                                   |
| `src/facts/`     | fractal: Claude 정본 → facts (읽기 전용)                     |
| `src/adapters/`  | fractal: facts → 어댑터 파일 내용 (순수)                     |
| `src/lint/`      | organ: 호환성 진단 (훅 이벤트 · matcher · MCP 이식성)        |
| `src/pipeline/`  | fractal: 대상 열거 · 쓰기/검사 오케스트레이션                |

## Conventions

- `tsx` 로 실행 — dist 빌드 산출물 없음 (`private: true`, npm 게시 금지).
- 어댑터 내용 생성(`adapters/`)은 순수 함수 — 디스크 쓰기는 `pipeline/applyFiles` 단일 경로.
- 진입은 루트 스크립트 `yarn plugin:adapters`(sync) / `yarn plugin:adapters:check`.

## Boundaries

### Always do

- JSON emit 은 `stableJson`(2-space + 개행) 단일 경로 — 재실행 무변경(결정성).
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

- **개발**: `typescript ^5.7`, `tsx`(루트) — Node.js ≥ 20, Yarn 4.12 workspaces. 런타임 의존성 없음(Node 내장만).
- 버전 동기화는 [`scripts/inject-version.mjs`](../../scripts/inject-version.mjs) 가 담당(`.claude-plugin` + `.codex-plugin`).
