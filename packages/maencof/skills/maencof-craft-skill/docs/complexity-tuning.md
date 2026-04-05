# Complexity Tuning Guide

## Overview

The **complexity evaluation system** is the foundation of skill-constructor's intelligent structure recommendations. This guide explains how to understand, adjust, and tune the complexity formula for your specific needs.

---

## Understanding the Complexity Formula

### Base Formula

```python
complexity = (
    (file_count / 20) * 0.3 +
    (mcp_integration ? 1.0 : 0.0) * 0.2 +
    (workflow_steps / 10) * 0.1 +
    (conditionals / 15) * 0.15 +
    (external_deps / 5) * 0.25
)
```

### Component Breakdown

| Component | Weight | Normalization | Rationale |
|-----------|--------|---------------|-----------|
| **File Count** | 30% | /20 (20+ files = 1.0) | More files = harder to navigate |
| **MCP Integration** | 20% | Binary (0 or 1) | MCP adds setup complexity |
| **Workflow Steps** | 10% | /10 (10+ steps = 1.0) | More steps = harder to follow |
| **Conditionals** | 15% | /15 (15+ branches = 1.0) | Branching logic increases complexity |
| **External Deps** | 25% | /5 (5+ deps = 1.0) | Dependencies add integration burden |

### Score Interpretation

```
0.0 ─────── 0.4 ─────── 0.7 ─────── 1.0+
│           │           │           │
Simple      Medium      Complex     Very Complex
```

**Thresholds:**
- `< 0.4`: **Simple** - SKILL.md only + minimal scripts
- `0.4 - 0.7`: **Medium** - Add reference.md + examples.md
- `> 0.7`: **Complex** - Full hierarchy (knowledge/, docs/)

---

## Component Analysis

### 1. File Count (30% weight)

**What it measures:** Total skill-related files
**Includes:** SKILL.md, scripts/, references/, assets/, knowledge/, docs/
**Excludes:** .git/, node_modules/, __pycache__/

**Normalization:**
```python
file_score = min(file_count / 20, 1.0)
```

**Examples:**
- 3 files: 3/20 = 0.15 → Contribution: 0.15 × 0.3 = **0.045**
- 10 files: 10/20 = 0.50 → Contribution: 0.50 × 0.3 = **0.150**
- 25 files: 25/20 = 1.25 → **capped at 1.0** → Contribution: 1.0 × 0.3 = **0.300**

**Why 30%?**
File proliferation directly impacts:
- Navigation difficulty
- Maintenance burden
- Context window usage
- Discoverability

**Tuning considerations:**
- **Increase to 40%** if your domain values simplicity (documentation, educational skills)
- **Decrease to 20%** if your domain expects many files (code generation, multi-framework skills)

---

### 2. MCP Integration (20% weight)

**What it measures:** Whether skill uses MCP servers
**Type:** Binary (0 = no MCP, 1 = uses MCP)

**Normalization:**
```python
mcp_score = 1.0 if has_mcp_integration else 0.0
```

**Examples:**
- No MCP: 0.0 → Contribution: 0.0 × 0.2 = **0.000**
- Uses MCP: 1.0 → Contribution: 1.0 × 0.2 = **0.200**

**Why 20%?**
MCP integration adds:
- Setup requirements (server configuration)
- External dependencies (MCP server availability)
- Coordination logic (tool selection, error handling)
- Testing complexity (MCP server mocking)

**Detection logic:**
```python
has_mcp_integration = any([
    "playwright" in skill_description.lower(),
    "context7" in skill_description.lower(),
    "sequential" in skill_description.lower(),
    "mcp" in skill_requirements,
    skill_uses_mcp_tools()  # Static analysis of scripts
])
```

**Tuning considerations:**
- **Increase to 25-30%** if MCP setup is particularly challenging in your environment
- **Decrease to 10-15%** if MCP is standardized and well-integrated
- **Make it 0%** if MCP is not available/relevant in your context

---

### 3. Workflow Steps (10% weight)

**What it measures:** Number of distinct workflow phases/steps
**Count:** Main process steps from start to completion

**Normalization:**
```python
workflow_score = min(workflow_steps / 10, 1.0)
```

