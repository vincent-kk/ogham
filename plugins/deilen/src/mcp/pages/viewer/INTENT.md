# viewer — 문서 뷰어 프런트엔드

## Purpose

문서 뷰어 프런트엔드. 렌더된 HTML 을 마운트하고 테마·복사·라인 단위 코멘트를 제공하며, 무거운 렌더러는 lazy-load 한다. 빌드 시 단일 `public/viewer.html` 로 inline+minify 되므로 이 트리가 소스이고 `public/` 은 산출물이다.

## Conventions

- 모든 fetch 는 `?token=` 부착 (state 의 token); POST body 는 JSON 또는 multipart(이미지)
- 무거운 렌더러는 별도 asset chunk 로 lazy — 실패 시 읽을 수 있는 source fallback 유지
- 동봉 폰트 없음: KaTeX 는 MathML, highlight 는 page CSS, mermaid 는 SVG
- `prefers-reduced-motion`·`prefers-color-scheme` 존중
- 코멘트 편집 중에는 열린 composer 가 원본 카드를 대신한다 (목록에서 숨김, 닫히면 복귀)
- 초안은 `localStorage` 키 `deilen:draft:<session_id>` 에 저장한다(첨부는 dataURL, 총량 상한 초과 시 텍스트만). 로드 시 localStorage → 서버 `draft` 순으로 복원하고 제출·dismiss 시 삭제하며 `session_ttl_hours` 초과분은 로드 시 prune 한다. 초안 저장소 모듈은 저장소 경계의 가드 헬퍼를 여럿 품는다(의도된 예외).
- 푸터 제출은 2 의도(`revise`/`discuss`, 동일 스타일·disabled 만 색조 구분) + 상단바 Close(`dismiss`). 코멘트 하이라이트는 앰버(`--mark`), 작성 중은 더스티 로즈(`--pending`); 크롬은 모노크롬 잉크(`--accent`=글자색), 보르도 `--seal` 은 브랜드 마크·전송 완료 아이콘 전용 — 정본 [`DESIGN.md`](../DESIGN.md)

## Boundaries

### Always do

- 무거운 렌더러는 lazy chunk 로 분리 (MCP 번들·HTML inline 금지)
- fetch 에 `?token=` 부착

### Ask first

- 새 lazy 렌더러·스크립트 추가
- 외부 라이브러리 추가

### Never do

- `eval`·inline 핸들러·외부 origin fetch
- 빌드 산출물(`public/viewer.html`, `public/assets/*`) 직접 수정
