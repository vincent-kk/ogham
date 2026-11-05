## Purpose

뷰어·설정 프런트엔드 소스 컨테이너. 런타임 TS export 가 없는 정적 FE 빌드 입력으로, esbuild 가 `public/` 산출물로 묶는다.

## Conventions

- 산출물은 런타임에 `mcp/httpServer` 가 디스크에서 읽어 서빙 (MCP 번들 미포함)
- 외부 CDN·동봉 폰트 금지 (KaTeX 는 MathML)

## Boundaries

### Always do

- 페이지 수정·추가는 [DESIGN.md](./DESIGN.md) 를 따른다
- FE 자산은 빌드 스크립트(`scripts/build*.mjs`)로만 `public/` 에 산출

### Ask first

- 새 페이지 추가 (빌드 파이프라인 영향)
- 외부 라이브러리 추가

### Never do

- 빌드 산출물(`public/*.html`, `public/assets/*`) 직접 수정
- 이 디렉토리에서 런타임 TS 심볼 export
