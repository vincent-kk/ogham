## Purpose

`~/.yt-dlp` 트리(바이너리·임시·다운로드 경로)를 해석하고 디렉터리 생성·임시 디렉터리 할당·정리를 담당한다.

## Structure

| 파일/디렉터리 | 역할                                                      |
| ------------- | --------------------------------------------------------- |
| `paths.ts`    | 경로 해석·`ensureBaseDirs`·`makeTempDir`·`removeDir` 구현 |
| `index.ts`    | barrel: `createPaths`, `removeDir`, 타입 `Paths`          |

## Conventions

- 모든 경로(`binDir`/`tempDir`/`downloadsDir`/`binaryPath`)는 `config.paths`의 home 루트 기준으로 `createPaths`에서만 파생한다.
- 바이너리 파일명은 직접 하드코딩하지 않고 `constants`의 `LOCAL_BINARY_NAME`을 사용한다.
- 임시 디렉터리는 전용 `tempDir` 아래에서 `mkdtemp`로만 생성하며 정리는 `removeDir`(`rm` recursive+force)로 일원화한다.
- `Paths` 인스턴스는 `createPaths(config)`로만 만들고, 소비 전 `ensureBaseDirs()`로 기본 디렉터리를 보장한다.

## Boundaries

### Always do

- 사용 전 기본 디렉터리 존재를 보장한다
- 임시 디렉터리는 전용 temp 경로 아래에만 만든다

### Ask first

- 경로 레이아웃(bin/temp/downloads) 변경

### Never do

- 설정으로 지정된 트리 바깥에 쓰기
- 경로 해석에 네트워크·외부 상태를 끌어들인다

## Dependencies

- 내부: `constants`(`LOCAL_BINARY_NAME`), `config`(타입 `Config`)
- 외부: `node:fs/promises`, `node:os`, `node:path`
- 소비처: root, `core/service`, `ytdlp/binary`
