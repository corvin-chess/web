import type { PlayShellLocale } from "../locales"
import type { PlayPrefs } from "./playPrefs"
import type { SoundEvent } from "./soundEvent"
import { SOUND_EVENTS } from "./soundEvent"
import type { ThemePref } from "./theme"
import { unlockSoundPlayer } from "./soundPlayer"

type PrefsControlsProps = {
  strings: PlayShellLocale["prefs"]
  prefs: PlayPrefs
  onChange: (next: PlayPrefs) => void
}

const THEMES: ThemePref[] = ["system", "light", "dark"]

const eventLabel = (
  strings: PlayShellLocale["prefs"],
  event: SoundEvent
): string => {
  switch (event) {
    case "move":
      return strings.soundMove
    case "capture":
      return strings.soundCapture
    case "check":
      return strings.soundCheck
    case "game-end":
      return strings.soundGameEnd
    case "offer":
      return strings.soundOffer
  }
}

export const PrefsControls = ({
  strings,
  prefs,
  onChange,
}: PrefsControlsProps) => {
  const handleThemeChange = (theme: ThemePref) => {
    unlockSoundPlayer()
    onChange({ ...prefs, theme })
  }

  const handleMuteChange = (soundMuted: boolean) => {
    unlockSoundPlayer()
    onChange({ ...prefs, soundMuted })
  }

  const handleEventChange = (event: SoundEvent, enabled: boolean) => {
    unlockSoundPlayer()
    onChange({
      ...prefs,
      soundEvents: { ...prefs.soundEvents, [event]: enabled },
    })
  }

  return (
    <section className="prefs-controls" aria-label={strings.title}>
      <h2 className="prefs-title">{strings.title}</h2>
      <label className="prefs-field">
        <span>{strings.theme}</span>
        <select
          value={prefs.theme}
          aria-label={strings.theme}
          onChange={(e) => handleThemeChange(e.target.value as ThemePref)}
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {t === "system"
                ? strings.themeSystem
                : t === "light"
                  ? strings.themeLight
                  : strings.themeDark}
            </option>
          ))}
        </select>
      </label>
      <label className="prefs-field prefs-check">
        <input
          type="checkbox"
          checked={prefs.soundMuted}
          aria-controls="prefs-sound-events"
          onChange={(e) => handleMuteChange(e.target.checked)}
        />
        {strings.soundMute}
      </label>
      <fieldset
        id="prefs-sound-events"
        className="prefs-events"
        disabled={prefs.soundMuted}
      >
        <legend>{strings.soundEvents}</legend>
        {SOUND_EVENTS.map((event) => (
          <label key={event} className="prefs-field prefs-check">
            <input
              type="checkbox"
              checked={prefs.soundEvents[event]}
              onChange={(e) => handleEventChange(event, e.target.checked)}
            />
            {eventLabel(strings, event)}
          </label>
        ))}
      </fieldset>
    </section>
  )
}
