# `@kimtaeyoon83/mcp-server-youtube-transcript` 로직 구조 심층 분석

> 분석 대상: 현재 리포지토리 (`src/index.ts` 367줄, `src/youtube-fetcher.ts` 403줄)
> 분석 일자: 2026-06-07

## 1. 전체 아키텍처 — 2계층 분리

코드는 명확하게 **2개의 책임 계층**으로 나뉜다.

| 계층 | 파일 | 책임 |
|------|------|------|
| **MCP 프로토콜 계층** | `src/index.ts` | 툴 정의·스키마, 입력 검증, ID 추출, 포맷팅, MCP 응답 조립 |
| **데이터 페칭 계층** | `src/youtube-fetcher.ts` | YouTube와의 실제 통신, HTML 스크래핑, 내부 API 호출, 파싱 |

- `index.ts`는 `getSubtitles()` 하나만 import (`index.ts:13`)하여 페칭 계층에 의존하고, 페칭 계층은 MCP를 전혀 모른다.
- YouTube 통신 로직이 MCP와 완전히 디커플링되어 독립 재사용 가능 (`getAvailableLanguages()` 별도 export — `youtube-fetcher.ts:260`).

클래스 구성:
- **`TranscriptServer`** (`index.ts:211`): MCP 서버 래퍼. stdio 트랜스포트 연결, 핸들러 등록, 에러 핸들링, SIGINT graceful shutdown.
- **`YouTubeTranscriptExtractor`** (`index.ts:68`): ID 추출 + 페칭 계층 호출 + 텍스트 포맷팅.

## 2. 가장 중요한 설계 결정 — "외부 의존성 제로"

git 이력이 핵심 전환점을 보여준다.

```
f6d01b6 feat: Add YouTube transcript server          ← 최초: youtube-captions-scraper 사용
ebbda32 fix: replace youtube-captions-scraper with youtubei API   ← 핵심 전환
89799e0 Fix FAILED_PRECONDITION errors by using ANDROID client     ← 차단 우회
6db1091 Fix ANDROID text extraction for elementsAttributedString
```

초기엔 `youtube-captions-scraper`에 의존했으나, 이를 버리고 YouTube 내부 API(InnerTube)를 직접 호출하도록 재작성. 결과적으로 `youtube-fetcher.ts`의 import는 Node 내장 `https` **단 하나뿐** (`youtube-fetcher.ts:1`).

**트레이드오프**
- 장점: 의존성 취약점·공급망 리스크 없음, 번들 경량, 동작 완전 제어.
- 단점: YouTube가 내부 API/HTML 구조를 바꾸면 직접 깨짐. `youtube-fetcher.ts:39`에 *"버전들은 YouTube가 구버전 클라이언트를 거부하기 시작하면 주기적 업데이트 필요"* TODO 존재.

## 3. 핵심 흐름 — 2단계 페칭(Two-Phase Fetch)

```
[1단계] GET www.youtube.com/watch?v={id}   (WEB 클라이언트로 위장)
        └─ getPageData(): HTML 정규식 스크래핑
           ├─ visitorData      (2단계 인증에 필요)
           ├─ clientVersion
           ├─ availableLanguages  (자막 트랙 목록)
           ├─ adChapters          (광고 챕터)
           └─ metadata            (제목/작성자/구독자/조회수/날짜)

[2단계] POST www.youtube.com/youtubei/v1/get_transcript   (ANDROID 클라이언트로 위장)
        └─ getSubtitles(): 실제 자막 세그먼트 수신·파싱
```

- **왜 1단계가 필요한가**: 2단계 내부 API는 `visitorData`(세션 식별자)를 요구 (`youtube-fetcher.ts:286,321`). 이 값은 watch 페이지 HTML에만 있음. 1단계에서 자막 목록·챕터·메타데이터까지 한 번에 회수.
- 두 단계가 서로 다른 클라이언트로 위장: 1단계 `WEB_USER_AGENT`(Chrome, `:137`), 2단계 `ANDROID_USER_AGENT`(`:337`).

## 4. 자막 조회 심층 분석 (`getSubtitles`)

### 4-1. Protobuf `params`를 직접 손으로 인코딩
`/youtubei/v1/get_transcript`가 요구하는 불투명한 base64 `params`는 사실 protobuf 바이너리. 외부 라이브러리 없이 바이트를 직접 조립 (`buildParams`, `youtube-fetcher.ts:63`).

