import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

// Local server default (CV-130). Override via Vite `server.proxy` if needed.
const apiTarget = "http://127.0.0.1:3000"

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
      // PROTOCOL WebSocket path (CV-192); upgrade to local server.
      "/ws": {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
})
