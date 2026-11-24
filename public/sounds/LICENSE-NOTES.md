# Play sound license notes (mute-safe)

These files are original Corvin synthesis (deterministic PCM generators in
`scripts/synthesize-sounds.mjs`). They contain no third-party recordings or
samples.

## License

Licensed under CC BY-SA 4.0, same as the rest of this repository. See `LICENSE`
at the repository root.

## Mute-safe use

Mute is allowed. Clients have no obligation to play these sounds. Ship a master
mute and per-event toggles; respect user preference and reduced-motion / quiet
modes. Default-on for move and capture, and quiet by default for any future
spectator crowd effects, matches the organization design document.

## Files

| File | Event |
|---|---|
| `move.wav` | Quiet piece move |
| `capture.wav` | Capture |
| `check.wav` | Check |
| `game-end.wav` | Game finished |
| `offer.wav` | Draw, takeback, or rematch offer |