**Examples:**
- 2 steps: 2/10 = 0.20 → Contribution: 0.20 × 0.1 = **0.020**
- 5 steps: 5/10 = 0.50 → Contribution: 0.50 × 0.1 = **0.050**
- 12 steps: 12/10 = 1.20 → **capped at 1.0** → Contribution: 1.0 × 0.1 = **0.100**

**Counting guidelines:**
```markdown
# SKILL.md workflow example

## Workflow
1. Requirements gathering ← COUNT (distinct phase)
2. Analysis ← COUNT
3. Generation ← COUNT
   3.1 Generate schema ← DON'T COUNT (sub-step)
   3.2 Generate client ← DON'T COUNT
4. Testing ← COUNT
5. Deployment ← COUNT

Total: 5 steps
```

**Why only 10%?**
Workflow steps are documented and don't inherently add maintenance burden—they're the natural flow of the task. The real complexity comes from branching logic (conditionals) rather than linear steps.

**Tuning considerations:**
- **Increase to 15-20%** if your domain has highly procedural workflows where each step is critical
- **Decrease to 5%** if workflows are mostly linear and straightforward
- **Merge with conditionals** for domains where steps and branches are intertwined

---

### 4. Conditionals (15% weight)

**What it measures:** Number of decision points/branches in workflow
**Includes:** if/else logic, mode selection, option handling

**Normalization:**
```python
conditional_score = min(conditionals / 15, 1.0)
```

**Examples:**
- 2 branches: 2/15 = 0.13 → Contribution: 0.13 × 0.15 = **0.020**
- 7 branches: 7/15 = 0.47 → Contribution: 0.47 × 0.15 = **0.070**
- 18 branches: 18/15 = 1.20 → **capped at 1.0** → Contribution: 1.0 × 0.15 = **0.150**

**Counting guidelines:**
```markdown
# Example skill workflow

If user wants format A or B:  ← COUNT (2 branches: A, B)
  Do X
Else if format C:  ← COUNT (1 branch: C)
  Do Y
Else:  ← COUNT (1 branch: default)
  Do Z

If error handling needed:  ← COUNT (2 branches: yes, no)
  ...

Total: 6 conditionals
```

**Why 15%?**
Branching logic:
- Increases testing surface area
- Complicates mental models
- Requires more documentation
- Makes maintenance harder

**Tuning considerations:**
- **Increase to 20-25%** if your domain has complex decision trees (configuration tools, multi-mode systems)
- **Decrease to 10%** if branching is minimal and well-encapsulated
- **Track nested depth** for very complex branching (add penalty for depth >3)

---

### 5. External Dependencies (25% weight)

**What it measures:** Number of external libraries/tools required
**Includes:** Python packages, npm modules, system binaries, APIs

**Normalization:**
```python
deps_score = min(external_deps / 5, 1.0)
```

**Examples:**
- 1 dep: 1/5 = 0.20 → Contribution: 0.20 × 0.25 = **0.050**
- 3 deps: 3/5 = 0.60 → Contribution: 0.60 × 0.25 = **0.150**
- 7 deps: 7/5 = 1.40 → **capped at 1.0** → Contribution: 1.0 × 0.25 = **0.250**

**Counting guidelines:**
```python
# requirements.txt
requests  ← COUNT
jinja2    ← COUNT
pyyaml    ← COUNT

# System dependencies
pandoc (binary)  ← COUNT
wkhtmltopdf      ← COUNT

# APIs
OpenAI API  ← COUNT (if required, not optional)

Total: 6 dependencies
```

**Why 25% (highest weight)?**
External dependencies:
- Create installation barriers
- Introduce version conflicts
- Add failure points
- Require maintenance tracking
- Impact portability

**Tuning considerations:**
- **Increase to 30-35%** if your environment has strict dependency management or frequent conflicts
- **Decrease to 15-20%** if dependencies are well-managed (containerized, vendored)
- **Weight by criticality** - API dependencies heavier than stdlib-like packages

---

## Domain-Specific Tuning

### Documentation-Heavy Skills

**Characteristics:**
- Many markdown files
- Minimal scripts
- Linear workflows
- Few dependencies

**Recommended adjustments:**
```python
# Reduce file count weight (many docs is expected)
file_weight = 0.20  # down from 0.30

# Increase workflow weight (procedures matter)
workflow_weight = 0.20  # up from 0.10

# Keep others same
mcp_weight = 0.20
conditional_weight = 0.15
deps_weight = 0.25
```

