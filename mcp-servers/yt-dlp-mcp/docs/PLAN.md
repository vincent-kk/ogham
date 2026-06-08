# PLAN.md — YouTube Content Extraction MCP Server (Greenfield Handoff, yt-dlp 최종안)

> 이 문서 하나로 **빈 디렉토리에서 처음부터 끝까지** 구현할 수 있는 자립형 핸드오프입니다.
> 기술 스택: Node.js 20+ · TypeScript (ESM) · `@modelcontextprotocol/sdk` · **yt-dlp standalone(자동 다운로드)**
> 최종 갱신: 2026-06-07 — POC로 전 구간 실측 검증됨 (`poc/FINDINGS.md`).

---

## 0. 구현 에이전트를 위한 사용법 (READ FIRST)

당신은 **빈 디렉토리**에서 이 문서만으로 작업을 시작합니다.

1. 이 `PLAN.md`가 유일한 사양이다. Phase 0 → Phase 6 순서대로, 각 Phase의 **DoD**를 통과하며 진행한다.
2. 외부 라이브러리(`@modelcontextprotocol/sdk`)는 구현 직전에 최신 API를 context7/공식문서로 재확인한다. 이 문서 스니펫은 2026-06 기준.
3. **절대 규칙(§11)**을 항상 지킨다. 특히 **stdio MCP에서 stdout 금지**(JSON-RPC 채널), 모든 로그는 stderr.
4. 핵심 자막/메타데이터 추출 로직은 이미 검증된 POC가 있다(`poc/src/ytdlp/`). 그대로 production 구조로 옮기고 §7 운영/보안을 보강한다.
5. 네트워크가 필요한 통합 테스트는 env-gate로 기본 skip. 단위/fixture로 로직을 증명한다.

### 새 세션 시작 요청 예시
> "이 디렉토리의 `PLAN.md`를 읽고 Phase 0부터 순서대로 구현해줘. 각 Phase의 DoD를 통과하며 진행하고, 외부 라이브러리는 구현 직전에 최신 API를 확인해."

---

## 1. 목표 & 검증된 배경

### 무엇을 만드는가
YouTube(및 yt-dlp 지원 플랫폼) 영상의 **자막(transcript)과 콘텐츠(메타데이터·자막목록 등)** 를 추출하는 **MCP 서버**. 셸이 없는 호스트(Claude Desktop 등)와 배포 대상.

### 왜 이 설계인가 (POC 실측 결론)
2026-06 기준 실측으로 확인된 사실(`poc/FINDINGS.md`):
- **순수 HTTP로는 자막 본문을 못 가져온다.** 레퍼런스 구현의 InnerTube `get_transcript`(수작업 protobuf), youtubei.js v17 `getTranscript()`, timedtext baseUrl **전부 실패**(HTTP 400 / 200-empty) — poToken/BotGuard 때문. 주거용 IP에서도 동일(IP 문제 아님).
- **메타데이터/자막목록은 순수 HTTP(youtubei.js)로 가능**하나, 자막 본문이 안 되면 반쪽.
- **yt-dlp는 자막+메타데이터를 모두 가져온다** — bgutil 토큰 서버 없이도, JS 챌린지를 외부 JS 런타임으로 자체 해결.
- bgutils-js로 poToken 생성은 되지만(796자) 그것만으로 자막이 안 열림 → 불안정.

→ **결론: 자막 본문은 yt-dlp가 유일하게 견고. 단, "셸 없는 호스트 배포"가 목표이므로 yt-dlp를 MCP가 자동 확보해 단독 동작시킨다.**

### MCP가 정당한 이유 (왜 "LLM이 yt-dlp 직접 호출"이 아닌가)
셸 없는 호스트(Claude Desktop 등)는 임의 셸 실행을 안 준다 → MCP 툴이 유일한 통로. 또한 MCP는 prompt-injection 방어(옵션 화이트리스트), 검증된 플래그/파싱 캡슐화, 배포/재사용을 제공한다.

