# corvin-play-wasm

Thin WASM bridge used by the Corvin web client for local board legality (CV-193 / CV-196).

Exports:

- `legalMoves(fen) -> string[]` (UCI)
- `applyMove(fen, uci) -> string` (FEN)
- `toSan(fen, uci) -> string` (SAN, with `+` / `#` when applicable)

Depends on [chess-core](https://github.com/corvin-chess/chess-core) at a pinned git revision. When CV-108 upstreams `applyMove` into chess-core's own WASM package, this crate can be removed.

Rebuild (from this directory):

```bash
wasm-pack build --target web --out-dir ../../src/chess/pkg --release
rm -f ../../src/chess/pkg/.gitignore
```

The built `src/chess/pkg` is committed so CI does not require a Rust toolchain.
