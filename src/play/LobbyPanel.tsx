import { useState } from "react"
import type { PlayShellLocale } from "../locales"
import { TIME_PRESETS, defaultPreset, type TimePreset } from "./timePresets"

type LobbyPanelProps = {
  strings: PlayShellLocale
  pairing: boolean
  disabled: boolean
  lastError?: string | null
  onQuickPair: (
    preset: TimePreset,
    rated: boolean,
    color: "random" | "white" | "black"
  ) => void
  onCancel: () => void
}

export const LobbyPanel = ({
  strings,
  pairing,
  disabled,
  lastError,
  onQuickPair,
  onCancel,
}: LobbyPanelProps) => {
  const [presetId, setPresetId] = useState(defaultPreset().id)
  const [rated, setRated] = useState(true)
  const [color, setColor] = useState<"random" | "white" | "black">("random")
  const lobby = strings.lobby

  const presetLabel = (id: string) => {
    if (id === "bullet") return lobby.timeBullet
    if (id === "rapid") return lobby.timeRapid
    return lobby.timeBlitz
  }

  const handleQuickPair = () => {
    const preset = TIME_PRESETS.find((p) => p.id === presetId) ?? defaultPreset()
    onQuickPair(preset, rated, color)
  }

  return (
    <section className="lobby-panel" aria-label={lobby.title}>
      <h2 className="lobby-title">{lobby.title}</h2>
      <p className="lobby-hint">{lobby.seekEmpty}</p>
      <div className="lobby-row" role="group" aria-label={lobby.timeBlitz}>
        {TIME_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="lobby-chip"
            aria-pressed={presetId === p.id}
            disabled={disabled || pairing}
            onClick={() => setPresetId(p.id)}
          >
            {presetLabel(p.id)}
          </button>
        ))}
      </div>
      <div className="lobby-row" role="group" aria-label={lobby.rated}>
        <button
          type="button"
          className="lobby-chip"
          aria-pressed={rated}
          disabled={disabled || pairing}
          onClick={() => setRated(true)}
        >
          {lobby.rated}
        </button>
        <button
          type="button"
          className="lobby-chip"
          aria-pressed={!rated}
          disabled={disabled || pairing}
          onClick={() => setRated(false)}
        >
          {lobby.casual}
        </button>
      </div>
      <div className="lobby-row" role="group" aria-label={lobby.colorRandom}>
        {(
          [
            ["random", lobby.colorRandom],
            ["white", lobby.colorWhite],
            ["black", lobby.colorBlack],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="lobby-chip"
            aria-pressed={color === value}
            disabled={disabled || pairing}
            onClick={() => setColor(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {pairing ? (
        <div className="lobby-actions">
          <p className="lobby-waiting" role="status">
            {lobby.waiting}
          </p>
          <button type="button" className="lobby-primary" onClick={onCancel}>
            {lobby.quickPairCancel}
          </button>
        </div>
      ) : (
        <div className="lobby-actions">
          <button
            type="button"
            className="lobby-primary"
            disabled={disabled}
            onClick={handleQuickPair}
          >
            {lobby.quickPair}
          </button>
          {disabled ? (
            <p className="lobby-muted" role="status">
              {lobby.matchmakingUnavailable}
            </p>
          ) : null}
          {lastError ? (
            <p className="game-error" role="alert">
              {lastError}
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}
