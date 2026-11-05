# mcp — DETAIL

## Requirements

- MCP 서버 이름 `tools`, stdio transport. 도구 4개 등록.
- 모든 핸들러는 `wrapHandler` 로 감싸 throw 흡수 + `extra`(signal) 전달.
- 장수 HTTP 서버를 호스팅하되, 무거운 렌더러는 `public/assets/` 자산으로만 서빙(번들 미포함).
- HTTP 라우트는 loopback 전용이며 공개 렌더러 자산 외에는 token으로 보호한다. JSON·multipart POST는 CSRF 검증을 거친다.

## API Contracts

- 문서 입력은 content와 path 중 정확히 하나이며 크기 상한을 지킨다. 상대경로는 워크스페이스 기준이다.
- 피드백은 bounded long-poll이다. 기본 대기는 리뷰 1회를 한 호출로 덮도록 정하며, 대기 상한은 호스트의 stdio idle window 안에 둔다.
- `unknown`·`closed` 세션은 throw하고 요청 취소 신호는 대기 정리까지 전달한다.
- `project_root`는 Claude에서는 생략 가능하지만 설치 디렉터리에서 기동하는 호스트에서는 필요하다. 조용한 cwd fallback을 하지 않으며 서버 기동 전에 해석해 세션 해시와 서버 스코프를 일치시킨다.
- 외부 도구 키는 snake_case로 유지한다. 상세 입출력은 등록 스키마와 도구 구현을 읽는다.

## Acceptance Criteria

### AC-tool-registration — 도구 등록 일관성

- 도구 4개가 등록되고 응답 envelope 가 일관된다.
- 모든 `registerTool` 콜백이 `wrapHandler` 를 거친다.

### AC-bundle-guard — 번들 격리

- `mcp-server.cjs` 에 mermaid·katex·highlight 가 번들되지 않는다(빌드 가드가 강제).

### AC-viewer-serving — 뷰어 서빙

- 뷰어 HTML 이 `__DEILEN_STATE__` 주입과 함께 서빙된다.

## Last Updated

도구 스코프·유계 대기·서버와 브라우저 자산 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