---

## 2. 핵심 설계 결정 (헌법)

1. **자막 엔진은 yt-dlp standalone 바이너리에 위임.** youtube extractor는 11k+ LOC + jsinterp(971 LOC) + pot/jsc 하위시스템이라 JS 포팅은 비현실적(§7-4). 우리는 yt-dlp를 **오케스트레이션**한다.
2. **자동 확보로 단독 동작.** brew/pip/winget 요구 금지. OS별 standalone을 자동 다운로드+캐시 → Windows 포함 크로스플랫폼 zero-install.
3. **JS 챌린지는 MCP 자신의 Node 주입.** `--js-runtimes node:${process.execPath}` → deno 등 추가 의존성 0.
4. **회피 기술은 opt-in.** 쿠키/프록시는 기본 OFF, 명시적 설정으로만(법적·ToS).
5. **무증상 실패 금지.** 모든 실패는 타입드 에러로 표면화.
6. **관심사 분리 + 테스트 가능성.** 바이너리관리/추출/MCP전송/관측/설정 독립. 응답은 fixture로 결정적 테스트.

---

## 3. 기술 스택 & 의존성

- 런타임: Node ≥ 20 (전역 `fetch`, `AbortController`), **ESM**, TS strict.

### dependencies
| 패키지 | 용도 |
|--------|------|
| `@modelcontextprotocol/sdk` | MCP 서버(`McpServer` + `registerTool`) |
| `zod` | 입력/설정 스키마 검증 |
| `execa` | yt-dlp 서브프로세스 호출 |
| `p-limit` | yt-dlp 동시성 제한 |
| `pino` | 구조화 로깅(**stderr 전용**) |

### 외부(자동 확보, 번들 아님)
- **yt-dlp standalone** — 런타임 온디맨드 다운로드(§6-2). 시스템 설치 불필요.
- JS 런타임 — **MCP의 Node 재사용**(`process.execPath`). 별도 설치 불필요.

### devDependencies
`typescript`, `@types/node`, `tsx`, `vitest`

---

## 4. 아키텍처 & 데이터 흐름

```
MCP Transport (mcp/)        McpServer · registerTool · zod · handleToolExecution · stdio
        ↓ 도메인 타입(TranscriptResult)
Orchestration (core/)       캐시 → 추출 → 정규화/후처리 · p-limit 동시성 · 타임아웃 · 타입드에러
        ↓
yt-dlp (ytdlp/)             ensureBinary(안전버전+체크섬+lock) · extract(--js-runtimes node, json3)
Cache / Observability / Config
```

### get_transcript 흐름
```
url → videoId 파싱 → 캐시 조회(HIT 반환)
 → ensureYtDlp(): 캐시에 안전버전 바이너리 보장(없으면 다운로드+검증)
 → p-limit 안에서 execa(yt-dlp, --js-runtimes node:execPath, --no-simulate --print, --write-subs json3)
 → json3 파싱 → TranscriptResult 정규화 → 후처리(truncate) → 캐시 저장 → MCP 응답
 → 실패: 타입드 에러 → handleToolExecution이 isError 응답으로 변환
```

---

## 5. 디렉토리 구조

