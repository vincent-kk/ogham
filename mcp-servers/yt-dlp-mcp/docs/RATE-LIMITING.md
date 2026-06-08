# RATE-LIMITING — @ogham/yt-dlp-mcp

> **최종 스펙.** 429/봇차단 완화 서브시스템(회전 프록시 · 요청 큐잉 · 적응 프로파일)의 확정 동작을 정의한다.
> 설계 배경은 `ARCHITECTURE.md`, 구현 파일은 `src/{config,core/service,ytdlp/runner,constants,mcp/tools/handle}`.

## Background

YouTube의 HTTP 429는 **IP 기반·누적형**이며, 자막(`timedtext`) 엔드포인트가 가장 공격적이다(비공식 경로). 한번 걸리면 수 분 ~ 최대 ~24시간 지속될 수 있고, 비디오/메타데이터는 멀쩡한데 자막만 429가 나는 일이 흔하다. 완화 효과 순위는 **player_client(ios/tv) · 회전 프록시 ≈ 요청 페이싱 > 쿠키**이며, 쿠키는 자막 429에 거의 무력하다(인증 게이트 전용). player_client는 기본 활성(`ios,tv,default`)이라 설정 없이도 1차 방어가 되고, 본 서브시스템은 이 순위를 그대로 구현한다.

## Configuration

| 환경변수                                            | 기본값           | 의미                                                                                                                                             |
| --------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `YTDLP_PLAYER_CLIENT`                               | `ios,tv,default` | yt-dlp가 위장할 YouTube player client 목록(쉼표, 순서대로 시도). 전 호출 공통, `ios`/`tv`가 429를 가장 잘 피함. `default`=web 폴백, 빈값=비활성. |
| `YTDLP_PROXY_POOL`                                  | —                | 쉼표 구분 프록시 목록. 요청마다 라운드로빈(1차 완화 수단).                                                                                       |
| `YTDLP_PROXY`                                       | —                | 단일 프록시. 풀이 없을 때만 사용(fallback).                                                                                                      |
| `YTDLP_MAX_CONCURRENCY`                             | adaptive         | 동시 yt-dlp 프로세스 수.                                                                                                                         |
| `YTDLP_REQUEST_INTERVAL_MS`                         | adaptive         | 일반/메타 호출 간 최소 간격(ms).                                                                                                                 |
| `YTDLP_SUBTITLE_INTERVAL_MS`                        | adaptive         | 자막/트랜스크립트 호출 간 최소 간격(ms).                                                                                                         |
| `YTDLP_COOKIES_FROM_BROWSER` / `YTDLP_COOKIES_FILE` | —                | 인증 게이트(연령·멤버십·로그인) 전용. 자막 429엔 권장하지 않음.                                                                                  |

`*_INTERVAL_MS`와 `MAX_CONCURRENCY`의 기본값은 프록시 상태에 따라 자동 결정되며(아래 Adaptive profile), 각 env로 명시 지정하면 그것이 우선한다.

## Player client

`src/ytdlp/runner/player-client-arg.ts`, `src/constants/ytdlp.ts` `DEFAULT_PLAYER_CLIENT`

- **전 호출 공통 주입**: `playerClientArg(config)`가 `--extractor-args youtube:player_client=<list>`를 러너 `commonArgs`에 1회 prepend한다. info-json뿐 아니라 자막(timedtext)·다운로드까지 모든 yt-dlp 호출에 적용돼, 가장 잘 막히는 자막 엔드포인트도 `web` 대신 `ios`/`tv`로 나간다.
- **기본값 `ios,tv,default`**: `web`/`web_safari`는 봇 감지·PO 토큰 요구가 가장 심하고 `ios`·`tv`는 429에 강하다. 단 `tv` 단독은 댓글 추출 불가, `ios` 단독은 일부 고화질 포맷 누락 위험이 있어, `default`(web 포함)를 폴백으로 둬 댓글·포맷·메타데이터를 보존한다.
- **env 3-state**: 미설정 → `DEFAULT_PLAYER_CLIENT`, `YTDLP_PLAYER_CLIENT=`(빈값) → 미주입(yt-dlp 자체 기본), 명시값 → 그대로.
- **extractor-args 병합 안전**: yt-dlp는 같은 `youtube` extractor라도 서로 다른 key(`player_client`/`lang`/`comment_sort`)를 하나의 dict로 병합하므로, info-json의 `lang`이나 댓글 operation의 `comment_sort;max_comments`와 충돌 없이 공존한다(동일 key만 마지막 값이 덮어씀).

## Proxy rotation

`src/ytdlp/runner/{evasion-args,runner}.ts`

- **우선순위**: 비어있지 않은 `proxyPool` > 단일 `proxy` > 없음.
- **per-call 라운드로빈**: 프록시는 한 번 계산되는 `commonArgs`에서 분리되어, `run()` 호출마다 `nextProxy()`(러너 클로저의 `rrIndex`)가 `pool[rrIndex % pool.length]`를 선택해 `--proxy`로 주입한다. 풀이 1개면 그 하나, 단일 프록시면 고정, 없으면 `--proxy` 미부착.
- **쿠키는 회전 불변**: 쿠키 플래그는 `commonArgs`에 1회 prepend(`cookieArgs`), 프록시만 호출마다 교체된다(중복 `--proxy` 없음).
- **자격증명 보호**: 프록시 URL은 절대 로깅하지 않는다. 러너 로그는 `rotated`(불리언)만 남긴다.

## Request throttling (queuing)

`src/utils/throttle.ts`, `src/core/service.ts`

