import { useEffect, useState } from "react"
import type { PlayShellLocale } from "../locales"
import { formatLocaleString } from "../locales"
import {
  displayRemainingMs,
  formatClockMs,
  isLowTime,
} from "./clockDisplay"
import { isMyTurn, type OnlineSessionState } from "./onlineSession"

type GameChromeProps = {
  strings: PlayShellLocale
  session: OnlineSessionState
  confirmMoves: boolean
  onConfirmMovesChange: (value: boolean) => void
  hasPremove: boolean
  onClearPremove: () => void
  onOfferDraw: () => void
  onOfferTakeback: () => void
  onRespond: (offer: "draw" | "takeback", accept: boolean) => void
  onResign: () => void
  onAbort: () => void
  onBackToLobby: () => void
}

const endMessage = (
  strings: PlayShellLocale,
  session: OnlineSessionState
): string => {
  const end = session.end
  if (!end) return ""
  const g = strings.game
  if (end.reason === "abort") return g.aborted
  if (end.reason === "agreement") return g.drawAgreement
  if (end.reason === "flag" || end.reason === "timeout") return g.timeout
  if (end.reason === "threefold") return g.threefold
  if (end.reason === "fifty") return g.fiftyMove
  if (end.reason === "fivefold") return g.fivefold
  if (end.reason === "stalemate") return g.stalemate
  if (end.reason === "insufficient") return g.insufficientMaterial
  if (end.reason === "resign") {
    if (end.winner && session.myColor === end.winner) return g.opponentResigned
    if (session.myColor && end.winner && session.myColor !== end.winner) {
      return g.youResigned
    }
  }
  if (end.result === "1/2-1/2") return g.drawResult
  if (end.winner && session.myColor === end.winner) return g.youWin
  if (end.winner && session.myColor && session.myColor !== end.winner) {
    return g.youLose
  }
  return end.reason
}

export const GameChrome = ({
  strings,
  session,
  confirmMoves,
  onConfirmMovesChange,
  hasPremove,
  onClearPremove,
  onOfferDraw,
  onOfferTakeback,
  onRespond,
  onResign,
  onAbort,
  onBackToLobby,
}: GameChromeProps) => {
  const [now, setNow] = useState(() => Date.now())
  const g = strings.game
  const o = strings.offers

  useEffect(() => {
    if (session.phase !== "playing" || !session.clocks) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [session.phase, session.clocks])

  const clocks = session.clocks
  const whiteMs = clocks ? displayRemainingMs(clocks, "w", now) : 0
  const blackMs = clocks ? displayRemainingMs(clocks, "b", now) : 0
  const active = clocks?.active
  const myTurn = isMyTurn(session)
  const pending = session.pendingOffer
  const incoming =
    pending && session.myColor && pending.by !== session.myColor ? pending : null
  const outgoing =
    pending && session.myColor && pending.by === session.myColor ? pending : null

  const handleResign = () => {
    if (typeof window !== "undefined" && !window.confirm(g.confirmResign)) return
    onResign()
  }

  const handleAbort = () => {
    if (typeof window !== "undefined" && !window.confirm(g.confirmAbort)) return
    onAbort()
  }

  const seatLabel = (color: "w" | "b") => {
    const id = session.opponents?.[color] ?? color
    const isMe = session.myColor === color
    return isMe ? `${id} (${color === "w" ? g.white : g.black})` : id
  }

  const clockClass = (color: "w" | "b", ms: number) => {
    const parts = ["game-clock"]
    if (active === color) parts.push("game-clock--active")
    if (active === color && isLowTime(ms)) parts.push("game-clock--low")
    return parts.join(" ")
  }

  return (
    <aside className="game-chrome" aria-label={g.clock}>
      <div className="game-seat">
        <span className="game-seat-name">{seatLabel("b")}</span>
        <time
          className={clockClass("b", blackMs)}
          dateTime={`PT${Math.ceil(blackMs / 1000)}S`}
          aria-label={`${g.black} ${g.clock}`}
          aria-current={active === "b" ? "true" : undefined}
        >
          {formatClockMs(blackMs)}
        </time>
      </div>
      <p className="game-turn" role="status">
        {session.phase === "ended"
          ? endMessage(strings, session)
          : myTurn
            ? g.yourTurn
            : g.opponentTurn}
      </p>
      {session.lastSan ? (
        <p className="game-san" aria-live="polite">
          {formatLocaleString(g.moveAnnounced, { san: session.lastSan })}
        </p>
      ) : null}
      {session.lastError ? (
        <p className="game-error" role="alert">
          {session.lastError === "ILLEGAL_MOVE"
            ? g.illegalMove
            : session.lastError === "NOT_YOUR_TURN"
              ? g.notYourTurn
              : session.lastError === "ABORT_DENIED"
                ? g.abortDenied
                : session.lastError === "OFFER_INVALID"
                  ? g.offerInvalid
                  : session.lastError}
        </p>
      ) : null}
      {incoming ? (
        <div className="game-offer" role="status">
          <p>
            {incoming.offer === "draw" ? o.drawIncoming : o.takebackIncoming}
          </p>
          <div className="game-offer-actions">
            <button
              type="button"
              onClick={() => onRespond(incoming.offer, true)}
            >
              {o.accept}
            </button>
            <button
              type="button"
              onClick={() => onRespond(incoming.offer, false)}
            >
              {o.decline}
            </button>
          </div>
        </div>
      ) : null}
      {outgoing ? (
        <p className="game-offer-pending" role="status">
          {o.pending}
        </p>
      ) : null}
      {session.phase === "playing" ? (
        <div className="game-actions">
          <label className="game-pref">
            <input
              type="checkbox"
              checked={confirmMoves}
              onChange={(e) => onConfirmMovesChange(e.target.checked)}
            />
            {g.confirmMovesToggle}
          </label>
          {hasPremove ? (
            <button type="button" onClick={onClearPremove}>
              {g.clearPremove}
            </button>
          ) : null}
          <button type="button" onClick={onOfferDraw} disabled={Boolean(pending)}>
            {o.drawOffer}
          </button>
          <button
            type="button"
            onClick={onOfferTakeback}
            disabled={Boolean(pending)}
          >
            {o.takebackOffer}
          </button>
          <button type="button" onClick={handleResign}>
            {g.resign}
          </button>
          <button type="button" onClick={handleAbort}>
            {g.abort}
          </button>
        </div>
      ) : null}
      {session.phase === "ended" ? (
        <div className="game-actions">
          {session.end?.ratingDiff && session.myColor ? (
            <p className="game-rating" role="status">
              {formatLocaleString(g.ratingDiff, {
                diff: String(
                  session.end.ratingDiff[session.myColor] >= 0
                    ? `+${session.end.ratingDiff[session.myColor]}`
                    : session.end.ratingDiff[session.myColor]
                ),
              })}
            </p>
          ) : null}
          <button type="button" className="lobby-primary" onClick={onBackToLobby}>
            {strings.lobby.title}
          </button>
        </div>
      ) : null}
      <div className="game-seat">
        <span className="game-seat-name">{seatLabel("w")}</span>
        <time
          className={clockClass("w", whiteMs)}
          dateTime={`PT${Math.ceil(whiteMs / 1000)}S`}
          aria-label={`${g.white} ${g.clock}`}
          aria-current={active === "w" ? "true" : undefined}
        >
          {formatClockMs(whiteMs)}
        </time>
      </div>
    </aside>
  )
}
