// Document links leave the viewer only in a new tab: navigating this tab away
// would unload the comment sidebar. Fragment links stay in-page.

export function openLinksInNewTab(root) {
  for (const anchor of root.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href") || "";
    if (href.startsWith("#")) continue;
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  }
}
