## Purpose

`@ogham/imbas` 패키지 루트. 기획 문서를 재구조화·검증하고, manday를 추산하고, Jira / GitHub / local 이슈로 분할·생성하는 기획자 사이드 파이프라인 Claude Code 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Structure

| Path                         | Role                                           |
| ---------------------------- | ---------------------------------------------- |
| `src/`                       | TypeScript 소스 (fractal 루트; 자체 INTENT.md) |
| `agents/`                    | 역할별 에이전트 (analyst, planner, estimator)  |
| `skills/`                    | 사용자 스킬 디렉토리                           |
| `scripts/`                   | esbuild 빌드 스크립트                          |
| `bridge/` · `public/`        | 빌드 산출물: MCP 번들 · settings UI (커밋)     |
| `.claude-plugin/plugin.json` | Claude Code 플러그인 매니페스트                |
| `.mcp.json`                  | MCP 서버 등록                                  |

## Conventions

- 빌드(도메인 스크립트 조합): `clean → version:sync → pages → compile → mcp → compile-plugin`
- 파이프라인: refine → estimate(skip 가능) → split. phase 진행은 `state.json`(MCP 상태머신), 이슈 생성 진행은 stories 매니페스트의 `issue_ref`/`status`
- provider 추상화 (`jira` / `github` / `local`); 실행 state 는 `.imbas/<KEY>/runs/<id>/` (GitHub ref 는 `owner--repo` 디렉토리로 매핑); Jira 실행은 `[OP:]` 시맨틱 오퍼레이션을 세션의 Atlassian 도구가 결의

## Boundaries

### Always do

- 빌드 후 `bridge/` 커밋
- 신규 실행 시 `run_id` 디렉토리 생성, manifest 스키마 준수
- skill 이 provider X 대상이면 `references/Y/**` 읽지 않음 (provider 경계)

### Ask first

- 새 provider 추가 (jira / github / local 외)
- Phase 순서 또는 단계 추가 / 제거 (파이프라인 계약 영향)
- `run_id` 또는 state 디렉토리 구조 변경 (재개 호환성)

### Never do

- `bridge/` 손편집 / `src/version.ts` 손편집
- 다른 provider 의 `references/` 디렉토리 참조 (cross-provider leakage)
- `.imbas/runs/<id>/` 외 임의 위치에 state 저장

## Dependencies

- **런타임**: `@modelcontextprotocol/sdk ~1.22`, `zod ^3.23`
- **개발**: `esbuild ^0.24`, `typescript ^5.7`, `vitest ^4.1`
- **환경**: Node.js ≥ 20, Yarn 4.12 workspaces
