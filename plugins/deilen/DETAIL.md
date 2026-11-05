# deilen — Contract

## Requirements

- Claude 가 만든 markdown 을 로컬 브라우저 페이지로 보여주고, 사용자가 라인에 남긴 코멘트를 대화로 되돌리는 것이 이 플러그인의 전부다.
- 서버는 `127.0.0.1` 에만 바인딩한다. 외부에서 접근할 수 있는 표면을 만들지 않는다.
- 디스크 경로는 `~/.claude/plugins/deilen/` 하위로 한정한다.
- 무거운 렌더러(mermaid·katex·highlight)는 브라우저 자산으로만 서빙하고 MCP 서버 번들에 넣지 않는다. 외부 CDN 과 동봉 폰트를 쓰지 않는다.
- `bridge/` 와 `public/` 은 커밋하는 빌드 산출물이며 손편집하지 않는다.
- Agent 와 hook 이 없다 — 표면은 MCP 도구 4개와 스킬 2개뿐이다.
- 페이지의 시각 언어는 `src/mcp/pages/DESIGN.md` 를 정본으로 삼는다.

## API Contracts

- 사용자 피드백을 대화에 되돌리는 책임은 유지하며, 별도 agent나 hook 표면을 도입하지 않는다. 도구와 스킬 등록 목록·빌드 순서는 매니페스트를 읽는다.

## Acceptance Criteria

### AC-viewer-persistence — 제출·종료 후 뷰어 보존

- 피드백이 수거된 뒤에도 뷰어 페이지는 남아 있고, 새로고침하면 제출 버튼이 비활성화된다.
- `close_viewer` 뒤에도 페이지는 보이며, 새로고침하면 제출이 비활성화된다.

### AC-viewer-draft-restore — 미전송 초안 보존

- 새로고침·페이지 이동 후 돌아와도 미전송 코멘트(첨부 포함)가 남아 있다.
- 서버에 in_progress 초안만 있는 세션도 새 브라우저에서 열면 그 코멘트가 보인다.
- 문서의 링크는 새 탭에서 열려 뷰어 페이지를 떠나지 않는다.

### AC-table-comment-highlight — 표 행 코멘트 시각화

- 표의 한 행에 코멘트를 달면 그 행의 셀들이 하이라이트된다.

### AC-divider-ornament — 구분선 장식

- `hr` 이 라이브 디자인 토큰에서 온 음각 divider 장식으로 렌더된다.

### AC-bundle-isolation — 번들 격리

- `bridge/mcp-server.cjs` 에 mermaid·katex·highlight 가 포함되지 않는다(빌드 가드가 강제).
- 페이지가 외부 호스트로 요청을 보내지 않는다.

## Last Updated

뷰어와 초안 보존·렌더러 격리·플러그인 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
