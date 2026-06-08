## Purpose

yt-dlp 바이너리를 안전하게 획득·실행하여 자막·트랜스크립트·메타데이터·댓글·썸네일·다운로드를 MCP 도구로 노출하는 서버.

## Structure

- `config/` — 환경변수 → 검증된 설정
- `paths/` — ~/.yt-dlp 경로·임시 디렉터리
- `domain/` — 도메인 타입과 에러 분류 (organ)
- `core/` — 캐시·동시성을 묶는 실행 서비스 (organ)
- `ytdlp/` — 바이너리 획득·실행·연산
- `mcp/` — 도구 정의·레지스트리·서버
- `postprocess/` — 자막/텍스트 후처리 (organ)
- `cache/` `obs/` `constants/` `utils/` — 보조 organ

## Boundaries

### Always do

- 실패는 타입이 있는 `YtDlpMcpError`로 표면화한다
- 신뢰 경계에서 yt-dlp 출력은 coerce 후 사용한다

### Ask first

- 새 MCP 도구나 최상위 모듈 추가
- 바이너리 획득·검증 정책 변경

### Never do

- 무음 `|| ''` fallback으로 에러를 숨긴다
- 체크섬 검증 없이 바이너리를 설치한다
