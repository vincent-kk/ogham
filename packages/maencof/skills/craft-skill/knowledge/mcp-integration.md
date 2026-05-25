# MCP Integration - MCP Server Integration Guide

## MCP (Model Context Protocol) Overview

MCP is a protocol that connects Claude's capabilities with external tools and services. Skills can leverage MCP servers to perform specialized operations.

---

## When to Consider MCP Integration

### Integration is Needed

✅ **Browser Automation**
- **MCP**: `playwright`
- **Use Cases**: E2E testing, web scraping, screenshot capture
- **Reason**: Real browser rendering, JavaScript execution, complex interactions

✅ **Official Documentation Lookup**
- **MCP**: `context7`
- **Use Cases**: Library API docs, framework guides
- **Reason**: Curated, up-to-date documentation, version-specific information

✅ **Structured Reasoning**
- **MCP**: `sequential-thinking`
- **Use Cases**: Complex debugging, architecture analysis, multi-step decision making
- **Reason**: Systematic thinking process, hypothesis validation

✅ **Specialized Domain Tasks**
- **MCP**: Domain-specific custom servers
- **Use Cases**: Database operations, API integration, special file formats
- **Reason**: Specialized tools and optimization

---

### Integration is Not Needed

❌ **Simple File Operations**
- **Alternative**: Native Python/Node.js scripts
- **Example**: Text file read/write, JSON parsing

❌ **Basic LLM Tasks**
- **Alternative**: Claude native capabilities
- **Example**: Code generation, text analysis, explanation

❌ **Deterministic Calculations**
- **Alternative**: Scripts (scripts/)
- **Example**: Math calculations, data transformation

---

## Complexity Impact

### MCP Integration Complexity Increase

**Formula:**
```python
complexity = (
    file_score * 0.3 +
    mcp_score * 0.2 +  # MCP integration adds +0.2
    workflow_score * 0.1 +
    conditional_score * 0.15 +
    deps_score * 0.25
)
```

**+0.2 Complexity Reasons:**
1. **Additional Setup**: MCP server installation and configuration
2. **External Dependencies**: Dependency on MCP server availability
3. **Tool Coordination Logic**: MCP tool invocation and result processing
4. **Error Handling**: Network errors, timeouts, service unavailability

---

## Major MCP Server Integration Patterns

### 1. Playwright - Browser Automation

**When to Use:**
- Writing E2E tests
- Web page scraping
- Screenshot and PDF generation
- User flow validation

**Skill Integration Example:**

**SKILL.md:**
```markdown
## Prerequisites
- Playwright MCP server installed and configured
- See reference.md Section 1.2 for installation

## Workflow

### Phase 1: Test Planning
Define user journey and validation points.

### Phase 2: Test Implementation
Use Playwright MCP to:
- Navigate to pages
- Interact with elements
- Capture screenshots
- Validate results

See reference.md Section 3 for detailed Playwright integration.
```

**reference.md:**
```markdown
## 3. Playwright MCP Integration

### 3.1 Installation
```bash
# Install Playwright MCP server
npm install -g @playwright/mcp-server
```

### 3.2 Configuration
Configure in ~/.claude/config.json:
```json
{
  "mcp_servers": {
    "playwright": {
      "command": "playwright-mcp",
      "args": []
    }
  }
}
```

### 3.3 Usage Patterns

#### Pattern 1: Page Navigation
```
Request: "Navigate to https://example.com and take screenshot"

MCP Call:
- Tool: playwright_navigate
- Args: {url: "https://example.com"}
- Then: playwright_screenshot
```

#### Pattern 2: Form Interaction
```
Request: "Fill login form and submit"

MCP Call:
- playwright_fill (selector: "#username", value: "user")
- playwright_fill (selector: "#password", value: "pass")
- playwright_click (selector: "#submit")
```

### 3.4 Error Handling
- Timeout errors: Increase timeout or retry
- Element not found: Verify selector, wait for element
- Navigation failed: Check network, verify URL
```

**scripts/test_runner.py:**
```python
#!/usr/bin/env python3
"""
Test Runner with Playwright MCP Integration

This script coordinates test execution using Playwright MCP.
Claude handles MCP communication; script manages test lifecycle.
"""

def run_tests(test_suite: str):
    """
    Run E2E tests using Playwright via Claude MCP integration.

    Claude will:
    1. Parse test_suite specification
    2. Execute Playwright MCP commands
    3. Collect results
    4. Generate report
    """
    print(f"Executing test suite: {test_suite}")
    print("Tests will run via Playwright MCP server...")
    # Claude handles actual MCP calls
```

