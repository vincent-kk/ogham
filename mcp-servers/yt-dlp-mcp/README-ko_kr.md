# @ogham/yt-dlp-mcp

> YouTube를 비롯해 [yt-dlp](https://github.com/yt-dlp/yt-dlp)가 지원하는 모든 사이트에서 **자막·메타데이터·댓글·챕터·미디어**를 추출해 Claude Desktop, Cursor 등 MCP 앱으로 바로 가져오는 MCP 서버입니다.

Python, `brew`, `pip`, yt-dlp 자체를 따로 설치할 필요가 없습니다. 첫 요청이 들어오면 서버가 자체 yt-dlp 바이너리를 `~/.yt-dlp/`에 조용히 내려받아(체크섬 검증 포함) 이후 계속 재사용합니다. Windows, macOS, Linux에서 동작합니다.

## 무엇을 할 수 있나요

- **영상을 보지 않고 읽기** — 깔끔한 자막 텍스트, 메타데이터 요약, 챕터, "가장 많이 다시 본" 히트맵을 가져옵니다.
- **검색과 둘러보기** — 키워드로 영상을 찾거나, 재생목록·채널의 모든 항목을 나열합니다.
- **댓글 훑어보기** — 댓글을 JSON 또는 읽기 쉬운 스레드 형태로 추출합니다.
- **미디어 저장** — 영상, 오디오만, 또는 썸네일을 내려받습니다(기본 비활성화 — [도구 켜고 끄기](#도구-켜고-끄기) 참조).

모든 기능은 사용 중인 MCP 앱의 도구 목록을 통해 동작하며, 터미널이나 셸 접근이 전혀 필요 없습니다.

## 빠른 시작

MCP 앱 설정에 서버를 추가한 뒤(Claude Desktop이라면 `claude_desktop_config.json`) 앱을 재시작합니다. **아래 세 가지 템플릿 중 하나를 복사해 시작하세요.** `env` 값은 언제든 바꾸고 재시작하면 됩니다.

첫 도구 호출 시 yt-dlp 바이너리를 한 번 내려받으므로(모든 인스턴스가 공유) 몇 초가 더 걸릴 수 있지만, 이후 호출부터는 빠릅니다.

### 템플릿 1 · 최소

기본 도구 4개만 사용합니다: 검색, 자막 언어, 스크립트, 메타데이터. 켤 것이 없습니다.

```jsonc
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": ["-y", "@ogham/yt-dlp-mcp"],
    },
  },
}
```

### 템플릿 2 · 읽기 및 리서치

읽기 전용 도구를 모두 추가합니다 — 메타데이터 요약, 원본 자막, 댓글, 챕터, 히트맵, 재생목록. 디스크에 아무것도 쓰지 않으며 **ffmpeg가 필요 없습니다.** 영상 리서치·질의응답에 적합한 기본 구성입니다.

```jsonc
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": ["-y", "@ogham/yt-dlp-mcp"],
      "env": {
        "YTDLP_ENABLE_METADATA_SUMMARY": "1",
        "YTDLP_ENABLE_SUBTITLES": "1",
        "YTDLP_ENABLE_COMMENTS": "1",
        "YTDLP_ENABLE_CHAPTERS": "1",
        "YTDLP_ENABLE_HEATMAP": "1",
        "YTDLP_ENABLE_PLAYLIST": "1",
      },
    },
  },
}
```

### 템플릿 3 · 전체

영상 / 오디오 / 썸네일 다운로드를 포함한 모든 도구. 먼저 `PATH`에 [**ffmpeg**](https://ffmpeg.org/download.html)를 설치하세요 — 오디오 추출과 잘라내기에 필요합니다. 다운로드 전에 [법적 고지](#법적-고지)를 확인하세요.

```jsonc
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": ["-y", "@ogham/yt-dlp-mcp"],
      "env": {
        "YTDLP_ENABLE_ALL": "1",
      },
    },
  },
}
```

## 도구

**4개 도구는 항상 켜져 있습니다.** 나머지는 환경변수로 켜기 전까지 숨겨져 있어, 앱의 도구 목록이 짧고 깔끔하게 유지됩니다.

### 항상 사용 가능

| 도구                            | 설명                                                                  | 주요 옵션                                                                                                |
| ------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `ytdlp_search_videos`           | 키워드로 YouTube 검색(페이지네이션·업로드 날짜 필터 지원).            | `query`, `maxResults`(1–50, 기본 10), `offset`, `uploadDateFilter`(`hour`/`today`/`week`/`month`/`year`) |
| `ytdlp_list_subtitle_languages` | 영상에 있는 자막 언어 목록(수동 + 자동 생성).                         | `url`                                                                                                    |
| `ytdlp_download_transcript`     | 영상 자막에서 깔끔하게 읽히는 플레인 텍스트 스크립트를 가져옵니다.    | `url`, `language`(기본 `en`), `timestamps`, `stripArtifacts`                                             |
| `ytdlp_get_video_metadata`      | 정제된 영상 메타데이터를 JSON으로 반환(제목·조회수·길이·업로드일 등). | `url`, `fields`(원하는 키만 선택)                                                                        |

### 선택 활성화(환경변수로 켜기)

| 도구                               | 켜는 변수                       | 설명                                                                                                                              |
| ---------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ytdlp_get_video_subtitles`        | `YTDLP_ENABLE_SUBTITLES`        | 타임스탬프가 보존된 원본 자막(자막 cue 한 줄당 한 행).                                                                            |
| `ytdlp_get_video_metadata_summary` | `YTDLP_ENABLE_METADATA_SUMMARY` | 영상 핵심 메타데이터를 사람이 읽기 좋게 요약.                                                                                     |
| `ytdlp_get_comments`               | `YTDLP_ENABLE_COMMENTS`         | 댓글을 JSON 또는 AI 친화적 스레드 Markdown으로 추출.                                                                              |
| `ytdlp_get_comments_summary`       | `YTDLP_ENABLE_COMMENTS`         | 인기 댓글을 빠르게 읽을 수 있는 요약본.                                                                                           |
| `ytdlp_get_chapters`               | `YTDLP_ENABLE_CHAPTERS`         | 영상 챕터 목록(시작 시간이 있는 구간 마커).                                                                                       |
| `ytdlp_get_heatmap`                | `YTDLP_ENABLE_HEATMAP`          | "가장 많이 다시 본" 히트맵(구간별 참여 점수).                                                                                     |
| `ytdlp_get_thumbnail` 💾           | `YTDLP_ENABLE_THUMBNAIL`        | 썸네일을 JPG로 다운로드 폴더에 저장.                                                                                              |
| `ytdlp_download_video` 💾          | `YTDLP_ENABLE_DOWNLOAD`         | 영상 파일 다운로드. 옵션: `resolution`(`480p`/`720p`/`1080p`/`best`), 잘라내기용 `startTime`/`endTime`. 잘라내기에는 ffmpeg 필요. |
| `ytdlp_download_audio` 💾          | `YTDLP_ENABLE_DOWNLOAD`         | 오디오 트랙만 다운로드. 옵션: `audioFormat`(`m4a`/`mp3`). ffmpeg 필요.                                                            |
| `ytdlp_get_playlist`               | `YTDLP_ENABLE_PLAYLIST`         | 재생목록·채널의 항목 나열. 옵션: `limit`.                                                                                         |

> 💾 = 디스크에 파일을 씁니다. 다운로드 도구는 대상 플랫폼의 이용약관과도 관련됩니다 — [법적 고지](#법적-고지) 참조.

## 도구 켜고 끄기

[위 템플릿](#빠른-시작)이 일반적인 경우를 대부분 다룹니다. 도구를 개별적으로 고르려면 `env` 블록 안에서 각 도구의 `YTDLP_ENABLE_*` 변수([도구 토글](#도구-토글) 참조)를 설정하세요:

- `1`(또는 `true` / `yes` / `on`)로 설정하면 도구가 등록됩니다.
- 설정하지 않으면 숨겨진 상태로 둡니다.
- `YTDLP_ENABLE_ALL=1`로 설정하면 모든 도구가 한 번에 등록됩니다.

값을 변경한 뒤에는 MCP 앱이 도구 목록을 다시 읽도록 앱을 재시작하세요.

## 환경설정

모든 설정은 위 `env` 블록의 환경변수로 이루어지며, 편집할 설정 파일은 없습니다. **모두 선택 사항**이고, 기본값은 일상적인 사용에 적합하게 맞춰져 있습니다. 전체 변수 목록은 [`.env.example`](./.env.example)에도 들어 있습니다.

### 도구 토글

| 변수                            | 등록되는 도구                                      |
| ------------------------------- | -------------------------------------------------- |
| `YTDLP_ENABLE_SUBTITLES`        | `ytdlp_get_video_subtitles`                        |
| `YTDLP_ENABLE_METADATA_SUMMARY` | `ytdlp_get_video_metadata_summary`                 |
| `YTDLP_ENABLE_COMMENTS`         | `ytdlp_get_comments`, `ytdlp_get_comments_summary` |
| `YTDLP_ENABLE_CHAPTERS`         | `ytdlp_get_chapters`                               |
| `YTDLP_ENABLE_HEATMAP`          | `ytdlp_get_heatmap`                                |
| `YTDLP_ENABLE_THUMBNAIL`        | `ytdlp_get_thumbnail`                              |
| `YTDLP_ENABLE_DOWNLOAD`         | `ytdlp_download_video`, `ytdlp_download_audio`     |
| `YTDLP_ENABLE_PLAYLIST`         | `ytdlp_get_playlist`                               |
| `YTDLP_ENABLE_ALL`              | 위의 모든 도구                                     |

### 파일이 저장되는 위치

| 변수                  | 기본값                  | 용도                                          |
| --------------------- | ----------------------- | --------------------------------------------- |
| `YTDLP_HOME`          | `~/.yt-dlp`             | 바이너리·임시 작업 공간·다운로드의 루트 폴더. |
| `YTDLP_DOWNLOADS_DIR` | `$YTDLP_HOME/downloads` | 다운로드 저장 폴더만 따로 지정.               |

### 바이너리 획득

서버가 자체 yt-dlp 바이너리를 관리하며, 아래 변수로 선택·갱신 방식을 제어합니다.

| 변수                   | 기본값 | 용도                                                     |
| ---------------------- | ------ | -------------------------------------------------------- |
| `YTDLP_COOLDOWN_DAYS`  | `3`    | 이 일수보다 오래된 yt-dlp 릴리스만 채택(공급망 안전성).  |
| `YTDLP_REFRESH_DAYS`   | `7`    | 이 일수가 지나면 새 바이너리가 있는지 다시 확인.         |
| `YTDLP_PINNED_VERSION` | —      | 정확한 yt-dlp 릴리스 태그 하나로 고정(예: `2025.01.01`). |

### 응답 크기 및 타임아웃

| 변수                          | 기본값  | 용도                                           |
| ----------------------------- | ------- | ---------------------------------------------- |
| `YTDLP_TIMEOUT_MS`            | `90000` | 단일 추출 작업의 시간 예산(밀리초).            |
| `YTDLP_CHARACTER_LIMIT`       | `25000` | 일반 도구 응답이 잘리기 전까지의 최대 글자 수. |
| `YTDLP_MAX_TRANSCRIPT_LENGTH` | `50000` | 자막/스크립트 응답의 최대 글자 수.             |

### 로깅

| 변수              | 기본값 | 용도                                                                                        |
| ----------------- | ------ | ------------------------------------------------------------------------------------------- |
| `YTDLP_LOG_LEVEL` | `info` | `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent`. 로그는 stderr로만 출력됩니다. |

### 레이트 리밋 및 프록시

| 변수                         | 기본값 | 용도                                                                                                    |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `YTDLP_PROXY_POOL`           | —      | 콤마로 구분된 프록시 URL 목록(요청마다 순환). 레이트 리밋에 가장 효과적.                                |
| `YTDLP_PROXY`                | —      | 단일 프록시 URL(풀이 없을 때 사용).                                                                     |
| `YTDLP_MAX_CONCURRENCY`      | 적응형 | 동시에 실행하는 yt-dlp 프로세스 수(1–16). 아래 참조.                                                    |
| `YTDLP_REQUEST_INTERVAL_MS`  | 적응형 | 일반 호출 사이의 최소 간격. 아래 참조.                                                                  |
| `YTDLP_SUBTITLE_INTERVAL_MS` | 적응형 | 자막/스크립트 호출 사이의 최소 간격. 아래 참조.                                                         |
| `YTDLP_COOKIES_FROM_BROWSER` | —      | 로컬 브라우저 프로필에서 쿠키를 읽음(`BROWSER[:PROFILE][::CONTAINER]`, 예: `chrome`). 인증 게이트 전용. |
| `YTDLP_COOKIES_FILE`         | —      | Netscape 형식 쿠키 파일 경로. 브라우저 옵션보다 우선합니다.                                             |

## 레이트 리밋 및 차단 회피

YouTube는 IP 주소 단위로 레이트 리밋을 걸며, 그 제한은 시간이 지날수록 누적됩니다. 자막·스크립트 엔드포인트가 가장 엄격하고, 한 번 제한에 걸리면 몇 분에서 길게는 약 하루까지 지속될 수 있습니다. 도구 응답에 `[RATE_LIMITED]`나 `[BLOCKED]`가 보이면, 효과가 큰 순서대로 다음을 시도하세요:

1. **회전 프록시 풀 사용(가장 효과적).** `YTDLP_PROXY_POOL`에 콤마로 구분된 프록시 URL 목록을 설정합니다. 서버가 요청마다 순환하며 부하를 여러 IP에 분산시킵니다. 단일 `YTDLP_PROXY`는 더 가벼운 대안입니다.

2. **서버의 자동 속도 조절에 맡기기(자동).** 서버는 이미 폭주를 큐에 담아 요청 간격을 벌립니다. 단발 호출은 즉시 처리됩니다. 이 속도 조절은 프록시 설정 여부에 따라 **자동으로 적응**합니다. 어떤 값이든 직접 덮어쓸 수 있지만, 그럴 필요는 거의 없습니다:

   | 프록시 구성     | `YTDLP_MAX_CONCURRENCY` | `YTDLP_REQUEST_INTERVAL_MS` | `YTDLP_SUBTITLE_INTERVAL_MS` |
   | --------------- | ----------------------- | --------------------------- | ---------------------------- |
   | 없음            | 1                       | 1500                        | 4000                         |
   | 단일 프록시     | 2                       | 750                         | 2000                         |
   | 프록시 풀 (N개) | `min(N, 8)`             | 0                           | 250                          |

3. **쿠키는 로그인 장벽용이지 레이트 리밋용이 아닙니다.** `YTDLP_COOKIES_FROM_BROWSER` / `YTDLP_COOKIES_FILE`는 연령 제한·멤버 전용·로그인 필요 영상을 열어 줍니다. 자막 레이트 리밋에는 거의 도움이 되지 않으니, 그때는 프록시 풀을 사용하세요.

`[BLOCKED]` 봇 검사는 종종 Proof-of-Origin(PO) 토큰을 필요로 하는데, 보통 쿠키보다 깨끗한 프록시 IP가 더 안정적으로 이를 통과합니다.

## 보안 및 신뢰성

- **검증된 다운로드.** yt-dlp 바이너리는 쿨다운(`YTDLP_COOLDOWN_DAYS`)이 지난 뒤에만 채택되며, 릴리스의 공식 `SHA2-256SUMS`로 검증됩니다. 불일치하면 폐기하고, 최신 `releases/latest`를 검증 없이 받아오지 않습니다.
- **안전한 설치.** 바이너리는 임시 파일로 내려받아 체크섬을 검증한 뒤 원자적으로 교체됩니다. 프로세스 간 잠금으로 중복·부분 다운로드를 방지합니다.
- **격리.** 추출은 작업 후 정리되는 일회용 임시 폴더에서 이루어지고, 저장 파일은 `~/.yt-dlp` 아래에만 남습니다. 도구는 정해진 옵션만 받으며, 내부 yt-dlp 명령 플래그는 서버가 제어하므로 임의의 셸 명령을 주입할 수 없습니다.

## 법적 고지

쿠키·프록시·다운로드/썸네일 기능은 **기본적으로 꺼져 있습니다.** 이들을 켜면 대상 플랫폼의 이용약관과 현지 법률(스크래핑 규정, DMCA §1201, 저작권)에 관련될 수 있습니다. 이 서버를 어떻게 설정하고 사용하는지는 사용자 본인의 책임이며, 저작권과 플랫폼 약관을 존중해 주시기 바랍니다.

## 라이선스

MIT
