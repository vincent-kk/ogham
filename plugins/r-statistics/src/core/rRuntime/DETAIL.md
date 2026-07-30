# rRuntime — Contract

## Requirements

- Rscript 실행은 항상 `shell: false` 로 spawn 한다 — 셸 해석 경로를 만들지 않는다.
- Rscript 위치는 환경변수 override → 관례 경로 순으로 탐색하며, override 가 실행 가능한 파일을 가리키지 않으면 무시한다.
- 자식 프로세스 출력은 UTF-8 로 먼저 해석하고, 유효하지 않을 때만 CP949/EUC-KR 로 폴백한다.
- 통계 의미를 알지 못한다 — 실행과 디코딩만 책임진다.

## API Contracts

- `discoverRscript(): string | null` — 실행 가능한 Rscript 절대경로. env → PATH → 공통 경로 → (Windows) 레지스트리 순으로 찾고, 어디에서도 못 찾으면 `null`. 실존하지 않는 env override 는 반환하지 않는다.
- `spawnRscript(options: SpawnRscriptOptions): Promise<SpawnRscriptResult>` — `@ogham/cross-platform` 의 `spawnCli` 로 `--vanilla` 실행. 타임아웃·`AbortSignal` 에서 tree-kill 로 자식을 종료하고, 출력은 latin1 무손실 왕복 Buffer 로 돌려준다.
- `decodeOutput(buffer: Buffer): DecodedStream` — UTF-8(fatal) 우선, 실패 시 CP949/EUC-KR 폴백. 길이 상한을 넘으면 truncate 사실을 결과에 남긴다.

## Acceptance Criteria

### AC-rscript-discovery — 탐색 신뢰성

- 환경변수 override 가 실행 가능한 파일을 가리키면 그 경로를 반환한다.
- 존재하지 않는 override 는 절대 반환하지 않는다.

### AC-output-decoding — 인코딩 폴백

- 유효한 UTF-8 바이트열은 UTF-8 로 해석한다.
- UTF-8 로 유효하지 않은 한국어 바이트열은 CP949/EUC-KR 로 해석한다.
- 순수 ASCII 는 UTF-8 로 해석한다.

## Last Updated

2026-07-30 — 실행·디코딩 계약을 문서화했다.