---

### 2. Context7 - Official Documentation Lookup

**When to Use:**
- Need library API reference
- Check framework best practices
- Query version-specific differences
- Need official code examples

**Skill Integration Example:**

**SKILL.md:**
```markdown
## Workflow

### Phase 1: Framework Selection
Choose target framework (React, Vue, Angular, etc.)

### Phase 2: Documentation Lookup
Use Context7 MCP to retrieve:
- Official API documentation
- Best practice patterns
- Version-specific guidelines

### Phase 3: Code Generation
Generate code following official patterns from Context7.

See reference.md Section 4 for Context7 integration details.
```

**reference.md:**
```markdown
## 4. Context7 MCP Integration

### 4.1 Purpose
Context7 provides curated, version-specific documentation for libraries and frameworks.

### 4.2 Usage Patterns

#### Pattern 1: API Lookup
```
Request: "Show React useState hook documentation"

MCP Call:
- Tool: context7_query
- Args: {library: "react", query: "useState hook", version: "18"}
- Returns: Official React docs for useState
```

#### Pattern 2: Best Practices
```
Request: "Best practices for Vue 3 composition API"

MCP Call:
- Tool: context7_query
- Args: {library: "vue", query: "composition API best practices", version: "3"}
- Returns: Official Vue 3 guidelines
```

### 4.3 Integration Strategy

**Step 1: Identify Documentation Needs**
Determine which library/framework documentation is required.

**Step 2: Query Context7**
Use specific queries to retrieve relevant sections.

**Step 3: Apply Patterns**
Generate code following official patterns from documentation.

### 4.4 Example Workflow
```
User: "Create React component with useState"

1. Context7 Query: "React useState hook API"
   → Returns official useState documentation

2. Context7 Query: "React component best practices"
   → Returns component structuring guidelines

3. Code Generation:
   Apply patterns from Context7 documentation
```
```

---

### 3. Sequential-Thinking - Structured Reasoning

**When to Use:**
- Complex debugging (multi-layer)
- Architecture design decisions
- Systematic problem analysis
- Hypothesis validation needed

**Skill Integration Example:**

**SKILL.md:**
```markdown
## Workflow

### Phase 1: Problem Analysis
Use Sequential MCP to:
- Decompose complex problem
- Identify root causes
- Formulate hypotheses

### Phase 2: Solution Design
Systematic reasoning through:
- Alternative approaches
- Trade-off analysis
- Risk assessment

See reference.md Section 5 for Sequential integration.
```

**reference.md:**
```markdown
## 5. Sequential-Thinking MCP Integration

### 5.1 Purpose
Sequential-thinking provides structured reasoning for complex analysis.

### 5.2 Usage Patterns

#### Pattern 1: Root Cause Analysis
```
Request: "Debug why API is slow"

Sequential MCP Flow:
1. Hypothesis 1: Database query inefficiency
   → Test: Check query execution time
   → Result: Queries fast (<50ms)

2. Hypothesis 2: Network latency
   → Test: Measure network round-trip
   → Result: High latency (500ms+)

3. Root Cause: Network configuration issue
   → Solution: Optimize network settings
```

#### Pattern 2: Architecture Decision
```
Request: "Choose between microservices and monolith"

Sequential MCP Flow:
1. Evaluate current requirements
   → Team size: 5 developers
   → Scale: <10k users

2. Analyze trade-offs
   → Microservices: High complexity, better scalability
   → Monolith: Simpler, faster development

3. Recommendation: Monolith with modular design
   → Rationale: Team size and scale favor simplicity
```

### 5.3 Integration Strategy

**When to Use Sequential:**
- Multi-step analysis required
- Trade-offs need systematic evaluation
- Complex debugging with many variables

**How to Invoke:**
Claude automatically uses Sequential MCP for complex reasoning tasks.
No explicit invocation needed in scripts.

### 5.4 Benefits
- Structured thinking process
- Transparent reasoning
- Hypothesis validation
- Trade-off documentation
```

---

## MCP Integration Best Practices

### 1. Clear Prerequisites

