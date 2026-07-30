# instructions — Contract

## Requirements

- 순수 함수만 둔다. `node:fs` 를 쓰지 않고 파일 I/O 는 소비처가 소유한다(filid=원자적 쓰기, maencof=`.bak` 백업). Node 내장조차 의존하지 않는다.
- `process.env` 를 읽지 않는다. 훅에는 `OGHAM_HOST` 가 없으므로 호스트 분기 대신 채널 합집합(`INSTRUCTIONS_FILES`) 판독을 쓴다. env 판독이 들어오면 훅 안전성이 깨진다.
- 구간은 부분 문자열 검색으로 찾는다 — 마커가 다르면 여러 플러그인·여러 규칙 문서가 한 파일에 공존한다.
- `mergeSection` 은 재실행 안전이다. 같은 본문을 두 번 병합해도 누적되지 않는다.
- `removeSection` 은 소유 마커 span 밖 바이트를 공백까지 보존한다.
- 파일 경로를 인자로 받는 API 를 추가하지 않는다.

## API Contracts

- `sectionMarkers(namespace, id?)` — `<!-- NS:START:id -->` 마커 쌍. id 생략형은 maencof 기존 규약이다.
- `readSection(source, markers)` — 구간 본문. 부재 시 `null`.
- `mergeSection(source, markers, body)` — 구간 삽입·치환. idempotent.
- `removeSection(source, markers)` — 구간 제거. 부재 시 `null`.
- `INSTRUCTIONS_FILES` · `CLAUDE.md`·`AGENTS.md` 상수 — 지침 파일 이름 합집합.
- `read/`·`write/` 하위 fractal — 훅용 목적별 진입점. 서브패스 `instructions/read`·`instructions/write` 로 노출된다.

## Acceptance Criteria

### AC-pure-no-io — 순수·무I/O

- 이 fractal 의 어떤 파일도 `node:fs` 나 `process.env` 를 읽지 않는다.

### AC-merge-idempotent — 병합 멱등

- 같은 본문을 두 번 병합해도 구간이 하나만 남는다.

### AC-outside-bytes-preserved — 구간 밖 보존

- 제거·병합 뒤 마커 span 밖 바이트가 공백까지 동일하다.

## Boundary Exemptions

### `readSection.ts` — Hook entry facade

- **Consumers**: `**/src/instructions/read/**`
- **Direct import**: `allowed`
- **Reason**: `read/` 는 훅이 쓰는 목적별 서브패스 진입점(`instructions/read`)이고, 그 배럴이 여기 구현을 골라 노출하는 것이 이 fractal 의 설계다. 부모 배럴(`instructions/index.ts`)을 경유하면 `read/` 를 재노출하는 배럴을 다시 참조해 순환이 되고, write 쪽 구현까지 훅 번들에 실린다.

### `sectionMarkers.ts` — Hook entry facade

- **Consumers**: `**/src/instructions/read/**`, `**/src/instructions/write/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. 마커 생성기는 read·write 두 진입점이 함께 노출한다.

### `types.ts` — Hook entry facade

- **Consumers**: `**/src/instructions/read/**`, `**/src/instructions/write/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다. `SectionMarkers` 는 두 진입점의 공개 타입이다.

### `mergeSection.ts` — Hook entry facade

- **Consumers**: `**/src/instructions/write/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

### `removeSection.ts` — Hook entry facade

- **Consumers**: `**/src/instructions/write/**`
- **Direct import**: `allowed`
- **Reason**: 위와 같다.

## Last Updated

2026-07-30 — 순수성·멱등 계약과 훅 진입 façade 면책을 문서화했다.
