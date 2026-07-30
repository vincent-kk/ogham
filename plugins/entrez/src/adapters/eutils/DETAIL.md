# eutils — Contract

## Requirements

- E-utility 하나에 파일 하나다. 각 어댑터는 `operations/` 안에 있고 배럴만이 외부 경계다.
- 모든 HTTP 는 `httpRequest`(DI deps) 를 거친다 — 직접 `fetch` 를 부르지 않는다.
- 각 어댑터는 `fn(args, deps)` 형태의 호출 함수와 `parseXxx(text)` 순수 파서를 함께 노출한다. 파서는 네트워크 없이 fixture 로 검증된다.
- 응답은 도메인 타입으로 변환해 돌려준다 — 원시 XML·JSON 을 상위로 흘리지 않는다.

## API Contracts

- `esearch` / `parseEsearch` — ESearch(JSON): count·UID·QueryTranslation·WebEnv.
- `efetch` / `parseEfetch` — EFetch(XML): 구조화 저자·MeSH·abstract·doi·pmcid.
- `esummary` / `parseEsummary` — ESummary(JSON): 경량 메타.
- `espell` / `parseEspell` — ESpell(XML): 교정어.
- `elink` / `parseElink` — ELink(JSON): Similar Articles.
- `idconv` / `parseIdConv` — PMID↔PMCID↔DOI 변환(PMC utils 호스트).
- `oaService` / `parseOa` — oa.fcgi(XML): OA 여부·license·format 링크.

## Acceptance Criteria

### AC-parser-purity — 파서 순수성

- 모든 `parseXxx` 가 네트워크 없이 fixture 문자열만으로 검증된다.

### AC-http-single-path — HTTP 단일 경로

- `operations/` 안 어떤 파일도 `fetch` 를 직접 호출하지 않는다.

## Last Updated

2026-07-30 — 어댑터 구현을 `operations/` organ 으로 내리고 계약을 문서화했다.