**Specify in SKILL.md:**
```markdown
## Prerequisites

### Required MCP Servers
- **playwright**: Browser automation (install: `npm install -g @playwright/mcp-server`)
- **context7**: Documentation lookup (install: `npm install -g context7-mcp`)

### Configuration
See reference.md Section 1 for detailed setup instructions.

### Verification
Run `scripts/verify_mcp.py` to check MCP server availability.
```

---

### 2. Fallback Strategy

**Provide alternatives when MCP server unavailable:**

```markdown
## Workflow

### Phase 2: Browser Testing

**Preferred:** Playwright MCP for real browser testing
**Fallback:** Unit tests with mocked browser APIs

To check MCP availability:
```bash
scripts/verify_mcp.py --server playwright
```

If unavailable, use fallback: `scripts/run_unit_tests.py`
```

**scripts/verify_mcp.py:**
```python
#!/usr/bin/env python3
"""Verify MCP server availability"""

import sys
import json

def check_mcp_server(server_name: str) -> bool:
    """
    Check if MCP server is available.

    Returns True if available, False otherwise.
    Claude handles actual MCP communication check.
    """
    # Claude will verify MCP server availability
    print(f"Checking {server_name} MCP server...")
    # Return status
    return True  # Placeholder

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True)
    args = parser.parse_args()

    available = check_mcp_server(args.server)
    sys.exit(0 if available else 1)
```

---

### 3. Error Handling

**MCP Call Failure Scenarios:**

**reference.md:**
```markdown
## 6. MCP Error Handling

### Common Errors

#### Error 1: MCP Server Not Available
**Symptom:** "MCP server 'playwright' not found"
**Cause:** Server not installed or not running
**Solution:**
1. Install server: `npm install -g @playwright/mcp-server`
2. Verify: `scripts/verify_mcp.py --server playwright`
3. Restart Claude Code

#### Error 2: MCP Timeout
**Symptom:** "MCP call timed out after 30s"
**Cause:** Server overloaded or network issue
**Solution:**
1. Retry operation
2. Check network connectivity
3. Restart MCP server

#### Error 3: MCP Tool Not Found
**Symptom:** "Tool 'playwright_navigate' not found"
**Cause:** MCP server version mismatch
**Solution:**
1. Update server: `npm update -g @playwright/mcp-server`
2. Check compatibility in reference.md Section 1.3

### Graceful Degradation
If MCP fails, skill should:
1. Log error clearly
2. Suggest fallback approach
3. Continue with reduced functionality
```

---

### 4. Documentation

**Clearly document MCP integration:**

**SKILL.md - Resources Section:**
```markdown
## Resources

### reference.md
- Section 1: MCP Server Setup (playwright, context7)
- Section 3: Playwright Integration Patterns
- Section 4: Context7 Usage Examples
- Section 6: MCP Error Handling

### scripts/
- verify_mcp.py: Check MCP server availability
- setup_mcp.sh: Automated MCP server installation
```

**reference.md - Dedicated Section:**
```markdown
## 1. MCP Server Setup

### 1.1 Installation

#### Playwright
```bash
npm install -g @playwright/mcp-server
playwright install  # Install browsers
```

#### Context7
```bash
npm install -g context7-mcp
```

### 1.2 Configuration

Edit ~/.claude/config.json:
```json
{
  "mcp_servers": {
    "playwright": {
      "command": "playwright-mcp",
      "args": ["--headless"]
    },
    "context7": {
      "command": "context7-mcp",
      "args": []
    }
  }
}
```

### 1.3 Verification
```bash
scripts/verify_mcp.py --server playwright
scripts/verify_mcp.py --server context7
```

### 1.4 Troubleshooting
See Section 6 for common issues and solutions.
```

---

## MCP Usage by Complexity Category

### Simple Skill (< 0.4) - MCP Integration Not Recommended

**Reason:**
- MCP integration alone adds +0.2 complexity
- Exceeds Simple range (0.4+)
- Risk of over-engineering

**Alternative:**
- Use native scripts
- Use external libraries directly

---

### Medium Skill (0.4-0.7) - Selective MCP Integration

**Suitable MCP:**
- Context7 (documentation lookup)
- Single MCP server

**Example:**
```
api-client-generator/
├── SKILL.md
├── reference.md
│   └── Section 2: Context7 Integration (API docs lookup)
└── scripts/
    └── generate_client.py
```

**Complexity:**
- Base: 0.45
- +MCP: 0.2
- Total: 0.65 (within Medium range)

