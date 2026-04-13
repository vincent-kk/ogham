# imbas-fetch-media

Confluence/Jira에서 이미지, 비디오, GIF를 다운로드하고, 비디오/GIF는 scene-sieve로 키프레임을 추출하여 시맨틱 분석을 수행한다.

## 개요

Atlassian 첨부파일을 다운로드한 뒤 파일 종류에 따라 처리:
- **이미지**: 바로 반환 (멀티모달 Read로 시각 분석)
- **비디오/GIF**: scene-sieve로 키프레임 추출 → `media` 에이전트가 장면별 시맨틱 분석

10가지 프리셋으로 파일 특성(길이, 의도, 확장자)에 맞는 최적의 추출 설정을 자동 선택한다.

## 프리셋 자동 선택 우선순위

1. `--preset <이름>` 명시 → 해당 프리셋 사용
2. `.gif` 확장자 → `gif` 프리셋
3. 이미지 확장자 → scene-sieve 없이 이미지 경로 반환
4. 영상 길이 기반: ≤30초 `short-clip` / ≤5분 `medium-video` / ≤30분 `long-video` / >30분 `very-long`
5. 의도 키워드 오버라이드: "quick glance" → `quick-glance`, "detailed" → `detailed` 등

## 프리셋 목록

| 프리셋 | 대상 | 키프레임 수 | FPS | 해상도 |
|--------|------|-------------|-----|--------|
| `short-clip` | ≤30초 영상 | 8 | 5 | 720p |
| `medium-video` | 30초~5분 | 12 | 5 | 720p |
| `long-video` | 5~30분 | 15 | 2 | 480p |
| `very-long` | >30분 | 20 | 1 | 480p |
| `gif` | GIF 애니메이션 | 10 | 5 | 720p |
| `quick-glance` | 빠른 요약 | 5 | 2 | 480p |
| `detailed` | 정밀 분석 | 30 | 10 | 720p |
| `hq-capture` | 고화질 캡처 | 8 | 5 | 1080p |
| `inspection` | 비주얼 버그 탐지 | 20 | 5 | 720p |
| `screen-recording` | UI 워크스루 | 12 | 2 | 720p |

## 워크플로우

1. **입력 해석** — URL 패턴 감지 (Confluence/Jira/로컬)
2. **다운로드** — Atlassian URL이면 `[OP: fetch_attachment]`으로 바이너리 다운로드
3. **프로브 및 프리셋 선택** — `probe.mjs`로 파일 정보 확인, 자동 프리셋 결정
4. **이미지 처리** — scene-sieve 없이 파일 경로 반환
5. **비디오/GIF 처리** — 캐시 확인 → scene-sieve 키프레임 추출 → `media` 에이전트 분석

## 캐싱

동일 파일 경로에 `analysis.json`이 존재하면 캐시된 결과 반환. `--force`로 캐시 무시 가능.

## 디렉토리 구조

```
fetch-media/
├── SKILL.md
├── README.md
├── scripts/
│   └── probe.mjs          # 비디오 프로브 스크립트 (Node.js)
├── presets/
│   ├── index.md            # 프리셋 결정 매트릭스
│   ├── short-clip.md       # 각 프리셋별 상세 설정
│   └── ...
└── references/
    ├── workflow.md          # 워크플로우 상세
    ├── preset-selection.md  # 프리셋 선택 로직
    ├── reference.md         # scene-sieve 플래그 및 JSON 스키마
    └── tools.md             # 사용 도구 상세
```

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `config_get` | imbas MCP | temp_dir, scene_sieve_command 설정 읽기 |
| `[OP: get_confluence]` | Jira ([OP:]) | Confluence 페이지에서 첨부파일 URL 확인 |
| `[OP: fetch_attachment]` | Jira ([OP:]) | 바이너리 첨부파일 다운로드 |
| `media` | 에이전트 | 키프레임 순차 읽기 및 장면 분석 |