중첩 구조(inner → outer):
```
inner (언어 지정):
  0x0a 0x03 "asr"     → Field 1 = "asr"(자동음성인식)
  0x12 <len> <lang>   → Field 2 = 언어코드
  0x1a 0x00           → Field 3 = 빈 문자열
  → base64 → URL 인코딩 → outer Field 2

outer:
  0x0a <len> <videoId>  → Field 1 = 비디오 ID
  0x12 <len> <inner>    → Field 2 = inner
  0x18 0x01             → Field 3 = 1
  0x2a <len> "engagement-panel-searchable-transcript-search-panel" → Field 5
  0x30/0x38/0x40 0x01   → Field 6,7,8 = 1
```
- 바이트 의미: `0x0a`=(field1<<3)|2(length-delimited), `0x18`=(field3<<3)|0(varint) 등.
- `encodeVarint`(`:50`)는 길이 >127 대비 multi-byte varint(LEB128). inner를 base64+URL인코딩하면 127B를 넘길 수 있어 실제 필요.

### 4-2. ANDROID 클라이언트 위장 — 차단 우회
페이로드 `context.client` (`:313-325`)에서 `clientName: 'ANDROID'`, `clientVersion: '19.29.37'`, `androidSdkVersion: 30`. 주석(`:310-311`)이 명시: **ANDROID 클라이언트는 poToken A/B 테스트 강제를 우회**. WEB 호출 시 `FAILED_PRECONDITION`(poToken 요구) 발생 → 모바일 앱 위장으로 회피. 커밋 `89799e0`이 해당 지점.

### 4-3. WEB / ANDROID 이중 응답 포맷 핸들링
응답 구조가 일정하지 않아 두 경로 모두 파싱 (`:360-367`):
```js
webSegments = json.actions[0].updateEngagementPanelAction.content.transcriptRenderer...initialSegments
androidSegments = json.actions[0].elementsCommand.transformEntityCommand...overwrite.initialSegments
const segments = webSegments || androidSegments || [];
```
텍스트 추출도 이중 대응(`:380-382`): WEB `snippet.runs[].text` join / ANDROID `snippet.elementsAttributedString.content`. `webText || androidText || ''` 폴백. 섹션 헤더 세그먼트는 `.filter`로 제거(`:375`). `{text, start(s), dur(s)}`로 정규화(`:384-391`).

### 4-4. 언어 폴백 3단계 로직 (`:288-308`)
1. 요청 언어가 목록에 있으면 그대로
2. 없고 fallback이면 영어(`en`) 우선
3. 영어도 없으면 목록 첫 번째 언어
4. fallback=false & 요청 언어 없음 → 가용 언어 목록과 함께 에러

`actualLang` vs `requestedLang`을 둘 다 반환 → 상위 계층(`index.ts:289-291`)이 폴백 안내 부착.

## 5. 메타데이터 조회 심층 분석 (`getPageData`, `:127-246`)

정규식 기반 HTML 스크래핑. watch 페이지의 `ytInitialData`/`ytInitialPlayerResponse` JSON을 **JSON 파싱 없이 정규식으로 직접 추출**.

| 항목 | 위치 | 방식 |
|------|------|------|
| visitorData | `:145` | `"visitorData":"([^"]+)"` |
| clientVersion | `:153` | `"clientVersion":"([\d.]+)"` |
| 자막 트랙 | `:158` | `captionTracks` 배열 매칭 → 이 부분만 `JSON.parse` |
| 챕터 | `:186` | `chapterRenderer`+`simpleText`+`timeRangeStartMillis`를 `matchAll` |
| 제목 | `:215` | `"videoDetails":\{.*?"title":"([^"]+)"` |
| 작성자 | `:216` | videoDetails 블록 내 author |
| 구독자수 | `:217` | `subscriberCountText...accessibilityData.label` |
| 조회수 | `:218` | `"viewCount":"(\d+)"` |
| 게시일 | `:219` | `"publishDate":"([^"]+)"` |

- 제목/작성자에 `videoDetails` 앵커 + `.*?`(non-greedy) → 추천영상 등 오매칭 방지(`:215-216`).
- **취약점**: 자막 트랙 `(\[[^\]]+\])`(`:158`)는 `]` 미포함 가정. 내부에 `]`가 있으면 매칭 잘림.

**후처리(표시용 압축)**
- 구독자수(`:222-223`): `"649 thousand subscribers"` → `"649k"`. 로케일 의존(`Accept-Language: en-US`로 영어 유도, `:138`).
- 조회수(`:226-231`): `22205` → `"22.2k"`, `Number.isNaN` 방어.
- 게시일(`:234-235`): ISO → `YYYY-MM-DD`(`split('T')[0]`).
- 최종 한 줄 요약(`index.ts:309`): `제목 | 작성자 | 649k subs | 22.2k views | 2025-12-03`.

## 6. 광고 필터링 로직 (Smart Ad Stripping)