**Example:** Technical writing skill, API documentation generator

---

### Code Generation Skills

**Characteristics:**
- Many template files
- Complex conditionals (framework choices)
- Multiple dependencies
- Moderate workflows

**Recommended adjustments:**
```python
# Reduce file count (templates are expected)
file_weight = 0.20  # down from 0.30

# Increase conditionals (many framework options)
conditional_weight = 0.25  # up from 0.15

# Keep others same
mcp_weight = 0.20
workflow_weight = 0.10
deps_weight = 0.25
```

**Example:** Full-stack generator, API client builder

---

### MCP-Heavy Skills

**Characteristics:**
- Heavy MCP server usage
- Browser automation
- Complex tool coordination
- Many workflow steps

**Recommended adjustments:**
```python
# Increase MCP weight (core to functionality)
mcp_weight = 0.30  # up from 0.20

# Reduce deps weight (MCP encapsulates them)
deps_weight = 0.20  # down from 0.25

# Keep others same
file_weight = 0.30
workflow_weight = 0.10
conditional_weight = 0.10
```

**Example:** E2E testing suite, web scraper

---

### Data Processing Skills

**Characteristics:**
- Few files
- Simple workflows
- Many dependencies (data libs)
- Minimal branching

**Recommended adjustments:**
```python
# Reduce file weight (typically compact)
file_weight = 0.20  # down from 0.30

# Increase deps weight (pandas, numpy, etc.)
deps_weight = 0.35  # up from 0.25

# Reduce conditionals (mostly linear processing)
conditional_weight = 0.10  # down from 0.15

# Keep others same
mcp_weight = 0.20
workflow_weight = 0.15
```

**Example:** CSV analyzer, data pipeline builder

---

## Tuning Methodology

### Step 1: Analyze Your Domain

**Gather data from existing skills:**
```bash
# For each skill in your domain:
1. Count files: ls -R skill/ | wc -l
2. List deps: cat requirements.txt | wc -l
3. Identify workflow steps: grep "^## " SKILL.md
4. Count conditionals: grep -E "if|else|when|option" SKILL.md | wc -l
5. Check MCP: grep -i "mcp\|playwright\|context7" SKILL.md
```

**Calculate statistics:**
```python
# Example data for 10 documentation skills
file_counts = [5, 7, 12, 8, 6, 9, 11, 7, 8, 10]
avg_files = 8.3  # Average
max_files = 12   # Max

# If most skills have 8-12 files, consider adjusting normalization
# Old: file_count / 20 (assumes 20 is max)
# New: file_count / 12 (domain-specific max)
```

---

### Step 2: Define Your Thresholds

**What complexity levels make sense for your domain?**

**Example: Educational Skills**
```python
# Educational skills should trend simple
thresholds = {
    "simple": 0.5,    # up from 0.4 (more room for medium)
    "complex": 0.8    # up from 0.7 (reserve complex for very large courses)
}
```

**Example: Enterprise Tools**
```python
# Enterprise tools expected to be complex
thresholds = {
    "simple": 0.3,    # down from 0.4 (few enterprise tools are simple)
    "complex": 0.6    # down from 0.7 (complex is the norm)
}
```

---

### Step 3: Test and Validate

**Create test cases:**
```python
# Test case 1: Known simple skill
test_skills = [
    {
        "name": "image-rotator",
        "expected": "simple",
        "file_count": 3,
        "mcp": False,
        "workflow_steps": 2,
        "conditionals": 2,
        "deps": 1
    },
    {
        "name": "api-client-builder",
        "expected": "medium",
        "file_count": 8,
        "mcp": False,
        "workflow_steps": 5,
        "conditionals": 7,
        "deps": 3
    },
    # ... more test cases
]

# Run complexity scorer
for skill in test_skills:
    score = calculate_complexity(skill)
    category = categorize(score)
    assert category == skill["expected"], f"Failed for {skill['name']}"
```

**Adjust weights iteratively:**
```python
# If test fails, adjust weights
if actual_category != expected_category:
    # Analyze which component is misaligned
    # Adjust weight by ±0.05 increments
    # Re-run test suite
```

