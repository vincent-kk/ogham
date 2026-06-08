## Purpose

yt-dlp 바이너리 획득·실행·정보 추출 서브시스템.

## Structure

- `binary/` — 버전 해석·체크섬 검증·원자적 설치·HTTP (organ)
- `runner/` — 불변 플래그를 적용한 yt-dlp 실행 (organ)
- `operations/` — info-json 기반 도메인 연산 (organ)

## Boundaries

### Always do

- 쿨다운으로 고정한 버전을 체크섬 검증 후 설치한다
- 실행 실패를 타입이 있는 에러로 정규화한다

### Ask first

- 바이너리 획득 정책·불변 실행 플래그 변경

### Never do

- 검증 없이 바이너리를 설치하거나 임의 버전을 받는다
- `--ignore-config`/`--no-warnings` 실행 불변식을 깬다
