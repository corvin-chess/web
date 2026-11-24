/** UCI helpers for local play (from/to/promo). No rules logic here. */

export type ParsedUci = {
  from: string
  to: string
  promotion: string | null
}

export const parseUci = (uci: string): ParsedUci | null => {
  if (uci.length !== 4 && uci.length !== 5) return null
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return null
  if (uci.length === 4) return { from, to, promotion: null }
  const promotion = uci[4]!.toLowerCase()
  if (!/^[qrbn]$/.test(promotion)) return null
  return { from, to, promotion }
}

export const uciFromTo = (from: string, to: string, promotion?: string): string =>
  promotion ? `${from}${to}${promotion}` : `${from}${to}`

/** Prefer queen when several promotions share the same from-to. */
export const pickUci = (moves: readonly string[], from: string, to: string): string | null => {
  const matches = moves.filter((m) => {
    const p = parseUci(m)
    return p !== null && p.from === from && p.to === to
  })
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]!
  const queen = matches.find((m) => parseUci(m)?.promotion === "q")
  return queen ?? matches[0]!
}