```
.
├── package.json · tsconfig.json · vitest.config.ts · README.md · .env.example
├── src/
│   ├── index.ts                  # 부팅: config→registry 조건부 등록→stdio→SIGINT
│   ├── config.ts                 # env → zod (flags · paths · limits)
│   ├── paths.ts                  # ~/.yt-dlp/{bin,temp,downloads} 해석·생성·정리
│   ├── domain/{types.ts,errors.ts}
│   ├── obs/logger.ts             # pino, fd 2 (stderr)
│   ├── ytdlp/
│   │   ├── ensure-binary.ts      # 안전버전+체크섬+lock+캐시+TTL
│   │   ├── version.ts            # releases API: cooldown 버전 선택
│   │   ├── runner.ts             # execa + node runtime (공통 실행)
│   │   └── operations/           # 기능별 yt-dlp 호출·파싱
│   │       ├── transcript.ts · subtitles.ts · metadata.ts · metadata-summary.ts
│   │       ├── comments.ts · chapters.ts · heatmap.ts · thumbnail.ts
│   │       └── search.ts · playlist.ts · download.ts (video/audio)
│   ├── core/service.ts           # 캐시 + 동시성(p-limit) + 정규화 + 후처리
│   ├── cache/cache.ts            # LRU + TTL
│   ├── postprocess/{ad-stripper.ts,formatter.ts}
│   └── mcp/
│       ├── server.ts             # McpServer 생성
│       ├── registry.ts           # ToolDefinition[] + 조건부 등록(ADR-8)
│       ├── handle.ts             # handleToolExecution 래퍼
│       └── tools/                # 도구별 (zod 스키마 + 핸들러)
└── test/{unit,ytdlp,mcp,fixtures}/
```

---

## 6. 핵심 계약 (검증된 POC 기반 — 그대로 구현, 호출부만 최신화)

### 6-1. 도메인 타입 — `src/domain/types.ts`
```ts
export interface TranscriptSegment { text: string; startMs: number; durationMs: number; }
export interface VideoMetadata {
  videoId: string; title: string; channel: string;
  viewCount?: number; durationSec?: number; uploadDate?: string;
}
export interface TranscriptResult {
  videoId: string; language: string; availableSubs: string[];
  segments: TranscriptSegment[]; metadata: VideoMetadata;
  source: 'yt-dlp'; warnings: string[];
}
```

### 6-2. 바이너리 관리 — `src/ytdlp/ensure-binary.ts` + `version.ts`
검증된 POC(`poc/src/ytdlp/ensure-binary.ts`)를 기반으로 **§7 운영/보안을 보강**한다:
- OS/arch asset: `yt-dlp.exe`(win) / `yt-dlp_macos` / `yt-dlp_linux` / `yt-dlp_linux_aarch64`.
- **안전버전(cooldown)**: `releases` API로 목록 조회 → `published_at < now - COOLDOWN_DAYS(기본 7)` 중 최신 태그 선택. `releases/latest` 직행 금지.
- **체크섬 검증**: 같은 릴리스의 `SHA2-256SUMS` 받아 다운로드 바이너리 SHA-256 대조. 불일치 폐기.
- **원자적 다운로드 + lock**: `<bin>.part`로 받고 rename. `<bin>.lock`(또는 `mkdir` 원자성)으로 복수 인스턴스 동시 다운로드 1회화.
- **공유 캐시**: `~/.yt-dlp/bin/`(루트 `YTDLP_HOME`, ADR-9). 인스턴스 간 바이너리 1개 공유. temp는 `~/.yt-dlp/temp/`, 다운로드 산출물은 `~/.yt-dlp/downloads/`.
- **TTL 갱신**: `meta.json`에 `{tag, downloadedAt}` → `REFRESH_DAYS` 경과 시 백그라운드 갱신. 추출이 봇차단/포맷에러로 실패하면 1회 강제 갱신 후 재시도.
- `--update-to <tag>`로 바이너리 self-update도 가능(대안).

### 6-3. 추출 — `src/ytdlp/extract.ts` (POC에서 검증된 핵심)
```ts
const { stdout } = await execa(binPath, [
  '--js-runtimes', `node:${process.execPath}`, // deno 불필요
  '--skip-download', '--write-subs', '--write-auto-subs',
  '--sub-langs', `${lang},${lang}-orig,en`, '--sub-format', 'json3',
  '--no-simulate',           // ★ --dump-single-json은 simulate라 자막 안 씀 → 반드시 --no-simulate + --print
  '--print', metaPrintFmt,   // id<US>title<US>channel<US>view_count<US>duration<US>upload_date
  '--no-warnings', '-o', outTmpl, videoUrl,
], { reject: true, timeout: 90_000 });
// stdout → 메타데이터, tmpDir의 *.json3 → parseJson3 → segments. finally: rmSync(tmpDir).
```
- `parseJson3`: `events[].segs[].utf8` 결합, `tStartMs`/`dDurationMs` → 초. 빈 세그먼트 제거.

