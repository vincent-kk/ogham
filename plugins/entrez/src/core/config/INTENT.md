## Purpose

config.json(비밀 외)·credentials.json(api_key, 0o600) 로드·저장과 rate limit 판정. 비밀과 비밀 외 설정을 파일 분리한다.

config 는 user(플러그인 데이터 디렉터리)와 project(`<workspace>/.entrez/config.json`) 두 레이어이며 project 가 user 를 재정의한다 — 저장소 하나가 자기 tool 이름을 선언할 수 있게 하기 위함이다. **credentials 는 레이어링하지 않는다**: project 레이어는 워킹트리 안에 있어 api_key 가 `git add .` 한 번 거리에 놓인다.

## Structure

| 파일                               | 역할                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `operations/loadConfig.ts`         | `loadConfig` — 두 레이어 병합, 미설정이면 null, 0o600 강화 · `loadConfigByScope` — project 좌표를 끈 채 같은 로더로 얻는 레이어별 뷰 |
| `operations/loadConfigScope.ts`    | `loadConfigScope` — 레이어별 원문 + 병합 + 재정의 목록                                                                               |
| `operations/saveConfig.ts`         | `saveConfig` — 단일 레이어에 0o600 기록                                                                                              |
| `utils/configLayers.ts`            | 두 레이어 좌표 해석                                                                                                                  |
| `utils/ensureProjectDirIgnored.ts` | project 디렉터리 생성 시 `.gitignore` 동봉                                                                                           |
| `operations/loadCredentials.ts`    | `loadCredentials` — 없으면 {}, 0o600 강화                                                                                            |
| `operations/saveCredentials.ts`    | `saveCredentials` — api_key 0o600 기록                                                                                               |
| `operations/resolveRateLimit.ts`   | `resolveRateLimit` — 키 유무→3/10 per sec                                                                                            |

## Conventions

- config 검증은 **병합 결과에만** 건다. project 레이어는 재정의한 키만 담아 단독으로 스키마를 통과할 수 없다. credentials 는 종전대로 읽기·쓰기 모두 검증.
- config 좌표는 `utils/configLayers`, credentials 경로는 `constants/paths`(`CREDENTIALS_PATH`).

## Boundaries

### Always do

- config 두 레이어와 credentials 파일 모두 0o600으로 기록하고 드리프트 시 chmod 강화.
- project 디렉터리 생성 시 `.gitignore` 를 동봉한다.
- api_key는 **값**을 반환·로그하지 않고 존재 여부만 노출(resolveRateLimit).

### Ask first

- 저장 경로·포맷 변경(마이그레이션 영향), 스키마 필드 추가/제거.

### Never do

- mcp 레이어에서 직접 import(단방향: mcp → core).
- api_key 값을 직렬화·로그·응답에 노출.
- credentials 를 project 레이어에 쓰기.
- 병합 결과를 어느 한 레이어에 되쓰기 — project 재정의가 user 기본값에 구워진다.

## Dependencies

- `../../types/config` — zod 스키마·타입
- `../../constants/{paths,defaults}` — 경로·rate 상수
- `../../lib/fileIo` — `readJson`/`writeJson`