### 6-1. 챕터 → 광고 챕터 변환 (`:177-212`)
다국어 광고 마커 사전(독: werbung/anzeige/reklame, 영: ad/sponsor/promo 등, 괄호·대괄호 변형, `:178-183`). 챕터 제목 소문자화 후 마커 포함 여부로 `isAd` 판정(`:197`).
- **종료 시각 계산**(`:203-205`): 다음 챕터 시작 시각을 광고 챕터 끝으로. 마지막이면 +5분.

### 6-2. 시간 범위 기반 라인 필터링 (`index.ts:152-165`)
자막 라인 시작(초→ms)이 광고 챕터 `[startMs, endMs)`에 들면 제거.

### 6-3. 3단계 대응 전략 (`index.ts:294-300`)
1. 챕터로 광고 제거함 → `[Note: N sponsored segment lines filtered out ...]`
2. strip_ads=true인데 챕터 없음 → 자막 끝에 *"요약 시 광고 구간 제외"* 프롬프트 힌트(LLM 대상)
3. strip_ads=false → 무처리

## 7. ID 추출 로직 (`extractYoutubeId`, `index.ts:72`)
`new URL()` 시도 → 실패 시 직접 ID로 간주. 지원: `youtu.be/{id}`, `youtube.com/shorts/{id}`(빈 ID 검증), `watch?v={id}`, 직접 ID(정규식 `/^-?[a-zA-Z0-9_-]{10,11}$/`). `{10,11}`은 다소 느슨(표준 11자).

## 8. MCP 응답 구성 — `content` + `structuredContent` 이중화 (`index.ts:303-312`)
- `content`: 표준 MCP 텍스트(타임스탬프·개행 포함).
- `structuredContent`: `outputSchema`(`:46-53`) 대응, Claude Code v2.0.21+ 표시용. 개행을 공백으로 압축. 커밋 `7b2402c`.
- 툴 어노테이션(`:54-58`): `readOnlyHint: true`, `openWorldHint: true`(커밋 `31d953d`).

## 9. 견고성(Robustness) — `httpsRequest` (`:96`)
- 30초 타임아웃 + `req.destroy()`(`:114-117`)
- HTTP 상태코드 검증(2xx 외 reject, `:100-103`)
- JSON 파싱 실패 시 응답 미리보기 200자 포함 에러(`:350`)
- API 레벨 에러(`json.error`) 별도 처리(`:354-357`)
- 빈 세그먼트면 명확한 에러(`:369-371`)
- visitorData 추출 실패 시 경고만 하고 진행(`:148-150`)
- 페칭 계층은 일반 `Error`, MCP 계층에서 `McpError`로 변환(에러 경계 분리).

## 10. 종합 평가

### 강점
1. 계층 분리 명확 (MCP ↔ YouTube 통신 디커플링)
2. 의존성 제로 (`https`만으로 InnerTube 구동, protobuf 수작업)
3. 차단 우회 실전 노하우 (ANDROID 위장으로 poToken 회피)
4. 이중 포맷 대응 (WEB/ANDROID 응답·텍스트)
5. graceful degradation (언어 폴백, 챕터 없을 때 프롬프트 힌트, visitorData 실패 시 진행)

### 구조적 취약점 / 리스크
1. **정규식 HTML 스크래핑의 본질적 취약성** — 구조 변경 시 메타데이터·챕터가 조용히 빈 문자열로(throw 아님 → 무증상 실패). 자막 트랙 정규식 `:158`은 `]` 미포함 가정.
2. **하드코딩 클라이언트 버전**(`:41,44`) — 만료 시 전체 정지. 코드가 TODO로 인정.
3. **로케일 의존 후처리** — 구독자수 압축이 영어 응답 전제.
4. **`console.log` 사용**(`index.ts:163,280,283`) — stdio MCP에서 stdout은 JSON-RPC 채널. `console.log`가 프로토콜 메시지 오염 가능성 (실제 결함). `youtube-fetcher.ts`는 올바르게 `console.error` 사용.
5. **테스트 부재** — `evals.ts`는 실제 영상 의존 LLM 채점 1건뿐. 단위 테스트(protobuf/ID/정규식) 없음.

### 한 줄 요약
"watch 페이지를 정규식으로 긁어 세션·메타데이터·챕터를 얻고(1단계), 직접 만든 protobuf params와 ANDROID 위장으로 내부 transcript API를 호출해(2단계) 자막을 받아오는" 구조. 의존성 없이 차단을 우회하는 완성도는 높으나, YouTube의 비공개 구조 변경에 취약하고 정규식·하드코딩 버전·stdout 로깅 리스크가 있다.
