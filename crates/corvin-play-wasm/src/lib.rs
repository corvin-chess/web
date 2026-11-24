//! Browser/Node WASM surface for local board play (CV-193).
//!
//! Wraps `corvin-chess-core` until CV-108 upstreams `applyMove` into chess-core's
//! own `wasm` feature. Keep this crate thin: FEN in, UCI strings out, no search.

#![allow(clippy::incompatible_msrv)]

use corvin_chess_core::{Move, Position};
use wasm_bindgen::prelude::*;

const MAX_FEN_LEN: usize = 256;
const MAX_UCI_LEN: usize = 8;

fn parse_position(fen: &str) -> Result<Position, JsValue> {
    if fen.len() > MAX_FEN_LEN {
        return Err(JsValue::from_str("invalid FEN: input too long"));
    }
    Position::from_fen(fen).map_err(|e| JsValue::from_str(&format!("invalid FEN: {e}")))
}

/// Legal moves for `fen` as UCI strings (`e2e4`, `a7a8q`).
#[wasm_bindgen(js_name = legalMoves)]
pub fn legal_moves(fen: &str) -> Result<Vec<String>, JsValue> {
    let position = parse_position(fen)?;
    Ok(position
        .legal_moves()
        .into_iter()
        .map(Move::to_uci)
        .collect())
}

/// Apply a legal UCI move; returns the resulting FEN.
#[wasm_bindgen(js_name = applyMove)]
pub fn apply_move(fen: &str, uci: &str) -> Result<String, JsValue> {
    if uci.len() > MAX_UCI_LEN {
        return Err(JsValue::from_str("invalid UCI: input too long"));
    }
    let position = parse_position(fen)?;
    let mv =
        Move::from_uci(uci).map_err(|_| JsValue::from_str("invalid UCI: parse failed"))?;
    let next = position
        .try_make_move(mv)
        .ok_or_else(|| JsValue::from_str("illegal move"))?;
    Ok(next.to_fen())
}