- **이중 게이트**: `lightThrottle(requestIntervalMs)` + `subtitleThrottle(subtitleIntervalMs)`. 자막 계열 호출은 더 긴 간격을 받는다.
- **자막 판별**: `cacheKey`가 `transcript:` / `subtitles:` / `list-subs:` 로 시작하면 자막 게이트(읽기 전용 판별, `cacheKey`는 `${tool}:${digest}` 형식). 그 외는 light 게이트.
- **버스트 페이싱 알고리즘**: `acquire()`는 `nextAllowed`를 **await 이전에 동기적으로** 예약(`at = max(now, nextAllowed); nextAllowed = at + interval`)한다. 따라서 N개가 동시에 도착해도 `t, t+I, t+2I…`로 분산 발사된다. `interval <= 0`이면 즉시 통과(오버헤드 0) — **단발 호출은 항상 즉시**.
- **순서**: 캐시 조회 → (히트면 즉시 반환, throttle 우회) → `throttle.acquire()` → `p-limit`. 즉 페이싱이 동시성 제한보다 **앞**에서 일어나, cap 안에 들어가는 버스트도 분산된다.

## Adaptive profile

`src/config/config.ts` `adaptiveDefaults()` (loadConfig에서 계산, env가 항상 우선)

| 프록시 상태 | `MAX_CONCURRENCY` | `REQUEST_INTERVAL_MS` | `SUBTITLE_INTERVAL_MS` |
| ----------- | ----------------- | --------------------- | ---------------------- |
| none        | 1                 | 1500                  | 4000                   |
| single      | 2                 | 750                   | 2000                   |
| pool (N)    | `min(N, 8)`       | 0                     | 250                    |

의도: 프록시가 없으면 보수적으로(직렬 + 긴 간격) 누적 429를 피하고, 회전 풀이 크면 IP가 분산되므로 동시성을 올리고 간격을 거의 0으로 푼다.

## yt-dlp internal backoff

`src/constants/ytdlp.ts` `SUBTITLE_RATE_LIMIT_ARGS` = `--sleep-subtitles 1 --retries 5 --extractor-retries 3 --retry-sleep exp=1.5:30`

자막 operation에만 spread되는 yt-dlp 내부 백오프(요청당, 지수 1.5s→상한 30s). 프로세스 간 페이싱은 JS throttle이 담당하므로 **중복 계상이 아니다**. `--retry-sleep`은 `YTDLP_TIMEOUT_MS`(기본 90s) 예산 안에 들어가도록 상한을 두며, 러너에 `--sleep-requests`는 주입하지 않는다.

## Error hints

`src/mcp/tools/handle.ts` `CODE_HINTS` — 타입드 에러에 다음 행동을 덧붙인다(완화 순서 proxy > pacing > cookies).

- `RATE_LIMITED` → `YTDLP_PROXY_POOL`(IP 분산) 권장 + 동시성/간격 조정 안내. "자막 429엔 쿠키 거의 무력".
- `BLOCKED` → 봇 차단. 깨끗한 IP(프록시) 권장 + **Proof-of-Origin(PO) 토큰**이 필요할 수 있어 쿠키만으론 안 풀릴 수 있음을 명시.
- `AGE_RESTRICTED` → 실제 인증 게이트이므로 쿠키가 1차 수단.
- `COOKIE_UNAVAILABLE` → 프로필을 쓰는 브라우저를 닫거나 `YTDLP_COOKIES_FILE`로 전환.

## Invariants

- 단발 호출은 throttle을 사실상 통과(첫 호출 대기 없음); **버스트만** 페이싱된다.
- 동시 실행 수는 어떤 버스트에서도 `maxConcurrency`를 넘지 않는다.
- 캐시 히트는 throttle·프록시·yt-dlp 실행을 모두 건너뛴다.
- 프록시 URL·쿠키 값은 로그/에러 메시지에 노출되지 않는다.
- player_client extractor-arg는 `commonArgs`에 1회만 부착되며 프록시처럼 회전·중복되지 않는다.
- 자막 요청은 요청 언어 계열(`<lang>,<lang>-orig`)만 받는다(영어 강제 폴백 없음) — `src/ytdlp/operations/{transcript,subtitles}.ts`. 요청량을 줄여 429 표면을 낮춘다.

## Operational guidance

- **대량 자막 수집**: residential/ISP **회전 프록시 풀**(`YTDLP_PROXY_POOL`)이 가장 효과적. 데이터센터·일반 VPN IP는 이미 차단돼 무효인 경우가 많다.
- **프록시가 없을 때**: 적응 기본값(직렬 + 긴 간격)이 누적 429를 늦춘다. 그래도 막히면 시간차 재시도(수십 분~) 또는 단일 프록시.
- **쿠키**: 연령·멤버십·로그인 콘텐츠에만. 자막 벌크에 로그인 쿠키를 쓰면 계정이 봇으로 플래깅될 위험이 있다.

## Verification

`src/__tests__/{throttle,proxy-rotation,config-proxy-adaptive,service-throttle,player-client-arg}.test.ts` (32 cases) + 기존 스위트.

- throttle: `<=0` 즉시, idle 무대기, 버스트 `0/I/2I/3I` 간격(주입 시계).
- proxy-rotation: 풀 `[A,B,C]→A` 순환, 단일 고정, 없음 무부착, 쿠키 1회·프록시 회전, player_client 1회 주입.
- config-proxy-adaptive: 적응 테이블 전 행 + `min(N,8)` 상한 + env 오버라이드 + 풀 파싱.
- service-throttle: 자막/일반 간격 분리, 캐시 히트 우회, peak ≤ `maxConcurrency`.
- player-client-arg: 기본 주입(`ios,tv,default`)·명시 override·빈값 비활성.