### 6-4. 설정 — `src/config.ts` (env → zod)
```
# 경로 (ADR-9)
YTDLP_HOME=~/.yt-dlp                 # bin/ temp/ downloads/ 루트
YTDLP_DOWNLOADS_DIR=$YTDLP_HOME/downloads
# 바이너리/공급망
YTDLP_COOLDOWN_DAYS=7, YTDLP_REFRESH_DAYS=14, YTDLP_PINNED_VERSION
# 추출
YTDLP_MAX_CONCURRENCY=2, YTDLP_TIMEOUT_MS=90000,
YTDLP_CHARACTER_LIMIT=25000, YTDLP_MAX_TRANSCRIPT_LENGTH=50000
# 기능 토글 (opt-in 도구 등록; 기본 4개는 항상 on) — ADR-8 / §8
YTDLP_ENABLE_SUBTITLES, YTDLP_ENABLE_METADATA_SUMMARY, YTDLP_ENABLE_COMMENTS,
YTDLP_ENABLE_CHAPTERS, YTDLP_ENABLE_HEATMAP, YTDLP_ENABLE_THUMBNAIL,
YTDLP_ENABLE_DOWNLOAD, YTDLP_ENABLE_PLAYLIST       # 각 =1 일 때만 등록
# 회피(opt-in) / 로깅
YTDLP_COOKIES_FROM_BROWSER, YTDLP_PROXY, YTDLP_LOG_LEVEL=info
```

### 6-5. 에러 taxonomy — `src/domain/errors.ts`
`INVALID_INPUT · NO_CAPTIONS · VIDEO_UNAVAILABLE · AGE_RESTRICTED · BLOCKED · RATE_LIMITED · BINARY_UNAVAILABLE · TIMEOUT · NETWORK · UNKNOWN` (retriable: RATE_LIMITED/NETWORK/TIMEOUT). yt-dlp stderr 문자열 → 코드 매핑(yt-dlp-mcp 참고: "Unsupported URL"/"unavailable"/"private"/"Sign in to confirm").

---

## 7. 운영 & 보안 정책 (사용자 4대 질문 반영)

### 7-1. 복수 인스턴스 — 메모리/용량
- **용량**: 공유 캐시 1개(35MB), 인스턴스 간 미복사.
- **메모리**: 서버는 인스턴스당 Node(상주). yt-dlp는 **요청 시 spawn → 종료(비상주)**. PyInstaller 언팩 peak ~100–150MB.
- **대응**: ① `p-limit`로 인스턴스당 yt-dlp 동시 1–2개 ② 첫 기동 동시 다운로드는 lock으로 1회화.

### 7-2. 업데이트
- TTL(`REFRESH_DAYS`) 경과 시 갱신 + 추출 실패(봇차단/포맷) 트리거 갱신. `--update-to`/재다운로드 택1.

### 7-3. 안전 버전 (공급망 방어) — 핵심
- **cooldown 핀**: `published_at`이 7일 이상 지난 최신 릴리스만 채택(컴프로마이즈 latest 즉시 수령 차단).
- **체크섬 + (선택)서명**: `SHA2-256SUMS` 대조, 여유되면 `SHA2-256SUMS.sig` PGP 검증(공개키 핀).

### 7-4. JS 포팅 안 함
- yt-dlp youtube extractor(11k+ LOC)·jsinterp·pot/jsc를 JS로 재구현하는 것은 유지보수 지옥. **바이너리 위임이 정답.** 받아둔 `~/Workspace/yt-dlp` 소스는 이해/디버깅 참고용.

---

## 8. MCP 툴 명세 (`ytdlp_` 네임스페이스 · 조건부 등록 ADR-8)

