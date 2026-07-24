# mcp — 상태기계, 도구상자 아님

## Purpose

seiri 의 MCP 계층. 나가는 것은 도구 스키마가 아니라 **상태의 렌더**다 —
어떤 규칙이 배포됐고 다이얼이 어디 있는지. 복잡성은 코드 안에 격리하고,
컨텍스트로 나가는 표면은 도구 2개로 고정한다.

## Structure

```
server/       MCP 서버 조립 + 도구 등록
serverEntry/  stdio 진입점 (bridge/mcp-server.cjs 의 번들 대상)
tools/        openSettings (대화형) · ruleDocsSync (헤드리스 폴백)
pages/        설정 UI 정적 자산 (빌드가 public/settings.html 로 인라인)
```

## Conventions

- 서버 키는 `.mcp.json` 의 `tools` — 소비처는 full-form
  `mcp__plugin_seiri_tools__<name>` 로 참조한다. short-form 은 서브에이전트에서
  해석되지 않는다.
- 프로젝트 루트는 `@ogham/cross-platform/host-paths` 의 `projectRoot(path?)`,
  플러그인 루트는 `pluginRoot()`. 미해석 시 `process.cwd()` 폴백 금지.
- 로컬 서버 가드는 `@ogham/http-guard` 재사용 — 토큰·Origin 검증을 재구현하지
  않는다.
- 도구 응답은 `wrapHandler` 를 통해 compact JSON 으로 직렬화하고, throw 는
  모델이 읽을 수 있는 오류 결과로 바꾼다.

## Boundaries

### Always do

- 새 도구를 고민할 때 먼저 "하니스가 이미 갖고 있지 않은가"를 답할 것.
- 규칙 파일 쓰기는 사용자의 명시적 확인 뒤에만.

### Ask first

- 도구 추가 — 스키마는 호출 여부와 무관하게 매 턴 컨텍스트 비용이다.
- 도구 입출력 형태 변경 (스킬 계약).

### Never do

- 코드 검색·분석·읽기 도구 추가 (하니스 소관).
- `127.0.0.1` 외 주소 바인딩.
- 세션 훅에서 MCP 도구 호출.
