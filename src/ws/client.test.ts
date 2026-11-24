import { afterEach, describe, expect, it, vi } from "vitest"
import { WsClient } from "./client"
import { createMockWebSocket, parseSent } from "./mockSocket"

describe("WsClient handshake + heartbeat", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("sends PROTOCOL Hello on open and records Welcome session_id", async () => {
    const mock = createMockWebSocket()
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "en",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 0,
    })

    const welcomeP = new Promise<string>((resolve) => {
      client.on("welcome", (msg) => resolve(msg.session_id))
    })

    client.connect()
    expect(mock.instances).toHaveLength(1)
    mock.instances[0]!.emitOpen()

    const sent = parseSent(mock.instances[0]!)
    expect(sent[0]).toEqual({
      typ: "Hello",
      v: 1,
      client: "web",
      locale: "en",
    })

    mock.instances[0]!.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "01SESSION",
      server_time: 1730000000000,
      features: [],
    })

    await expect(welcomeP).resolves.toBe("01SESSION")
    expect(client.sessionId).toBe("01SESSION")
    expect(client.status).toBe("ready")
    client.disconnect()
  })

  it("replies Pong to server Ping with same nonce", () => {
    const mock = createMockWebSocket()
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "it",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 0,
    })
    client.connect()
    const sock = mock.instances[0]!
    sock.emitOpen()
    sock.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "s1",
      server_time: 1,
      features: [],
    })
    sock.sent.length = 0
    sock.emitMessage({ typ: "Ping", v: 1, nonce: "n-42" })
    expect(parseSent(sock)).toEqual([{ typ: "Pong", v: 1, nonce: "n-42" }])
    client.disconnect()
  })
})