---

### Complex Skill (> 0.7) - Multi-MCP Integration

**Suitable MCP:**
- Playwright + Context7
- Sequential-thinking
- Multiple MCP server combinations

**Example:**
```
full-stack-generator/
├── SKILL.md
├── reference.md
│   ├── Section 3: Playwright Integration (E2E testing)
│   ├── Section 4: Context7 Integration (Framework docs)
│   └── Section 5: Sequential Integration (Architecture)
└── scripts/
    ├── generate_backend.py
    ├── generate_frontend.py
    └── run_e2e_tests.py
```

**Complexity:**
- Base: 0.6
- +MCP: 0.2
- Total: 0.8 (Complex)

---

## MCP Integration Checklist

When integrating MCP into skills:

✅ **Planning Phase**
- [ ] Is MCP integration truly necessary? (Review native alternatives)
- [ ] Which MCP servers are needed?
- [ ] Calculate complexity impact (+0.2)
- [ ] Is complexity category appropriate?

✅ **Implementation Phase**
- [ ] Clearly document Prerequisites
- [ ] Write Installation guide
- [ ] Provide Configuration examples
- [ ] Write Verification script

✅ **Documentation**
- [ ] Specify MCP requirements in SKILL.md
- [ ] Write detailed integration guide in reference.md
- [ ] Write error handling section
- [ ] Explain Fallback strategy

✅ **Testing**
- [ ] Verify MCP server availability
- [ ] Test MCP calls
- [ ] Test error scenarios
- [ ] Verify Fallback behavior

✅ **Maintenance**
- [ ] Track MCP server version compatibility
- [ ] Provide update guide
- [ ] Record changes in CHANGELOG

---

## Real-World Example: E2E Testing Skill

**Complexity Score:** 0.72 (Complex)

### File Structure
```
e2e-testing/
├── SKILL.md (4.2k words)
├── reference.md (9k words)
├── examples.md (3k words)
├── knowledge/
│   └── testing-strategies.md
├── scripts/
│   ├── verify_mcp.py
│   ├── setup_mcp.sh
│   └── run_tests.py
└── docs/
    └── troubleshooting.md
```

### SKILL.md (Excerpt)
```markdown
---
name: e2e-testing
description: >
  Use this skill when writing end-to-end tests for web applications.
  It provides Playwright-based test generation, execution, and reporting
  with screenshot capture and video recording. Typical scenarios: User
  journey validation, regression testing, cross-browser compatibility.
  Requires Playwright MCP server.
---

# E2E Testing

## Prerequisites
- **Playwright MCP server** (required)
  - Install: `npm install -g @playwright/mcp-server`
  - Verify: `scripts/verify_mcp.py --server playwright`

## Quick Start
1. Define test scenarios
2. Generate test code (using Playwright MCP)
3. Execute tests
4. Review results

## Core Workflow
[High-level overview with references to reference.md]

## Resources
### reference.md
- Section 3: Playwright MCP Integration
- Section 6: Error Handling
### scripts/
- setup_mcp.sh: Automated setup
- verify_mcp.py: Check MCP status
```

### reference.md - Section 3 (Excerpt)
```markdown
## 3. Playwright MCP Integration

### 3.1 Test Generation Pattern
```
User Request: "Test login flow"

Step 1: Define test steps
- Navigate to login page
- Fill credentials
- Click submit
- Verify success

Step 2: MCP Calls
- playwright_navigate(url="/login")
- playwright_fill(selector="#username", value="test@example.com")
- playwright_fill(selector="#password", value="password")
- playwright_click(selector="#submit")
- playwright_screenshot(name="after-login")

Step 3: Validation
- Check URL changed to /dashboard
- Verify welcome message present
```

### 3.2 Error Recovery
[Detailed error handling strategies]
```

---

## Conclusion

MCP integration significantly expands skill capabilities but increases complexity:

**Core Principles:**
1. **Validate Necessity**: Ensure MCP is truly needed
2. **Clear Documentation**: Specify Prerequisites, setup, usage
3. **Error Handling**: Fallback strategy and troubleshooting
4. **Complexity Management**: Consider +0.2 complexity to maintain category

**Recommendations:**
- Simple skills: Avoid MCP
- Medium skills: Single MCP selective use
- Complex skills: Multi-MCP integration possible

Proper MCP integration creates specialized, high-quality skills.
