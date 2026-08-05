# imbas — Contract

## Requirements

- 패키지는 기획자 사이드 파이프라인 `refine → estimate(skip 가능) → split` 을 스킬·에이전트·MCP 서버 세 표면으로 배송한다.
- phase 진행의 정본은 `.imbas/<PROJECT_REF>/runs/<run_id>/state.json` 이고, 이슈 생성 진행의 정본은 stories 매니페스트의 `issue_ref`·`status` 다. 두 정본을 한 곳으로 합치지 않는다.
- provider 는 `jira` · `github` · `local` 셋이다. 한 스킬 실행이 provider X 를 대상으로 하면 `references/Y/**` 를 읽지 않는다 — provider 별 계약이 서로 새면 실행 결과가 대상 트래커와 어긋난다.
- `bridge/` · `public/` · `.codex-plugin/` · 루트 `plugin.json` 은 빌드 산출물이다. 커밋되지만 손편집하지 않는다.

## API Contracts

- npm 배송 표면은 `package.json` 의 `files` 가 정의한다: `dist` · `agents` · `bridge` · `skills` · `public` · `.claude-plugin` · `plugin.json` · `.codex-plugin` · `.mcp.json` · `mcp_config.json` · `README.md`.
- 호스트 진입점은 매니페스트다 — `.claude-plugin/plugin.json` 이 Claude Code 표면을, `.mcp.json` 이 MCP 서버 등록을 선언한다. 두 파일이 이 fractal 의 entry point 이며 TypeScript 배럴은 아니다.
- MCP 런타임 산출물은 `bridge/mcp-server.cjs` 하나이고 원본은 `src/mcp/serverEntry/serverEntry.ts` 다.
- 빌드 순서는 `clean → version:sync → build:pages → build:compile → build:mcp → build:compile-plugin` 이다. `src/version.ts` 는 `version:sync` 의 산출물이다.

## Acceptance Criteria

### AC-shipped-surface — 배송 표면 일치

- `package.json` 의 `files` 에 나열된 모든 경로가 빌드 후 실제로 존재한다.
- `files` 에 `src` 가 포함되지 않는다 — 소스는 배송 표면이 아니다.

### AC-manifest-version-sync — 매니페스트 버전 동기

- `package.json` 의 `version` 과 `.claude-plugin/plugin.json` 의 `version` 이 같다.
- `src/version.ts` 의 `VERSION` 이 `package.json` 의 `version` 과 같다.

### AC-provider-isolation — provider 경계 격리

- `skills/<skill>/references/<provider>/` 문서는 다른 provider 디렉터리 경로를 참조하지 않는다.
- provider 중립 계약은 provider 디렉터리 밖에만 존재한다.

### AC-generated-not-handwritten — 생성물 비손편집

- `bridge/` · `public/` · `.codex-plugin/` 의 내용이 공식 build 재실행 결과와 일치한다.

## Last Updated

2026-08-06 — v2 재편(기획자 사이드 전환, MCP 9 도구, phase `refine/estimate/split`)에 맞춰 패키지 루트 계약을 최초 문서화했다.
