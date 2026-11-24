import type { ChessRules } from "./types"
import wasmUrl from "./pkg/corvin_play_wasm_bg.wasm?url"

type WasmExports = {
  default: (module_or_path?: InitInput) => Promise<unknown>
  legalMoves: (fen: string) => string[]
  applyMove: (fen: string, uci: string) => string
}

type InitInput =
  | { module_or_path: RequestInfo | URL | Response | BufferSource | WebAssembly.Module }
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module

let rulesPromise: Promise<ChessRules> | null = null

/**
 * Load `corvin-play-wasm` (`--target web`): init then legalMoves/applyMove.
 * Memoized so Play mounts share one init. Failed inits clear the cache.
 */
export const loadWasmRules = async (): Promise<ChessRules> => {
  if (!rulesPromise) {
    rulesPromise = (async () => {
      try {
        const mod = (await import("./pkg/corvin_play_wasm.js")) as unknown as WasmExports
        await mod.default({ module_or_path: wasmUrl })
        return {
          legalMoves: (fen: string) => Array.from(mod.legalMoves(fen)),
          applyMove: (fen: string, uci: string) => mod.applyMove(fen, uci),
        }
      } catch (err) {
        rulesPromise = null
        throw err
      }
    })()
  }
  return rulesPromise
}

/** Test helper: clear memoized init. */
export const resetWasmRulesCache = (): void => {
  rulesPromise = null
}