describe("WsClient reconnect + ResumeGame", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("on close reconnects and sends ResumeGame with last_seq", async () => {
    vi.useFakeTimers()
    const mock = createMockWebSocket()
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "en",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 10,
    })

    client.setResumeTarget({
      gameId: "01GAME",
      lastSeq: 7,
      playerToken: "tok-seat",
    })

    client.connect()
    const first = mock.instances[0]!
    first.emitOpen()
    first.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "s1",
      server_time: 1,
      features: [],
    })
    // Simulate having applied events up to seq 7 via tracker
    client.noteAppliedSeq(7)

    first.emitClose(1006, "drop")
    expect(client.status).toBe("reconnecting")

    await vi.advanceTimersByTimeAsync(10)
    expect(mock.instances).toHaveLength(2)
    const second = mock.instances[1]!
    second.emitOpen()

    const hello = parseSent(second)[0]
    expect(hello).toMatchObject({ typ: "Hello", v: 1, client: "web" })

    second.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "s2",
      server_time: 2,
      features: [],
    })

    const afterWelcome = parseSent(second).filter((m) => m.typ === "ResumeGame")
    expect(afterWelcome).toEqual([
      {
        typ: "ResumeGame",
        v: 1,
        game_id: "01GAME",
        last_seq: 7,
        player_token: "tok-seat",
      },
    ])
    client.disconnect()
  })

  it("applies GameSnapshot then Replay events and ignores duplicate seq", () => {
    const mock = createMockWebSocket()
    const applied: Array<{ typ: string; seq: number }> = []
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "en",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 0,
    })
    client.on("gameEvent", (ev) => {
      applied.push({ typ: ev.typ, seq: ev.seq })
    })
    client.setResumeTarget({
      gameId: "01GAME",
      lastSeq: 2,
      playerToken: "tok",
    })
    client.connect()
    const sock = mock.instances[0]!
    sock.emitOpen()
    sock.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "s1",
      server_time: 1,
      features: [],
    })

    sock.emitMessage({
      typ: "GameSnapshot",
      v: 1,
      game_id: "01GAME",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      clocks: { w: 60000, b: 60000 },
      active: "b",
      seq: 2,
    })
    expect(client.lastSeq).toBe(2)

    sock.emitMessage({
      typ: "Replay",
      v: 1,
      game_id: "01GAME",
      events: [
        {
          typ: "MoveApplied",
          seq: 3,
          uci: "e7e5",
          san: "e5",
          fen: "x",
          clocks: { w: 60000, b: 59000 },
          active: "w",
        },
        {
          typ: "MoveApplied",
          seq: 3,
          uci: "e7e5",
          san: "e5",
          fen: "x",
          clocks: { w: 60000, b: 59000 },
          active: "w",
        },
        {
          typ: "MoveApplied",
          seq: 4,
          uci: "g1f3",
          san: "Nf3",
          fen: "y",
          clocks: { w: 59000, b: 59000 },
          active: "b",
        },
      ],
    })

    expect(applied).toEqual([
      { typ: "MoveApplied", seq: 3 },
      { typ: "MoveApplied", seq: 4 },
    ])
    expect(client.lastSeq).toBe(4)
    client.disconnect()
  })

  it("clears resume target on GAME_GONE Error", () => {
    const mock = createMockWebSocket()
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "en",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 0,
    })
    let gone = false
    client.on("gameGone", () => {
      gone = true
    })
    client.setResumeTarget({
      gameId: "01GONE",
      lastSeq: 1,
      playerToken: "tok",
    })
    client.connect()
    const sock = mock.instances[0]!
    sock.emitOpen()
    sock.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "s1",
      server_time: 1,
      features: [],
    })
    sock.emitMessage({
      typ: "Error",
      v: 1,
      code: "GAME_GONE",
      message: "unknown game",
    })
    expect(gone).toBe(true)
    expect(client.resumeTarget).toBeNull()
    client.disconnect()
  })

  it("does not reconnect after intentional disconnect", async () => {
    vi.useFakeTimers()
    const mock = createMockWebSocket()
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "en",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 5,
    })
    client.connect()
    mock.instances[0]!.emitOpen()
    client.disconnect()
    await vi.advanceTimersByTimeAsync(50)
    expect(mock.instances).toHaveLength(1)
    expect(client.status).toBe("closed")
  })

  it("sends ResumeGame on initial Welcome when resume target is set", () => {
    const mock = createMockWebSocket()
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "en",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 0,
    })
    client.setResumeTarget({
      gameId: "01GAME",
      lastSeq: 3,
      playerToken: "tok",
    })
    client.connect()
    const sock = mock.instances[0]!
    sock.emitOpen()
    sock.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "s1",
      server_time: 1,
      features: [],
    })
    expect(parseSent(sock).filter((m) => m.typ === "ResumeGame")).toEqual([
      {
        typ: "ResumeGame",
        v: 1,
        game_id: "01GAME",
        last_seq: 3,
        player_token: "tok",
      },
    ])
    client.disconnect()
  })

  it("setResumeTarget resets seq so a lower lastSeq is not stuck ahead", () => {
    const mock = createMockWebSocket()
    const applied: number[] = []
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "en",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 0,
    })
    client.on("gameEvent", (ev) => applied.push(ev.seq))
    client.connect()
    const sock = mock.instances[0]!
    sock.emitOpen()
    sock.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "s1",
      server_time: 1,
      features: [],
    })
    client.setResumeTarget({ gameId: "g1", lastSeq: 5, playerToken: "a" })
    client.setResumeTarget({ gameId: "g2", lastSeq: 0, playerToken: "b" })
    sock.emitMessage({
      typ: "MoveApplied",
      v: 1,
      seq: 1,
      uci: "e2e4",
      san: "e4",
      fen: "x",
      clocks: { w: 1, b: 1 },
      active: "b",
    })
    expect(applied).toEqual([1])
    expect(client.lastSeq).toBe(1)
    client.disconnect()
  })

  it("ignores stale close from a replaced socket", async () => {
    vi.useFakeTimers()
    const mock = createMockWebSocket()
    const client = new WsClient({
      url: "ws://127.0.0.1:3000/ws",
      locale: "en",
      WebSocket: mock.WebSocket,
      reconnectDelayMs: () => 5,
    })
    client.connect()
    const first = mock.instances[0]!
    first.emitOpen()
    client.connect()
    expect(mock.instances).toHaveLength(2)
    const second = mock.instances[1]!
    second.emitOpen()
    first.emitClose(1006, "stale")
    await vi.advanceTimersByTimeAsync(50)
    expect(mock.instances).toHaveLength(2)
    expect(client.status).toBe("connecting")
    second.emitMessage({
      typ: "Welcome",
      v: 1,
      session_id: "keep",
      server_time: 1,
      features: [],
    })
    expect(client.status).toBe("ready")
    expect(client.sessionId).toBe("keep")
    client.disconnect()
  })
})

describe("wsUrl", () => {
  it("maps http page origin to ws and https to wss with /ws path", async () => {
    const { wsUrlFromPage } = await import("./url")
    expect(wsUrlFromPage("http://localhost:5173/play")).toBe("ws://localhost:5173/ws")
    expect(wsUrlFromPage("https://play.corvin.example/")).toBe(
      "wss://play.corvin.example/ws"
    )
  })
})
