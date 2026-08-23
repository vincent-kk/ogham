## Purpose

facts 를 호스트 어댑터 파일 내용(순수 객체)으로 변환한다. Codex 훅은 지원 이벤트와 matcher capability를 명시적으로 적용하며 Claude 정본에는 손대지 않는다.

## Conventions

- 빌더 함수는 전부 동기·순수 — `(facts) => Record<string, unknown>`, 조건부 산출물(`mcpServers` 미설정 등)만 `| null`. 예외: `buildCodexSkills` 는 파일 다발 `CodexSkillFile[] | null`.
- 서버명 규칙은 호스트마다 다르다 — `buildCodexMcpServers` 는 서버가 여럿일 때만 `{plugin}-{server}` 로 재명명하고, `buildAgyMcpConfig` 는 원본 서버명을 그대로 쓴다.
- `${CLAUDE_PLUGIN_ROOT}` 는 `command`·`env` 값에 남아있으면 throw, `args` 접두사일 때만 상대화한다(`buildPortableMcpServer` → `relativizePluginRootPath`).
- Codex 훅 생성과 lint 는 `constants/hosts.ts` 의 이벤트·matcher capability 선언을 공유한다. 지원하지 않는 exact tool은 제거하고 Pre read fallback은 선언된 경우에만 적용하며, 변경이 없으면 전용 파일을 만들지 않는다.

## Boundaries

### Always do

- 키 순서를 코드에서 고정 — 동일 facts 는 바이트 동일 출력(stableJson 전제).
- 생성 MCP 선언마다 `OGHAM_HOST` 마커를 env 에 병합 (codex/agy).
- Claude 훅 정본은 그대로 두고, Codex에서 의미가 없는 이벤트·exact tool matcher만 생성 사본에서 제거.

### Ask first

- 서버명 오버라이드·복사 필드 목록 변경 — Codex 도구명 표면과 매니페스트 계약에 영향.

### Never do

- 디스크 I/O — 쓰기는 `pipeline/applyFiles` 단일 경로.
- Claude 산출물 형식 변형 재출력 (Claude 파일은 이 모듈의 출력 대상이 아니다).
