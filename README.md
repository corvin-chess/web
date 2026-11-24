<div align="center">

<a href="https://github.com/corvin-chess"><img src="https://capsule-render.vercel.app/api?type=waving&height=200&color=0:0b0d12,55:161b2b,100:2f3d63&text=Corvin&fontColor=e6e9f2&fontSize=64&fontAlignY=45&animation=twinkling" alt="Corvin" width="100%" /></a>

<img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=500&size=16&color=8FA3D9&center=true&vCenter=true&width=560&height=34&duration=2800&pause=1200&lines=web;Vite+React+play+client+with+auth+and+WS+resume." alt="web" />

<p>
  <a href="https://github.com/corvin-chess/web"><img src="https://skillicons.dev/icons?i=ts&theme=dark" width="44" height="44" alt="web" /></a>&nbsp;
  <a href="https://github.com/corvin-chess"><img src="https://skillicons.dev/icons?i=github&theme=dark" width="44" height="44" alt="GitHub" /></a>
</p>

</div>

<br/>

Vite React TypeScript play client with a blank `/play` route, `/login` passkey plus email OTP auth, and a PROTOCOL WebSocket client with reconnect resume against [server](https://github.com/corvin-chess/server). Lobby, live board play, and analysis stay Planned.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=OVERVIEW" alt="Overview" /></p>

TypeScript Vite React play client for Corvin. The application scaffold mounts a blank `/play` shell that imports CSS tokens from `@corvin-chess/design-system`, plus `/login` for passkey and email one-time-code flows that call PROTOCOL `/api/v1/auth/*` with session cookies and CSRF logout. The `src/ws` client speaks PROTOCOL v1 Hello/Welcome/Ping and reconnects with `ResumeGame` (`last_seq` + snapshot/replay seq dedupe). Planned surfaces: board play via [chess-core](https://github.com/corvin-chess/chess-core) WASM, lobby and clocks against [server](https://github.com/corvin-chess/server), locales from [translations](https://github.com/corvin-chess/translations), and analysis via [engine](https://github.com/corvin-chess/engine) WASM. No third-party engines, piece sets, or trackers.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=GETTING+STARTED" alt="Getting Started" /></p>

```bash
git clone https://github.com/corvin-chess/web
cd web
npm install
npm run dev
```

Open the printed local URL and go to `/play` or `/login`. For auth and WebSocket against a local [server](https://github.com/corvin-chess/server), run the server on port 3000; Vite proxies `/api` and `/ws` to `http://127.0.0.1:3000`. Email OTP works over that proxy once the server can deliver or log codes. For passkeys, set the server `CORVIN_RP_ORIGIN` to the Vite origin (for example `http://localhost:5173`) and `CORVIN_RP_ID` to `localhost` so WebAuthn matches the browser page origin. Static build:

```bash
npm run build
npm run preview
```

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=DEVELOPMENT" alt="Development" /></p>

`src/App.tsx` routes `/play` to `src/play/PlayPage.tsx` and `/login` to `src/auth/AuthPage.tsx` inside `AuthProvider`. Auth strings live in `src/locales/{en,it}/auth.json`. Real-time helpers live in `src/ws` (`WsClient`, seq tracker, `wsUrlFromPage`). Global styles in `src/styles.css` import `@corvin-chess/design-system/tokens.css`. The design-system dependency is pinned to a GitHub commit until `@corvin-chess` npm publish exists. Local play against a Compose stack from [infra](https://github.com/corvin-chess/infra) remains Planned until the real web image replaces the interim stub.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=TESTING" alt="Testing" /></p>

```bash
npm test
node scripts/verify-scaffold.mjs
node scripts/verify-auth.mjs
node scripts/verify-ws.mjs
node scripts/verify-readme.mjs
npm run build
```

WS reconnect/resume unit tests cover Hello/Welcome/Ping, `ResumeGame` after drop, snapshot+replay dedupe, and `GAME_GONE`. Playwright two-browser games, Lighthouse budgets, and full accessibility audits stay Planned.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=ARCHITECTURE" alt="Architecture" /></p>

Structure: `src/play` (blank shell), `src/auth` (passkey + email OTP client), `src/ws` (PROTOCOL client + resume), with Planned `src/analysis` and `public` assets. Server is authoritative for clocks and legality on the wire; the client may show optimistic UI and must reconcile to protocol events. See organization ADRs and [website](https://github.com/corvin-chess/website) once docs are published.

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=18&color=8FA3D9&center=true&vCenter=true&width=420&height=40&duration=1&pause=1000000&letterSpacing=6px&lines=STATUS" alt="Status" /></p>

| Area | State |
|---|---|
| README | Built |
| Application scaffold | Built |
| Play UI | Planned |
| Analysis UI | Planned |
| Auth UI | Built |
| WS client | Built |
| Implementation | Planned |

<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:0b0d12,35:8fa3d9,70:c9a227,100:0b0d12" width="100%" alt="" />

<br/>

<p align="center"><sub><i>The board is where trust is earned: clear clocks, honest moves, no noise.</i></sub></p>

## License

This repository is licensed under AGPL-3.0-or-later.

<img src="https://capsule-render.vercel.app/api?type=waving&section=footer&height=110&color=0:0b0d12,55:161b2b,100:2f3d63" alt="" width="100%" />
