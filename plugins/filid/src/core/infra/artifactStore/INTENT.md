# artifactStore — ephemeral tool payloads

## Purpose

MCP payload를 16 KiB inline budget에 맞추고 overflow 또는 always-persist payload를 plugin cache의 content-addressed JSON artifact로 atomic 저장한다.

## Structure

- `artifactStore.ts` — payload byte budget, hash와 envelope materialization
- `serialization/` — artifact와 MCP transport가 공유하는 compact JSON serializer
- `operations/` — atomic host filesystem write/rename leaf organ
- `index.ts` — 세 public function의 named barrel

## Conventions

- compact UTF-8 JSON bytes를 예산과 SHA-256의 단일 입력으로 사용한다.
- artifact path는 `artifacts/<tool-name>/<sha256>.json`이다.
- 정적 media type, budget, algorithm과 persistence 값은 constants가 소유한다.

## Boundaries

### Always do

- 반환 metadata의 path, bytes와 hash를 실제 artifact content에 일치
- 실제 inline envelope를 byte-check하고 artifact write 전에 symlink descendant 차단
- parent directory 생성 후 temporary file을 atomic rename
- artifact를 ephemeral로 표시

### Ask first

- inline budget, artifact layout, media type 또는 retention 의미 변경

### Never do

- project source 아래 artifact 저장
- pretty JSON, mutable global cache 또는 장기 보존 보장
- payload data를 overflow envelope에 중복 inline

## Dependencies

- `../../../types/toolEnvelope.js`, `../../../constants/`, `@ogham/cross-platform`
