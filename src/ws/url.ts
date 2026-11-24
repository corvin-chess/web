/** Map the page origin to PROTOCOL WebSocket path `/ws`. */
export const wsUrlFromPage = (pageHref: string): string => {
  const u = new URL(pageHref)
  const protocol = u.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${u.host}/ws`
}
