# entrez — Contract

## Requirements

- 이 플러그인의 유일한 책임은 검색 **누락 방지(recall)** 다. 정밀도를 위해 결과를 버리는 판단은 사용자에게 남긴다.
- 결정론 규칙은 코드가, 자연어 판단은 agent 가 맡는다. dedup·10k 분할·rate 는 LLM 이 관여하지 않는다.
- 모든 outbound 요청에 SSRF allowlist 를 적용한다.
- `api_key` 는 stdout·로그·MCP 응답에 노출하지 않는다. 저장은 `credentials.json`(0o600) 한 곳이다.
- `bridge/` 와 `public/` 은 커밋하는 빌드 산출물이며 손편집하지 않는다.
- `src/version.ts` 와 `plugin.json` 의 version 은 `injectVersion.mjs` 만 갱신한다.

## API Contracts

- **MCP 도구 5종** (서버 이름 `tools`): `paper_search`, `mesh_lookup`, `fetch_fulltext`, `auth_check`, `setup`.
- **스킬 4종**: `search`(전체 파이프라인), `query`(검색식만), `download`(본문 확보), `setup`(설정).
- **에이전트 1종**: `paper-search-expert`(검색식 생성·재랭킹 2모드).
- **빌드 파이프라인**: `clean → version:sync → pages → compile → mcp → compile-plugin`.

## Acceptance Criteria

### AC-recall-ownership — recall 규칙의 소유

- dedup·분할·lint 가 코드에서 결정되고 스킬 프롬프트에 위임되지 않는다.
- `paper_search` 결과에서 레코드가 병합으로 사라지지 않는다.

### AC-credential-secrecy — 자격증명 보호

- `api_key` 가 도구 응답·로그에 나타나지 않는다.
- credentials 파일 권한이 0o600 이다.

### AC-unconfigured-recovery — 미설정 복구 경로

- 미설정 상태의 도구 호출이 `NOT_CONFIGURED` 를 돌려주고, 스킬이 `setup` 으로 유도한 뒤 원래 요청을 이어간다.
- 자격증명 부재로 인한 종료가 맨 `FAILED` 로 끝나지 않는다.

### AC-generated-artifacts — 산출물 규약

- `bridge/`·`public/` 이 커밋되고 손편집 흔적이 없다.
- `version.ts` 와 `plugin.json` 의 version 이 생성기 산출과 일치한다.

## Last Updated

2026-07-30 — 플러그인 루트 계약을 문서화했다.