---

### Step 4: Document Your Formula

**Create domain-specific configuration:**
```yaml
# complexity_config.yaml
domain: "documentation"
description: "Skills for technical writing and docs generation"

formula:
  file_count:
    weight: 0.20
    normalization: 12  # most doc skills have <12 files
    rationale: "Many markdown files expected"

  mcp_integration:
    weight: 0.20
    rationale: "Standard weight"

  workflow_steps:
    weight: 0.20
    normalization: 8   # typical doc workflows: gather, organize, generate, validate
    rationale: "Procedural workflows are core to documentation"

  conditionals:
    weight: 0.15
    normalization: 10  # format choices, output options
    rationale: "Standard weight"

  external_deps:
    weight: 0.25
    normalization: 4   # pandoc, markdown libs
    rationale: "Standard weight"

thresholds:
  simple: 0.5
  complex: 0.8
```

---

## Advanced Tuning Techniques

### 1. Weighted Dependencies

Not all dependencies are equal:

```python
def calculate_deps_score(dependencies: List[Dependency]) -> float:
    """Weight dependencies by criticality"""
    weights = {
        "stdlib": 0.1,      # Python stdlib, minimal impact
        "common": 0.5,      # requests, jinja2, widely used
        "specialized": 1.0, # domain-specific libs
        "system": 1.5,      # pandoc, wkhtmltopdf, installation required
        "api": 2.0          # external API, potential failure point
    }

    weighted_sum = sum(weights.get(dep.type, 1.0) for dep in dependencies)
    normalized = weighted_sum / 10  # Adjust normalization

    return min(normalized, 1.0)
```

**Example:**
```python
deps = [
    Dependency("json", type="stdlib"),      # 0.1
    Dependency("requests", type="common"),  # 0.5
    Dependency("pandoc", type="system"),    # 1.5
    Dependency("OpenAI", type="api")        # 2.0
]
# weighted_sum = 4.1
# normalized = 4.1 / 10 = 0.41
```

---

### 2. Branching Depth Penalty

Penalize deeply nested conditionals:

```python
def calculate_conditional_score(conditionals: List[Conditional]) -> float:
    """Apply depth penalty to conditionals"""
    base_score = len(conditionals) / 15

    # Penalty for depth
    depth_penalty = 0
    for cond in conditionals:
        if cond.depth > 2:
            depth_penalty += 0.05 * (cond.depth - 2)

    return min(base_score + depth_penalty, 1.0)
```

**Example:**
```python
conditionals = [
    Conditional(depth=1),  # if A
    Conditional(depth=2),  # if A then if B
    Conditional(depth=3),  # if A then if B then if C (penalty: +0.05)
    Conditional(depth=4),  # depth 4 (penalty: +0.10)
]
# base_score = 4/15 = 0.27
# depth_penalty = 0.05 + 0.10 = 0.15
# total = 0.27 + 0.15 = 0.42
```

---

### 3. File Type Weighting

Different files have different complexity:

```python
def calculate_file_score(files: List[File]) -> float:
    """Weight files by type"""
    weights = {
        "markdown": 0.5,   # Documentation, lower complexity
        "python": 1.0,     # Scripts, standard complexity
        "template": 0.7,   # Templates, moderate complexity
        "config": 0.3      # Config files, minimal complexity
    }

    weighted_sum = sum(weights.get(f.type, 1.0) for f in files)
    normalized = weighted_sum / 20

    return min(normalized, 1.0)
```

---

### 4. Dynamic Thresholds

Adjust thresholds based on team maturity:

```python
def get_thresholds(team_experience: str) -> dict:
    """Adjust complexity thresholds by team experience"""
    thresholds = {
        "junior": {
            "simple": 0.5,   # More room for simple
            "complex": 0.8   # Reserve complex for truly hard
        },
        "mid": {
            "simple": 0.4,   # Standard thresholds
            "complex": 0.7
        },
        "senior": {
            "simple": 0.3,   # Experienced teams handle more
            "complex": 0.6   # Complex is expected
        }
    }
    return thresholds.get(team_experience, thresholds["mid"])
```

---

## Validation and Calibration

### A/B Testing

Test formula changes with real skills:

