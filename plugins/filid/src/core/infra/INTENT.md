# infra — host persistence boundary

## Purpose

config, cache와 content-addressed ephemeral tool artifact의 host I/O를
소유한다.

## Structure

| Module          | Role                                            |
| --------------- | ----------------------------------------------- |
| `artifactStore` | 16 KiB envelope overflow와 always artifact 저장 |
| `cacheManager`  | 세션/프롬프트 cache 관리                        |
| `configLoader`  | config v2와 managed rule document I/O           |

## Conventions

- machine path는 portable API로 계산하고 실제 filesystem effect만 host edge에 둔다.
- artifact는 compact JSON, SHA-256 content address와 atomic rename을 사용한다.

## Boundaries

### Always do

- cache는 `getCacheDir()`, tool artifact는 plugin cache `artifacts/` 아래만 저장
- source tree와 ephemeral artifact 경계를 분리

### Ask first

- cache/artifact 디렉터리나 retention 계약 변경

### Never do

- 프로젝트 source 또는 장기 설계 원장을 artifact store에서 수정
- artifact 존재를 영구 보존으로 표현

## Dependencies

- `../../types/`, `../../constants/`, `@ogham/cross-platform`
