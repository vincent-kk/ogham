# AST Fallback Detection

## AST Fallback Detection

If mcp_tools_ast_search or mcp_tools_ast_analyze returns a response containing
"sgLoadError" field:
1. Log warning ONCE per session:
   "[WARN] @ast-grep/napi not installed. Using LLM fallback — results may be approximate."
   "Install: npm install -g @ast-grep/napi"
2. Switch to fallback mode for remaining AST operations:

   | Native Tool | Fallback Method |
   |-------------|-----------------|
   | mcp_tools_ast_search | Convert meta-variables to regex → Grep search → LLM false-positive filtering |
   | mcp_tools_ast_analyze (dependency-graph) | Read source → LLM extracts import/export/call patterns |
   | mcp_tools_ast_analyze (cyclomatic-complexity) | Read source → LLM counts branch statements (if/for/while/switch/catch/&&/||/?) |

   Meta-variable → Regex conversion rules:
   | Meta-Variable | Regex | Matches |
   |---------------|-------|---------|
   | $NAME | [\w.]+ | Single identifier or dot path |
   | $VALUE | [\w.]+ | Single value expression |
   | $TYPE | [\w.<>,\[\] ]+ | Type annotation |
   | $$$ARGS | [\s\S]*? | Multiple arguments (non-greedy) |
   | $$$BODY | [\s\S]*? | Block body (non-greedy) |

   Conversion algorithm:
   1. Escape regex special characters (except $)
   2. $$$[A-Z_]+ → [\s\S]*?
   3. $[A-Z_]+ → [\w.]+
   4. Whitespace → \s+

   Limitations:
   - Accuracy: text matching, no AST structure guarantee
   - Scale: recommended for ≤500 files
   - Unsupported: rule-based matching, fix patterns, type-aware matching