```python
# Test suite
skills = load_test_skills()

# Run both formulas
for skill in skills:
    score_old = calculate_complexity_v1(skill)
    score_new = calculate_complexity_v2(skill)

    category_old = categorize(score_old)
    category_new = categorize(score_new)

    if category_old != category_new:
        print(f"Changed: {skill.name}")
        print(f"  Old: {category_old} ({score_old:.2f})")
        print(f"  New: {category_new} ({score_new:.2f})")
        print(f"  Expected: {skill.expected_category}")
```

**Analyze results:**
- How many skills changed categories?
- Are changes aligned with expectations?
- Any unexpected category jumps?

---

### Sensitivity Analysis

Test how sensitive the formula is to each component:

```python
def sensitivity_analysis(base_skill):
    """Test impact of varying each component"""
    results = {}

    for component in ["file_count", "mcp", "workflow_steps", "conditionals", "deps"]:
        # Vary component by ±20%
        varied_scores = []
        for multiplier in [0.8, 0.9, 1.0, 1.1, 1.2]:
            skill = base_skill.copy()
            skill[component] *= multiplier
            score = calculate_complexity(skill)
            varied_scores.append(score)

        # Calculate variance
        variance = np.var(varied_scores)
        results[component] = variance

    # Components with high variance have more impact
    return results
```

**Interpretation:**
- High variance → Component has strong influence
- Low variance → Component has weak influence
- Adjust weights to balance influence across components

---

## Practical Examples

### Example 1: Tuning for Educational Content

**Initial scores (default formula):**
```
course-builder: 0.68 (Medium) - Expected: Medium ✅
lesson-planner: 0.42 (Medium) - Expected: Simple ❌
quiz-generator: 0.38 (Simple) - Expected: Simple ✅
```

**Issue:** lesson-planner scored 0.42 (just over Simple threshold)

**Analysis:**
```python
lesson_planner = {
    "file_count": 8,      # Contribution: 0.12
    "mcp": False,         # Contribution: 0.00
    "workflow_steps": 6,  # Contribution: 0.06
    "conditionals": 4,    # Contribution: 0.04
    "deps": 2             # Contribution: 0.10
}
# Total: 0.42
```

**Adjustment:** Reduce file weight for educational skills
```python
# Old formula: file_weight = 0.30
# New formula: file_weight = 0.20

# New score
lesson_planner_score = (8/20)*0.20 + 0*0.20 + (6/10)*0.10 + (4/15)*0.15 + (2/5)*0.30
                     = 0.08 + 0 + 0.06 + 0.04 + 0.12
                     = 0.30 (Simple) ✅
```

---

### Example 2: Tuning for Enterprise Tools

**Initial scores:**
```
crm-integrator: 0.52 (Medium) - Expected: Complex ❌
auth-manager: 0.71 (Complex) - Expected: Complex ✅
reporting-suite: 0.48 (Medium) - Expected: Complex ❌
```

**Issue:** Two enterprise tools under Complex threshold

**Analysis:** Enterprise tools have many dependencies and MCP integration

**Adjustment:** Increase MCP and deps weights
```python
# Old formula
mcp_weight = 0.20
deps_weight = 0.25

# New formula
mcp_weight = 0.25
deps_weight = 0.30

# Lower threshold
complex_threshold = 0.60  # down from 0.70
```

**Results:**
```
crm-integrator: 0.58 (Complex with new threshold) ✅
auth-manager: 0.76 (Complex) ✅
reporting-suite: 0.54 (Complex with new threshold) ✅
```

---

## Configuration File Format

Save your tuned formula as a configuration file:

```python
# complexity_config.py

DOMAIN = "your-domain"

WEIGHTS = {
    "file_count": 0.30,
    "mcp_integration": 0.20,
    "workflow_steps": 0.10,
    "conditionals": 0.15,
    "external_deps": 0.25
}

NORMALIZATIONS = {
    "file_count": 20,
    "workflow_steps": 10,
    "conditionals": 15,
    "external_deps": 5
}

THRESHOLDS = {
    "simple": 0.4,
    "complex": 0.7
}

# Validation: weights must sum to 1.0
assert sum(WEIGHTS.values()) == 1.0, "Weights must sum to 1.0"
```

Use in complexity scorer:

