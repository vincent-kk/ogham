# SPEC-media — 미디어 처리 설계

> Status: Draft v1.0 (2026-04-04)
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. 개요

기획 문서에 포함된 이미지/동영상/GIF를 다운로드하고, 동영상/GIF의 경우 키프레임을 추출하여 LLM이 "볼 수 있는" 형태로 변환하는 시스템.

### 핵심 설계 원칙

1. **컨텍스트 격리** — 동영상 분석은 서브에이전트(imbas-media)에서 수행. 메인 에이전트 컨텍스트 미오염.
2. **온디맨드 실행** — 자동 실행 아님. 사용자가 `/imbas:imbas-fetch-media --analyze` 또는 Phase 1/2에서 미디어 발견 시 안내.
3. **결과 재사용** — `.imbas/.temp/<filename>/analysis.json`에 저장. 동일 파일 재분석 불필요.

---

## 2. 워크플로우

```
[입력]
  │
  ├── Confluence 첨부 URL
  ├── Jira 첨부 URL
  └── 로컬 파일 경로
  │
  ▼
[Step 1: 다운로드]
  ├── Atlassian URL → [OP: fetch_attachment]로 바이너리 다운로드
  └── 로컬 파일 → 그대로 사용
  │
  ▼
[Step 2: 타입 판별]
  ├── 이미지 (.png, .jpg, .svg, .webp) → Step 5 직행 (Read로 바로 볼 수 있음)
  ├── 동영상 (.mp4, .mov, .avi, .mkv, .webm) → Step 3
  └── GIF (.gif) → Step 3
  │
  ▼
[Step 3: scene-sieve 키프레임 추출]
  1. .imbas/.temp/<filename>/ 디렉토리 생성
  2. probe 실행 (프리셋 자동 선택)
  3. scene-sieve 실행 (키프레임 추출)
  4. 결과: frame_*.jpg + .metadata.json
  │
  ▼
[Step 4: imbas-media 서브에이전트 호출]
  1. 키프레임 디렉토리 경로 + .metadata.json 전달
  2. 에이전트가 프레임 순차 읽기 (멀티모달)
  3. 장면별 의미 분석 + 프레임 경로 매핑
  4. analysis.json 저장 + 결과 반환
  │
  ▼
[Step 5: 결과 전달]
  ├── 이미지: 경로 반환 (호출자가 Read로 직접 확인)
  ├── 동영상/GIF: analysis.json 요약 반환
  └── 호출자(메인 에이전트)는 analysis.json 텍스트만 소비 → 프레임 이미지 미로드
```

---

## 3. scene-sieve 통합 상세

### 3.1 Probe 단계

```bash
# scene-sieve 스킬의 probe.sh 사용
"<scene-sieve-skill-dir>/scripts/probe.sh" "<input-file>" [intent]
```

**출력 (JSON):**
```json
{
  "ok": true,
  "probe": {
    "file": "<경로>",
    "duration": 125.5,
    "durationDisplay": "2m5s",
    "resolution": "1920x1080",
    "hasVideo": true,
    "probeAvailable": true
  },
  "preset": {
    "name": "medium-video",
    "flags": { "count": 12, "threshold": 0.5, "fps": 5, ... }
  },
  "command": "npx -y @lumy-pack/scene-sieve \"<경로>\" --json -n 12 -t 0.5 ..."
}
```

### 3.2 Extract 단계

```bash
# probe의 command 필드에 -o 추가
<probe.command> -o ".imbas/.temp/<filename>/frames" 2>/dev/null
```

**출력 (JSON):**
```json
{
  "ok": true,
  "data": {
    "selectedFrames": 12,
    "outputFiles": ["frame_0001.jpg", "frame_0003.jpg", ...],
    "video": { "originalDurationMs": 19218, "fps": 5, "resolution": {...} }
  }
}
```

### 3.3 프리셋 선택 로직

| 조건 | 프리셋 | 프레임 수 |
|------|--------|---------|
| `.gif` 확장자 | gif | 8 |
| ≤ 30초 | short-clip | 8 |
| ≤ 5분 | medium-video | 12 |
| ≤ 30분 | long-video | 16 |
| > 30분 | very-long | 20 |
| `--preset quick-glance` | quick-glance | 4 |
| `--preset detailed` | detailed | 25 |
| `--preset hq-capture` | hq-capture | 15 |
| `--preset inspection` | inspection | 30 |
| `--preset screen-recording` | screen-recording | 20 |

사용자가 `--preset` 으로 오버라이드 가능.

---

## 4. 서브에이전트 설계 상세

### 4.1 격리 이유

동영상 분석이 컨텍스트를 오염시키는 경로:
1. **프레임 이미지 로드** — 12~25장 × 이미지 토큰 = 대량 컨텍스트 소비
2. **프레임별 상세 기술** — 장면 설명이 수천 토큰 점유
3. **반복 작업** — 같은 패턴의 분석을 반복하므로 메인 에이전트에 불필요

