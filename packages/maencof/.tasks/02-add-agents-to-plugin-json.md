# Task 02: plugin.json에 agents 필드 추가

## Problem

`.claude-plugin/plugin.json`에 `skills`와 `mcpServers`는 등록되어 있으나
`agents` 필드가 누락되어 플러그인 시스템이 에이전트를 자동 발견하지 못한다.

## Files

- `.claude-plugin/plugin.json` — `"agents": "./agents/"` 추가

## Steps

1. `.claude-plugin/plugin.json`을 열어 `"skills": "./skills/"` 아래에 `"agents": "./agents/"` 추가

## Expected Result

```json
{
  "skills": "./skills/",
  "agents": "./agents/",
  "mcpServers": "./.mcp.json"
}
```

## Verify

```bash
cat packages/maencof/.claude-plugin/plugin.json | grep agents
```
