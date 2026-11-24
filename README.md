<div align="center">

<a href="https://github.com/corvin-chess"><img src="https://capsule-render.vercel.app/api?type=waving&height=200&color=0:0b0d12,55:161b2b,100:2f3d63&text=Corvin&fontColor=e6e9f2&fontSize=64&fontAlignY=45&animation=twinkling" alt="Corvin" /></a>

<img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=500&size=16&color=8FA3D9&center=true&vCenter=true&width=560&height=34&duration=2800&pause=1200&lines=web;Vite+React+play+client+with+premoves+and+clocks." alt="web" />

<p>
  <a href="https://github.com/corvin-chess/web"><img src="https://skillicons.dev/icons?i=ts&theme=dark" width="44" height="44" alt="web" /></a>&nbsp;
  <a href="https://github.com/corvin-chess"><img src="https://skillicons.dev/icons?i=github&theme=dark" width="44" height="44" alt="GitHub" /></a>
</p>

</div>

<br/>

Vite React TypeScript play client with `/play` lobby quick pair, online clocks, single premoves with optional move confirm, and offers against [server](https://github.com/corvin-chess/server), local board legality via [chess-core](https://github.com/corvin-chess/chess-core) WASM, Corvid pieces, `/login` passkey plus email OTP auth, and a PROTOCOL WebSocket client with reconnect resume. Playwright two-browser CI and analysis stay Planned.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=OVERVIEW" alt="Overview" /></p>

TypeScript Vite React play client for Corvin. Signed-in `/play` opens a lobby with bullet/blitz/rapid quick pair, then an online board with server-authoritative clocks, a single client-side premove (auto-sent with `Move.premoved` when still legal), optional confirm-before-send, draw/takeback offers, resign, and abort. A Ravenboard from `@corvin-chess/design-system` with Corvid SVGs and a thin `corvin-play-wasm` bridge over [chess-core](https://github.com/corvin-chess/chess-core) keeps local and online move selection legal. `/login` covers passkey and email one-time-code flows against PROTOCOL `/api/v1/auth/*`. The `src/ws` client speaks PROTOCOL v1 Hello/Welcome/Ping, QuickPair/Move/offers, and reconnects with `ResumeGame`. Planned: Playwright two-browser CI, locales packages from [translations](https://github.com/corvin-chess/translations), and analysis via [engine](https://github.com/corvin-chess/engine) WASM. No third-party engines, piece sets, or trackers.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=GETTING+STARTED" alt="Getting Started" /></p>

```bash
git clone https://github.com/corvin-chess/web
cd web
npm install
npm run dev
```

Open the printed local URL and go to `/play` or `/login`. Sign in, then use Quick pair on `/play` (requires a local [server](https://github.com/corvin-chess/server) with Redis and Postgres). Without a session, `/play` still offers a local practice board. For auth and WebSocket, run the server on port 3000; Vite proxies `/api` and `/ws` to `http://127.0.0.1:3000`. Email OTP works over that proxy once the server can deliver or log codes. For passkeys, set the server `CORVIN_RP_ORIGIN` to the Vite origin (for example `http://localhost:5173`) and `CORVIN_RP_ID` to `localhost` so WebAuthn matches the browser page origin. Static build:

```bash
npm run build
npm run preview
```

Rebuild the committed WASM package (requires `wasm-pack` and the `wasm32-unknown-unknown` target):

```bash
npm run build:wasm
```

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=DEVELOPMENT" alt="Development" /></p>

`src/App.tsx` routes `/play` to `src/play/PlayPage.tsx` (lobby, online game chrome, local board) and `/login` to `src/auth/AuthPage.tsx` inside `AuthProvider`. Online session state lives in `src/play/onlineSession.ts` with clocks in `clockDisplay.ts`; `useOnlinePlay` binds the PROTOCOL `WsClient`. Premoves use `premoveGeometry` / `premove` and prefs in `playPrefs.ts`. Board legality lives in `src/chess` with the built package under `src/chess/pkg` from `crates/corvin-play-wasm`. Corvid SVGs are under `public/pieces/corvid`. Auth and play-shell strings live in `src/locales/{en,it}/`. Global styles in `src/styles.css` import `@corvin-chess/design-system/tokens.css`. The design-system dependency is pinned to a GitHub commit until `@corvin-chess` npm publish exists.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=TESTING" alt="Testing" /></p>

```bash
npm test
node scripts/verify-scaffold.mjs
node scripts/verify-auth.mjs
node scripts/verify-ws.mjs
node scripts/verify-board-play.mjs
node scripts/verify-play-ui.mjs
node scripts/verify-readme.mjs
npm run build
```

Play-ui checks cover lobby/online wiring, premove auto-fire + confirm prefs, WsClient GameStart handlers, and en/it play-shell parity. Vitest covers online session, clocks, premove geometry/resolve, prefs, WS send, and PlayPage lobby. Playwright two-browser rated games and Lighthouse budgets stay Planned (CV-197 / CV-320).

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=ARCHITECTURE" alt="Architecture" /></p>

Structure: `src/play` (lobby, online session, clocks, board shell), `src/chess` (WASM rules + controller), `src/auth` (passkey + email OTP client), `src/ws` (PROTOCOL client + resume), with Planned `src/analysis` and `public` assets. Server remains authoritative for clocks and legality on the wire; the client may show optimistic selection and must reconcile to protocol events. See organization ADRs and [website](https://github.com/corvin-chess/website) once docs are published.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=STATUS" alt="Status" /></p>

| Area | State |
|---|---|
| README | Built |
| Application scaffold | Built |
| Board play | Built |
| Play UI | Built |
| Premoves + confirm | Built |
| Analysis UI | Planned |
| Auth UI | Built |
| WS client | Built |
| Implementation | Planned |

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><sub><i>The board is where trust is earned: clear clocks, honest moves, no noise.</i></sub></p>

## License

This repository is licensed under AGPL-3.0-or-later. Corvid piece SVGs under `public/pieces/corvid` are CC BY-SA 4.0 (see `public/pieces/NOTICE.md`).

<img src="https://capsule-render.vercel.app/api?type=waving&section=footer&height=110&color=0:0b0d12,55:161b2b,100:2f3d63" alt="" width="100%" />
