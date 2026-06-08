## Purpose

자막/캡션 도메인 수직 슬라이스. transcript·subtitles·list-subtitle-languages 도구와 추출 operation, 자막 전용 후처리를 한 모듈에 응집한다.

## Structure

| 파일/디렉터리          | 역할                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| `index.ts`             | barrel: 3개 도구 재노출                                                      |
| `tools/` (organ)       | MCP 도구 정의(transcript, subtitles, list-subtitle-languages)                |
| `operations/` (organ)  | yt-dlp 추출(transcript, subtitles, list-subtitles) + 파서(json3, 파일, 메타) |
| `postprocess/` (organ) | 자막 전용 후처리(segments-to-text, ad-stripper)                              |

## Conventions

- 도구는 공용 `handleToolExecution`(`mcp/tools`)으로 감싸고, `service.execute`에 `throttle: 'subtitle'`로 자막 페이싱을 선언한다.
- 추출 결과는 `domain/types`의 공유 타입으로 반환한다(슬라이스 내부에 복제하지 않는다).
- `transcript` 도구는 본문 텍스트를 `structuredContent.transcript`로도 노출한다.
- `list-subtitles`만 공용 `info-json`을 쓰고, transcript/subtitles는 json3+파일 추출로 자기완결한다.

## Boundaries

### Always do

- 자막 호출은 `throttle: 'subtitle'`로 페이싱한다
- 추출 실패는 타입드 `YtDlpMcpError`로 표면화한다

### Ask first

- 새 자막 도구 추가

### Never do

- cache-key 접두를 바꿔 자막 페이싱을 깨뜨린다

## Dependencies

- 내부: `mcp/tools`(공용 래퍼), `core/service`, `ytdlp/operations`(context·info-json), `postprocess/format-timestamp`, `domain`, `utils`, `constants`, `paths`
- 소비처: `features`(barrel)
