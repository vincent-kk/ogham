## Purpose

환경변수를 읽어 Zod로 검증한 `Config`를 생성한다. 잘못된 값은 조용히 넘기지 않고 예외로 던진다.

## Structure

| 파일/디렉터리 | 역할                                                  |
| ------------- | ----------------------------------------------------- |
| `config.ts`   | `ConfigSchema`(Zod)·`loadConfig`·`~` 확장·적응 기본값 |
| `index.ts`    | barrel: `loadConfig`, 타입 `Config`/`EnableFlags`     |

## Conventions

- 환경변수는 `boolEnv`/`intEnv`/`listEnv`로 1차 정규화한 뒤 `ConfigSchema.safeParse`로만 검증하며, 직접 파싱 결과를 외부로 반환하지 않는다.
- 검증 실패 시 `parsed.error.issues`를 `경로: 메시지` 형식으로 모아 단일 `Error`로 throw하고 부분 결과는 절대 돌려주지 않는다.
- `~` 홈 확장과 경로 기본값은 `expandHome`을 거쳐 `loadConfig` 한 곳에서만 적용한다.
- 도구 on/off는 `enable` 그룹(`EnableFlags`)으로 노출하며 `YTDLP_ENABLE_ALL`이 개별 플래그를 일괄 활성화한다.
- `evasion.proxyPool`은 `YTDLP_PROXY_POOL`을 콤마 분리·trim·빈값 제거한 `string[]`(기본 `[]`). 프록시 우선순위는 non-empty pool > 단일 `YTDLP_PROXY` > none.
- `extraction`의 `maxConcurrency`/`requestIntervalMs`/`subtitleIntervalMs` 기본값은 프록시 상태로 적응 계산(adaptive defaults)하며, 그 값을 `intEnv` fallback으로 넘겨 명시적 env가 override한다.
  - none → conc 1 / req 1500 / sub 4000
  - single → conc 2 / req 750 / sub 2000
  - pool(N) → conc `min(N, 8)` / req 0 / sub 250

## Boundaries

### Always do

- 모든 환경변수를 스키마로 검증한 뒤 반환한다
- `~` 홈 확장과 기본값을 한 곳에서 처리한다

### Ask first

- 새 설정 키나 환경변수 추가
- 기본값 변경

### Never do

- 검증을 우회하거나 부분 파싱 결과를 반환한다
- 설정을 소비하는 런타임 로직을 이 모듈에 둔다

## Dependencies

- 내부: 없음(leaf)
- 외부: `zod`, `node:os`/`node:path`(홈 확장)
- 소비처(downstream): root `index.ts`, `core/service`
