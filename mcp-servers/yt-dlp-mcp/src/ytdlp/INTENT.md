## Purpose

yt-dlp 바이너리 획득·실행·정보 추출 서브시스템.

## Structure

| 파일/디렉터리         | 역할                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `index.ts`            | barrel: binary/runner 공개 API·타입 재노출                                                                            |
| `binary/` (organ)     | 버전 해석·체크섬·원자적 설치·HTTP(ensure-binary, select-safe-release, checksum, http, version, asset-name)            |
| `runner/` (organ)     | 불변 플래그 적용 실행(runner, evasion-args, js-runtime-arg)                                                           |
| `operations/` (organ) | info-json 기반 도메인 연산(transcript, metadata, comments, subtitles, chapters, heatmap, playlist, search, download…) |

## Conventions

- 버전은 `versionResolver`가 쿨다운으로 고정(또는 pinned tag 조회)한 뒤, `.part` 스테이징 → 체크섬 검증 → `rename` 원자적 설치로만 바이너리를 갱신한다.
- `runner`는 `BASE_ARGS`(`--ignore-config`/`--no-warnings` 등) + JS 런타임 + evasion 플래그를 `commonArgs`로 강제 prepend하며, 호출자가 이 불변식을 우회할 수 없다.
- operations는 `--dump-single-json --skip-download`로 얻은 info-json을 `parseInfoJson`으로 파싱해 도메인 결과를 반환한다.
- HTTP·바이너리 파일 I/O는 `binary` organ에 격리하고 실행 실패는 `toYtDlpError`로 정규화한다.

## Boundaries

### Always do

- 쿨다운으로 고정한 버전을 체크섬 검증 후 설치한다
- 실행 실패를 타입이 있는 에러로 정규화한다

### Ask first

- 바이너리 획득 정책·불변 실행 플래그 변경

### Never do

- 검증 없이 바이너리를 설치하거나 임의 버전을 받는다
- `--ignore-config`/`--no-warnings` 실행 불변식을 깬다

## Dependencies

- 내부 organ: `binary/*`, `runner/*`, `operations/*`; 주입받음: `config`(버전/쿨다운), `paths`(설치 위치), `domain`(에러), `constants`(GitHub·BASE_ARGS)
- 외부: `execa`, `node:crypto`, `node:fs/promises`, HTTP
- 소비처: `core/service`(runner·operations/context), root(binary·runner)
