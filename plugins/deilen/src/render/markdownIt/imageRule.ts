import type MarkdownIt from "markdown-it";
import type { RenderRule } from "markdown-it/lib/renderer.mjs";

import { isLocalImageSrc } from "../utils/isLocalImageSrc.js";

export interface ImageRewrite {
  sessionId: string;
  token: string;
}

interface ImageRewriteEnv {
  imageRewrite?: ImageRewrite;
  localImageIndex?: number;
}

/**
 * Override the `image` renderer rule: when `env.imageRewrite` is set, rewrite a
 * `file://` src to the session-scoped `/api/image/<sid>/<i>` route (others —
 * http/https/data/relative — pass through). The per-render index increments in
 * document order, matching `walkLocalImages`. Falls back to markdown-it's
 * default image rendering so `alt` handling is preserved.
 */
export function imageRule(md: MarkdownIt): void {
  const fallback: RenderRule =
    md.renderer.rules.image ??
    ((tokens, idx, options, _env, self) =>
      self.renderToken(tokens, idx, options));

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const e = env as ImageRewriteEnv;
    if (e.imageRewrite) {
      const token = tokens[idx];
      const src = token.attrGet("src");
      if (src !== null && isLocalImageSrc(src)) {
        const index = e.localImageIndex ?? 0;
        e.localImageIndex = index + 1;
        token.attrSet(
          "src",
          `/api/image/${e.imageRewrite.sessionId}/${index}?token=${encodeURIComponent(e.imageRewrite.token)}`,
        );
      }
    }
    return fallback(tokens, idx, options, env, self);
  };
}
