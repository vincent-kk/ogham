import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";

const NON_BREAKING_SPACE = String.fromCharCode(0xa0);
const TASK_PATTERN = new RegExp(`^\\[([ xX])\\][ ${NON_BREAKING_SPACE}]`);

/**
 * Core ruler: turn GFM task-list items (`- [x]` / `- [ ]`) into a checkbox
 * marker. The checkbox is a `<span>` (allowlist-safe), styled client-side, and
 * the enclosing `<li>` gets a `deilen-task-item` class. No `<input>`, so the
 * sanitize allowlist stays untouched. Ported from markdown-it-task-lists.
 */
export function taskList(markdownIt: MarkdownIt): void {
  markdownIt.core.ruler.after(
    "inline",
    "deilen_task_list",
    (state: StateCore) => {
      const tokens = state.tokens;
      for (let index = 2; index < tokens.length; index += 1) {
        const inline = tokens[index];
        if (inline.type !== "inline") continue;
        if (tokens[index - 1].type !== "paragraph_open") continue;
        if (tokens[index - 2].type !== "list_item_open") continue;

        const match = TASK_PATTERN.exec(inline.content);
        if (!match) continue;
        const checked = match[1] !== " ";

        const first = inline.children?.[0];
        if (first?.type === "text")
          first.content = first.content.replace(TASK_PATTERN, "");

        const checkbox = new state.Token("task_checkbox", "span", 0);
        checkbox.attrSet(
          "class",
          checked ? "deilen-task-checkbox checked" : "deilen-task-checkbox",
        );
        if (inline.children) inline.children.unshift(checkbox);
        else inline.children = [checkbox];

        tokens[index - 2].attrJoin(
          "class",
          checked ? "deilen-task-item checked" : "deilen-task-item",
        );
      }
    },
  );

  markdownIt.renderer.rules.task_checkbox = (tokens, index) => {
    const className = tokens[index].attrGet("class") ?? "deilen-task-checkbox";
    return `<span class="${className}"></span>`;
  };
}