```python
# In complexity_scorer.py
from complexity_config import WEIGHTS, NORMALIZATIONS, THRESHOLDS

def calculate_complexity(spec: SkillSpecification) -> float:
    file_score = min(spec.file_count / NORMALIZATIONS["file_count"], 1.0)
    mcp_score = 1.0 if spec.has_mcp_integration else 0.0
    workflow_score = min(spec.workflow_steps / NORMALIZATIONS["workflow_steps"], 1.0)
    conditional_score = min(spec.conditionals / NORMALIZATIONS["conditionals"], 1.0)
    deps_score = min(spec.external_deps / NORMALIZATIONS["external_deps"], 1.0)

    complexity = (
        file_score * WEIGHTS["file_count"] +
        mcp_score * WEIGHTS["mcp_integration"] +
        workflow_score * WEIGHTS["workflow_steps"] +
        conditional_score * WEIGHTS["conditionals"] +
        deps_score * WEIGHTS["external_deps"]
    )

    return complexity
```

---

## Troubleshooting Common Issues

### Issue 1: All Skills Score Medium

**Symptom:** Most skills score 0.4-0.7 (medium range)

**Diagnosis:** Weights are too balanced, not enough differentiation

**Solution:** Increase weight of most discriminating factor
```python
# Identify which component varies most across your skills
# Increase its weight by 0.10, decrease others proportionally
```

---

### Issue 2: Scores Too Sensitive to File Count

**Symptom:** Adding 2 files jumps skill from Simple to Medium

**Diagnosis:** File count weight too high or normalization too low

**Solution:** Adjust normalization or reduce weight
```python
# Option 1: Increase normalization
file_normalization = 30  # up from 20

# Option 2: Reduce weight
file_weight = 0.20  # down from 0.30
```

---

### Issue 3: MCP Skills Always Complex

**Symptom:** Any skill with MCP integration scores >0.7

**Diagnosis:** MCP weight too high

**Solution:** Reduce MCP weight
```python
mcp_weight = 0.15  # down from 0.20
# Redistribute 0.05 to other components
```

---

### Issue 4: Dependencies Not Differentiating

**Symptom:** Skills with 1 vs 5 dependencies score similarly

**Diagnosis:** Dependency normalization too high

**Solution:** Lower normalization threshold
```python
# Old: deps / 5 (5+ deps maxes out)
# New: deps / 3 (3+ deps maxes out)
deps_normalization = 3
```

---

## Best Practices

### 1. Start with Defaults
Use the default formula for first 10-20 skills. Gather data before tuning.

### 2. Document Rationale
Always document why you're changing weights. Future you will thank you.

### 3. Version Your Formula
Track formula versions alongside skill versions:
```python
FORMULA_VERSION = "1.2.0"
# v1.0.0: Default formula
# v1.1.0: Reduced file_weight for documentation domain
# v1.2.0: Increased deps_weight for enterprise tools
```

### 4. Test on Edge Cases
Create test skills at each boundary:
- Exactly 0.40 (simple/medium boundary)
- Exactly 0.70 (medium/complex boundary)
- Ensure they categorize as expected

### 5. Review Periodically
Reassess formula every 6 months or after 50 new skills. Domains evolve.

### 6. Keep It Simple
Resist over-tuning. Formula should be understandable. If you need >10 components, reconsider.

---

## Summary Checklist

**Before tuning:**
- [ ] Collected data from 10+ existing skills
- [ ] Identified domain-specific patterns
- [ ] Documented current pain points with default formula

**During tuning:**
- [ ] Adjusted weights in 0.05 increments
- [ ] Ensured weights sum to 1.0
- [ ] Tested on representative skills
- [ ] Validated category boundaries

**After tuning:**
- [ ] Documented formula version and rationale
- [ ] Created configuration file
- [ ] Updated complexity_scorer.py
- [ ] Ran full test suite
- [ ] Communicated changes to team

**Formula quality checks:**
- [ ] Weights sum to 1.0
- [ ] Normalizations reflect domain maxima
- [ ] Thresholds create clear categories
- [ ] Test skills categorize as expected
- [ ] Formula is documented and versioned

---

**Need Help?**

Complexity tuning is iterative. Start conservative, gather data, adjust gradually. When in doubt, default formula is a solid baseline for most domains.
