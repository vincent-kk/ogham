# CLAUDE.md — @ogham/maencof

개인 지식 공간 관리 Claude Code 플러그인. 마크다운 기반 Knowledge Graph, Spreading Activation 검색, 기억 라이프사이클 관리 제공.

## Commands

```bash
yarn build          # clean → version:sync → tsc → esbuild
yarn build:plugin   # esbuild 번들만
yarn test:run       # 단일 실행 (CI)
yarn format && yarn lint
```

## Architecture (5-Layer)

| Layer | 이름               | 디렉토리       | 설명                    |
| ----- | ------------------ | -------------- | ----------------------- |
| L1    | Core Identity Hub  | `01_Core/`     | 핵심 정체성 (읽기 전용) |
| L2    | Derived Knowledge  | `02_Derived/`  | 내재화 지식             |
| L3    | External Reference | `03_External/` | 외부 참조               |
| L4    | Action Memory      | `04_Action/`   | 휘발성 작업 기억        |
| L5    | Context            | `05_Context/`  | 맥락 메타데이터         |

**MCP Tools (15)**: `maencof_create/read/update/delete/move`, `kg_build/search/navigate/context/status/suggest_links`, `claudemd_merge/read/remove`, `dailynote_read`

**Agents (4)**: `memory-organizer`, `identity-guardian`, `doctor`, `configurator`

**Skills (22)**: `setup`, `configure`, `remember`, `recall`, `organize`, `reflect`, `build`, `explore`, `doctor`, `rebuild`, `ingest`, `diagnose`, `connect`, `bridge`, `craft-skill`, `craft-agent`, `instruct`, `rule`, `lifecycle`, `mcp-setup`, `manage`, `dailynote`

> 상세 문서: `../../.metadata/maencof/` 참조 (5-Layer 전체 사양, MCP 도구 계약, 에이전트/스킬 명세, 훅 이벤트 매핑)

## Always do

- vault 경로는 반드시 플러그인 config에서 읽어 사용한다
- 문서 작성/수정 시 5-Layer 모델 레이어 규칙을 따른다
- 마크다운 문서 frontmatter(필수 필드: `id`, `layer`, `created`)를 검증한다
- 훅 수정 후 `yarn build:plugin` 재빌드, 버전은 `yarn version:sync`로만 변경한다

## Ask first

- L1_CORE 문서를 삭제하기 전
- 전체 그래프 재빌드(`kg_build --full`)를 실행하기 전
- 레이어 간 문서 이동이 대량으로 발생하는 작업 전

## Never do

- `.maencof-index/` 디렉토리를 직접 수정하지 않는다
- 레이어 유효성 검사를 우회하지 않는다
- vault 경로를 코드에 하드코딩하지 않는다
