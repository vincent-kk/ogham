## Purpose

호스트가 **지침 문서로 읽는 파일**의 이름과, 그 파일 안에서 **플러그인 소유 구간을 다루는 순수 문자열 연산**. 부수효과·env 판독이 전혀 없어 **훅 도달 코드에서도 안전**하다 — 훅에는 `OGHAM_HOST` 가 없으므로(어댑터는 MCP 선언에만 주입) 호스트 분기 대신 **채널 합집합 판독**을 쓴다.

## Structure

| File                | Role                                                                |
| ------------------- | ------------------------------------------------------------------- |
| `index.ts`          | barrel                                                              |
| `types.ts`          | `SectionMarkers`                                                    |
| `files.ts`          | `CLAUDE.md` / `AGENTS.md` 상수 + `INSTRUCTIONS_FILES` (합집합)      |
| `sectionMarkers.ts` | `<!-- NS:START:id -->` 마커 쌍 생성 (id 생략형 = maencof 기존 규약) |
| `mergeSection.ts`   | 구간 삽입/치환 (idempotent)                                         |
| `readSection.ts`    | 구간 본문 판독 (부재 시 null)                                       |
| `removeSection.ts`  | 구간 제거 (부재 시 null)                                            |

## Conventions

- **순수 함수만** — `node:fs` 금지. 파일 I/O 는 소비처가 소유한다 (filid=원자적 쓰기, maencof=`.bak` 백업).
- 구간은 **부분 문자열 검색**으로 찾는다 — 마커가 다르면 여러 플러그인·여러 규칙 문서가 한 파일에 공존한다.
- `mergeSection` 은 **재실행 안전** — 같은 본문을 두 번 병합해도 누적되지 않는다.

## Boundaries

### Always do

- 호스트 분기가 필요한 판단은 `hostPaths/instructionsChannel` 에 두고, 여기엔 **순수 지식만** 남긴다.
- 훅에서 규칙/지침 존재를 판정할 땐 `INSTRUCTIONS_FILES` 전체를 본다.

### Ask first

- 새 호스트의 지침 파일 추가 (agy 는 **미실측** — `GEMINI.md`·`AGENTS.md` 후보뿐).
- 마커 문법 변경 (배포된 `CLAUDE.md`·`AGENTS.md` 를 깨뜨린다).

### Never do

- 이 모듈에서 `process.env` 판독 (훅 안전성이 깨진다).
- 파일 경로를 인자로 받는 API 추가 (I/O 는 소비처 몫).

## Dependencies

- 없음 (Node 내장조차 쓰지 않는다).
