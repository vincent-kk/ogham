export interface HtmlElement {
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
}

export type HtmlNode = HtmlElement | string;
