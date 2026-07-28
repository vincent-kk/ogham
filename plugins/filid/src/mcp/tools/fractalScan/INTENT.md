# fractalScan — snapshot tree summary

## Purpose

등록 adapter로 하나의 project snapshot을 만들고 기본적으로 작은 FCA tree
summary를 공통 envelope로 반환한다.

## Structure

- `fractalScan.ts` — snapshot과 summary/path/full projection
- `utils/` — snapshot을 summary/path/full DTO로 투영하는 flat organ
- `index.ts` — named handler export

## Conventions

- default detail은 `summary`, full payload는 envelope budget에 맡긴다.
- tree Map은 MCP data로 직접 노출하지 않고 flat node DTO로 변환한다.

## Boundaries

### Always do

- config와 adapter registry를 통해 snapshot을 한 번 생성
- unsupported/indeterminate diagnostics와 status 보존

### Ask first

- detail projection 또는 summary count 의미 변경

### Never do

- 별도 scan-specific overflow file 작성
- project source/config 수정
- 언어 확장자나 entry filename 추측

## Dependencies

- core projectSnapshot, adapters와 common tool envelope