**기본 4개 always-on, 나머지는 `YTDLP_ENABLE_*=1`일 때만 등록**(미사용 시 context 절약). 상세 카탈로그·주석은 `ARCHITECTURE.md §7`.

| 툴 | 등록 조건 | 비고 |
|----|----------|------|
| `ytdlp_search_videos` | **기본** | 검색(페이지네이션/날짜필터) |
| `ytdlp_list_subtitle_languages` | **기본** | |
| `ytdlp_download_transcript` | **기본** | 자막 텍스트(타임스탬프 옵션, 광고 스트립) |
| `ytdlp_get_video_metadata` | **기본** | fields 선택 |
| `ytdlp_get_video_subtitles` | `ENABLE_SUBTITLES` | 원본 자막(json3/타임스탬프 보존) |
| `ytdlp_get_video_metadata_summary` | `ENABLE_METADATA_SUMMARY` | 사람이 읽는 요약 |
| `ytdlp_get_comments` / `_summary` | `ENABLE_COMMENTS` | flat/threaded/markdown_tree |
| `ytdlp_get_chapters` | `ENABLE_CHAPTERS` | 구간 목차 |
| `ytdlp_get_heatmap` | `ENABLE_HEATMAP` | most-replayed |
| `ytdlp_get_thumbnail` | `ENABLE_THUMBNAIL` | 다운로드(파일·¬readOnly) |
| `ytdlp_download_video` / `_audio` | `ENABLE_DOWNLOAD` | 파일 생성·¬idempotent |
| `ytdlp_get_playlist` | `ENABLE_PLAYLIST` | 항목/채널 목록 |

- **등록**: `mcp/registry.ts`의 `ToolDefinition[]`를 부팅 시 config flag로 조건부 `registerTool`(ADR-8). 꺼두면 `tools/list`에 미노출.
- **공통**: `{title, description(Args/Returns/Use when/Don't use/Error), inputSchema(zod), annotations}`, 모두 **`handleToolExecution`** 경유(통일 `isError` + character-limit truncation), 입력 zod 검증.
- **확장**: 새 yt-dlp 기능(`list_formats`/`get_channel` 등)은 레지스트리 엔트리 + `EnableKey` 추가로 편입.

---

## 9. 구현 Phase (각 DoD 통과 필수)

**Phase 0 — 스캐폴딩**: package.json(type module, bin, scripts), tsconfig(NodeNext strict), vitest, src 골격, README 스텁.
DoD: `npm run build` 성공 · `npm test`(빈 스위트) green · `node dist/index.js` stdio 대기.

**Phase 1 — 도메인 토대**: types, errors, logger(stderr), config(zod), utils(youtube-id 파싱).
DoD: youtube-id/config/에러매핑 단위테스트 green · stdout 미사용(스파이 검증).

**Phase 2 — 바이너리 관리**: ensure-binary + version(cooldown) + 체크섬 + lock + 캐시.
DoD: cooldown 선택 단위테스트(가짜 releases JSON) · 체크섬 불일치 거부 · 동시 호출 1회 다운로드(lock) · 실제 다운로드는 env-gate.

**Phase 3 — 추출 코어**: extract(execa, node runtime, `--no-simulate`+`--print`, json3) + parseJson3 + 언어폴백 + p-limit + 타임아웃 + temp 정리.
DoD: parseJson3 fixture 테스트(POC json3) · 에러 매핑 · 네트워크 통합테스트 env-gate(자막有/자동자막/자막無/Shorts).

**Phase 4 — MCP 서버 + 자막/자막목록 툴**: server, handle, get-transcript/list-subtitle-languages 툴, structuredContent.
DoD: MCP 계약테스트(SDK 클라이언트로 tools/list·tools/call, service 가짜 주입) · 에러경로 isError · Inspector 수동 1회.

**Phase 5 — 메타데이터 툴 + 후처리**: get-video-metadata, formatter(타임스탬프), ad-stripper(opt).
DoD: 메타데이터 매핑/포맷 단위테스트 · character-limit truncation.