서브에이전트로 격리하면:
- 메인 에이전트는 **analysis.json 텍스트**(수백 토큰)만 소비
- 프레임 이미지는 서브에이전트 컨텍스트에서만 로드/소멸
- 서브에이전트 종료 시 컨텍스트 자동 해제

### 4.2 호출 프로토콜

```
[imbas:fetch-media skill]
  │
  ├── (1) scene-sieve 실행 (Bash — 스킬 자체에서)
  │    └── 결과: frames/ 디렉토리 + .metadata.json
  │
  ├── (2) imbas-media 에이전트 spawn
  │    ├── 입력 프롬프트:
  │    │   - frames 디렉토리 절대경로
  │    │   - .metadata.json 절대경로
  │    │   - 분석 목적 (context from caller)
  │    │   - analysis.json 저장 경로
  │    │
  │    ├── 에이전트 동작:
  │    │   1. .metadata.json 읽기 → 프레임 목록 + 타임스탬프
  │    │   2. 프레임 순차 Read (멀티모달 — 이미지 인식)
  │    │   3. 장면 분류 + 설명 생성
  │    │   4. analysis.json 저장
  │    │   5. 요약 텍스트 반환
  │    │
  │    └── 출력: analysis.json 경로 + 요약 텍스트
  │
  └── (3) 스킬이 요약 텍스트를 호출자에게 반환
       └── 호출자는 필요 시 analysis.json을 Read로 상세 확인
```

### 4.3 analysis.json 스키마

```json
{
  "source": "/path/to/original.mp4",
  "analyzed_at": "2026-04-04T11:00:00+09:00",
  "total_frames": 12,
  "duration_ms": 19218,
  "resolution": "1920x1080",
  "scenes": [
    {
      "scene_id": 1,
      "start_ms": 0,
      "end_ms": 3200,
      "description": "로그인 화면 — 이메일/비밀번호 입력 필드, 소셜 로그인 버튼 3개",
      "frames": [
        {
          "path": "frames/frame_0001.jpg",
          "timestamp_ms": 0,
          "description": "초기 로그인 폼 상태"
        }
      ],
      "ui_elements": ["email_input", "password_input", "google_btn"],
      "interaction_type": "form_input"
    }
  ],
  "summary": "로그인 → 소셜 계정 선택 → OAuth 인증 → 메인 화면 전환",
  "key_observations": [
    "Google OAuth 팝업에서 약 2초 지연 발생"
  ]
}
```

### 4.4 프레임 경로 매핑의 목적

analysis.json의 각 프레임에 `path` 필드를 포함하는 이유:
- 호출자(메인 에이전트/사용자)가 **특정 장면의 실제 프레임을 직접 확인**할 수 있음
- "Scene 3의 에러 토스트를 보여줘" → analysis.json에서 해당 scene의 frame path → Read로 이미지 열기
- 분석 결과의 **검증 가능성** 확보

---

## 5. 파일 관리

### 5.1 디렉토리 구조

```
.imbas/.temp/
└── login-demo.mp4/
    ├── frames/
    │   ├── frame_0001.jpg
    │   ├── frame_0003.jpg
    │   ├── frame_0007.jpg
    │   └── .metadata.json
    └── analysis.json
```

### 5.2 캐싱

- 동일 파일(경로 기준)에 대한 재분석 요청 시 기존 analysis.json 반환
- `--force` 플래그로 강제 재분석

### 5.3 정리

- `.temp/` 디렉토리는 `.gitignore`에 포함
- 수동 정리: `imbas:setup clear-temp` (추가 subcommand)
- 자동 정리 없음 (사용자 동의 없는 삭제 금지)

---

## 6. 이미지 처리 (비동영상)

이미지는 scene-sieve가 불필요:

```
이미지 파일
  → .imbas/.temp/<filename>/ 에 복사 (Atlassian URL인 경우)
  → 경로 반환
  → 호출자가 Read tool로 직접 확인 (멀티모달)
```

서브에이전트 불필요. 스킬이 직접 처리.

---

## 7. 에러 처리

| 상황 | 처리 |
|------|------|
| scene-sieve 미설치 | `npx -y` 가 자동 설치. 실패 시 수동 설치 안내 |
| ffprobe 미설치 | probe.sh 폴백 (파일 크기 기반 휴리스틱) |
| 비디오 포맷 미지원 | `INVALID_FORMAT` 에러 → 사용자에게 포맷 확인 요청 |
| 프레임 추출 실패 | `PIPELINE_ERROR` → `--debug` 재시도 안내 |
| Atlassian URL 접근 실패 | 인증 확인 안내 |

---

## Related

- [SPEC-agents.md](./SPEC-agents.md) — imbas-media 에이전트 정의
- [SPEC-skills.md](./SPEC-skills.md) — imbas:fetch-media 스킬
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
