import { describe, expect, it } from "vitest"
import { prepareCredentialOptions } from "./webauthn"

describe("prepareCredentialOptions", () => {
  it("converts base64url challenge and user.id to ArrayBuffers", () => {
    const prepared = prepareCredentialOptions({
      publicKey: {
        challenge: "AQID",
        rp: { name: "Corvin", id: "localhost" },
        user: { id: "AAEC", name: "raven", displayName: "raven" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        excludeCredentials: [{ type: "public-key", id: "BQQ" }],
      },
    }) as CredentialCreationOptions

    const pk = prepared.publicKey!
    expect(pk.challenge).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(pk.challenge as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]))
    expect(pk.user!.id).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(pk.user!.id as ArrayBuffer)).toEqual(new Uint8Array([0, 1, 2]))
    const excluded = pk.excludeCredentials![0]!
    expect(excluded.id).toBeInstanceOf(ArrayBuffer)
  })

  it("converts allowCredentials for assertion options", () => {
    const prepared = prepareCredentialOptions({
      publicKey: {
        challenge: "AQID",
        allowCredentials: [{ type: "public-key", id: "AAEC" }],
      },
    }) as CredentialRequestOptions

    const allowed = prepared.publicKey!.allowCredentials![0]!
    expect(allowed.id).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(allowed.id as ArrayBuffer)).toEqual(new Uint8Array([0, 1, 2]))
  })
})
