# @ogham/deilen — Spec Index

Claude Code 플러그인. Claude 가 생성한 markdown 문서를 로컬 HTTP 서버가 브라우저용 페이지로 렌더링해 가독성 있게 보여주고, 사용자가 **라인 단위로 코멘트(파일·클립보드 이미지 포함)** 를 달아 Claude 에게 되돌려주는 MCP·Skill 패키지.

- 패키지명: `@ogham/deilen` · 플러그인 이름: `deilen`
- 어원: Welsh _deilen_ "낱장(한 장·sheet)" — _dail_("잎·장들")의 단수형. 라인마다 코멘트를 붙이는 포스트잇 같은 한 장
- 빌드/디렉토리 패턴: `plugins/cennad/`, `plugins/filid/` 와 동일
- 로컬 웹 서버·설정 UI 패턴: `plugins/cennad/src/mcp/tools/openSettings/` 차용
- 뷰어·피드백 수거 패턴 참고: skill-creator `eval-viewer/` — 단, deilen 은 **자동 수거**를 위해 bounded long-poll 을 채택(skill-creator 는 사용자가 복귀해 알리는 수동 수거)

## 핵심 결정

- MCP 서버 이름: `tools` (cennad/atlassian 동일 컨벤션)
- Agent 없음. Hook 없음 (v1). 스킬 2개: `setup`, `display` (플러그인 prefix 미사용)
- 렌더 입력: `content` 또는 `path` **정확히 하나**(둘 다 주면 `invalid_input`)
- 피드백 수거: 논블로킹 `render_viewer` + bounded long-poll `collect_feedback` (자동 수거)
- 확장 렌더러(Mermaid / 코드 하이라이트 / 수식): **클라이언트 점진적 향상 + 동적 import lazy-load**
- 피드백 전송: `multipart/form-data` (텍스트 코멘트 + 파일/클립보드 이미지 Blob)
- Claude 반환: MCP image content 블록으로 스크린샷까지 전달
- 보안: 127.0.0.1 전용 + 동적 포트 + one-time token (cennad/atlassian 동일)
- 렌더러 적재: **전부 동봉 + lazy 서빙**(`bridge/assets/`) — MCP 런타임·브라우저 메모리엔 미포함, 비용은 설치 용량뿐
- 원본 복사: 서버 파싱 유지 + raw markdown 동봉(전체/섹션/코드블록 복사), 클라이언트 파싱 안 함
- 코멘트: 편집·삭제·resolve + 전체(라인 무관 `anchor:null`) 코멘트 지원
- 브라우저 패키지: MCP 서버와 **별도 esbuild(browser) 엔트리**로 번들(`bridge/assets/`), MCP 는 서빙만
- 런타임 안전성: HTTP 서버 싱글톤 + idle 자동종료, long-poll resolver 멱등 `settle()` + `extra.signal` 정리, 자체 경량 multipart 파싱, graceful shutdown — 누수 차단

## 문서

| 파일                                           | 내용                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| [spec.md](./spec.md)                           | 컴포넌트 책임, 데이터 흐름, 수거 메커니즘, 비채택 사항               |
| [architecture.md](./architecture.md)           | 패키지·src 트리 + 의존 방향(DAG) + 빌드 파이프라인                   |
| [mcp-runtime.md](./mcp-runtime.md)             | 런타임 생애주기·누수 방지 + 브라우저 자산 별도 번들·서빙             |
| [mcp-tools.md](./mcp-tools.md)                 | `render_viewer`, `collect_feedback`, `open_settings`, `close_viewer` |
| [rendering.md](./rendering.md)                 | markdown 파이프라인 + source-line 매핑 + 클라이언트 lazy-load        |
| [feedback-protocol.md](./feedback-protocol.md) | multipart 페이로드 스키마 + 클립보드 이미지 + long-poll 수거         |
| [web-ui.md](./web-ui.md)                       | 문서 뷰어 페이지 + 설정 UI + 라우트 + 보안                           |
| [skills.md](./skills.md)                       | `setup`, `display` 스킬 (display 의 poll 루프 지시 포함)             |
| [storage.md](./storage.md)                     | `~/.claude/plugins/deilen/` 디스크 레이아웃 + config 스키마          |
| [roadmap.md](./roadmap.md)                     | 단계별 구현 순서                                                     |
