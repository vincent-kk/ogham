## Purpose

기능별 수직 슬라이스 모음. 각 기능은 도구·operation·후처리를 한 fractal 노드에 응집한다.

## Structure

| 파일/디렉터리 | 역할                                                        |
| ------------- | ----------------------------------------------------------- |
| `index.ts`    | barrel: 각 기능 슬라이스의 공개 도구 재노출                 |
| `subtitle/`   | 자막 슬라이스(transcript·subtitles·list-subtitle-languages) |

## Conventions

- 각 기능은 자기완결 fractal이며, 공용 추출 엔진(`ytdlp`)·오케스트레이션(`core/service`)·도메인 타입은 공유 계층에서 가져온다.
- 새 기능은 `<feature>/` fractal로 추가하고 `index.ts`에 그 공개 도구를 재노출한다.

## Boundaries

### Always do

- 기능 간 의존은 공유 계층을 경유한다

### Ask first

- 새 기능 슬라이스 추가

### Never do

- 기능 슬라이스끼리 서로의 내부 파일을 직접 import한다

## Dependencies

- 내부: `mcp/tools`(공용 래퍼), `core/service`, `ytdlp/operations`, `postprocess`, `domain`, `utils`, `constants`, `paths`
- 소비처: `mcp/registry`