**Phase 6 — 하드닝 & 문서**: fixture 확충, README(설치/설정/opt-in/보안·법적), .env.example.
DoD: 핵심 커버리지 ≥80% · 전 테스트 green(네트워크 gated) · **grep `console.log`/`process.stdout` 0건**.

**Phase 7~9 (opt-in)**: 쿠키/프록시, 댓글/검색 툴, Streamable HTTP 트랜스포트.

---

## 10. 테스트 전략
- **단위**: youtube-id, 언어폴백, parseJson3, cooldown 버전선택, 에러매핑, config.
- **ytdlp fixture**: 녹화 json3 + `--print` stdout 샘플 → 정규화 검증(yt-dlp 모킹/주입).
- **MCP 계약**: SDK 클라이언트 ↔ stdio, service 가짜 주입.
- **통합(env-gate `RUN_NETWORK_TESTS=1`)**: 실제 yt-dlp 소수. CI 필수 기준 제외.
- 러너 `vitest`.

---

## 11. 코딩 규칙 & 함정
1. **stdout 금지(최우선)** — stdio MCP에서 `console.log`/`process.stdout`는 JSON-RPC 오염. 로그는 pino fd 2.
2. **`--no-simulate` 필수** — `--dump-single-json`/`--print`는 simulate를 켜 `--write-subs`를 무력화. 자막 파일 받으려면 `--no-simulate`.
3. **JS 런타임은 `node:${process.execPath}`** — deno 가정 금지.
4. **안전버전+체크섬** — `releases/latest` 직행 금지, cooldown+SHA256.
5. **회피기술 기본 OFF** — 쿠키/프록시 opt-in, 문서로 ToS/법적 고지.
6. **무증상 실패 금지** — `|| ''` 금지, 타입드 에러/warnings.
7. **temp 정리** — mkdtemp → finally rmSync.
8. **동시성 제한** — p-limit로 yt-dlp child 폭주 방지.
9. **타입 안전** — `as any` 금지, 외부 출력은 경계에서 검증.
10. **ESM** — 상대 import `.js` 확장자.

---

## 12. 완료 기준 (DoD)
- [ ] Phase 0~6 DoD 통과 (7~9 opt-in)
- [ ] `npm run build`/`npm test` green, `console.log`/`process.stdout` 0건
- [ ] Claude Desktop 등록 → `ytdlp_get_transcript`로 실제 자막+메타 반환(수동)
- [ ] 시스템에 yt-dlp 미설치 상태에서 단독 동작(자동 다운로드) 확인
- [ ] README에 설정·opt-in·보안/법적 고지

---

## 13. 부록 — 실측 출처 & 참고
- **실측 전부**: `poc/FINDINGS.md` (probe1~6 + yt-dlp end-to-end 성공). 검증 코드: `poc/src/ytdlp/`.
- **설계 근거**: `docs/current-implementation-analysis.md`, `docs/improvement-options-2026.md`.
- **참고 프로젝트**: `@kevinwatt/yt-dlp-mcp`(`~/Workspace/yt-dlp-mcp`) — 차용: `ytdlp_` 프리픽스, `registerTool` description 양식, `handleToolExecution`, character limit, temp+finally, fixture 테스트, 에러 메시지 매핑. **차별점(우리 우위)**: 바이너리 자동확보(안전버전+체크섬), node 런타임 주입(deno 불필요), json3 구조화. MCP 모범사례: `~/Workspace/yt-dlp-mcp/.claude/skills/mcp-builder/reference/node_mcp_server.md`.
- **yt-dlp 소스**(이해용): `~/Workspace/yt-dlp` (youtube extractor 11k+ LOC, jsinterp 971 LOC, pot/jsc).
- 검증 환경: Node 22/26, yt-dlp 2026.03.17, macOS(주거용 KT IP). yt-dlp 릴리스는 `SHA2-256SUMS(.sig)` + `published_at` 제공.
