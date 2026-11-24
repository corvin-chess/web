/**
 * Minimal WebAuthn helpers for webauthn-rs JSON (base64url binary fields).
 * Converts CreationChallengeResponse / RequestChallengeResponse for the browser API
 * and serializes PublicKeyCredential back to JSON for finish endpoints.
 */

const b64urlToBytes = (value: string): ArrayBuffer => {
  const pad = "=".repeat((4 - (value.length % 4)) % 4)
  const b64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/")
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i)
  }
  return out.buffer
}

const bytesToB64url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let bin = ""
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]!)
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

const isB64String = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0

/** Clone CCR/RCR and replace base64url challenge / user.id / allowCredentials.id with ArrayBuffers. */
export const prepareCredentialOptions = (
  challengeResponse: Record<string, unknown>
): CredentialCreationOptions | CredentialRequestOptions => {
  const pk = challengeResponse.publicKey
  if (!pk || typeof pk !== "object") {
    throw new Error("missing publicKey in challenge response")
  }
  const options = structuredClone(pk) as Record<string, unknown>

  if (isB64String(options.challenge)) {
    options.challenge = b64urlToBytes(options.challenge)
  }

  const user = options.user
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>
    if (isB64String(u.id)) {
      u.id = b64urlToBytes(u.id)
    }
  }

  for (const key of ["excludeCredentials", "allowCredentials"] as const) {
    const list = options[key]
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (!item || typeof item !== "object") continue
      const cred = item as Record<string, unknown>
      if (isB64String(cred.id)) {
        cred.id = b64urlToBytes(cred.id)
      }
    }
  }

  return { publicKey: options } as unknown as CredentialCreationOptions
}

export const supportsPasskeys = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.PublicKeyCredential !== "undefined" &&
  typeof navigator.credentials?.create === "function"

export const createPasskeyCredential = async (
  challengeResponse: Record<string, unknown>
): Promise<unknown> => {
  if (!supportsPasskeys()) {
    throw new Error("passkey unsupported")
  }
  const options = prepareCredentialOptions(challengeResponse) as CredentialCreationOptions
  const cred = (await navigator.credentials.create(options)) as PublicKeyCredential | null
  if (!cred) throw new Error("passkey cancelled")
  return serializePublicKeyCredential(cred)
}

export const getPasskeyCredential = async (
  challengeResponse: Record<string, unknown>
): Promise<unknown> => {
  if (!supportsPasskeys()) {
    throw new Error("passkey unsupported")
  }
  const options = prepareCredentialOptions(challengeResponse) as CredentialRequestOptions
  const cred = (await navigator.credentials.get(options)) as PublicKeyCredential | null
  if (!cred) throw new Error("passkey cancelled")
  return serializePublicKeyCredential(cred)
}

const serializePublicKeyCredential = (cred: PublicKeyCredential): Record<string, unknown> => {
  const response = cred.response
  const base: Record<string, unknown> = {
    id: cred.id,
    rawId: bytesToB64url(cred.rawId),
    type: cred.type,
  }

  if (response instanceof AuthenticatorAttestationResponse) {
    base.response = {
      clientDataJSON: bytesToB64url(response.clientDataJSON),
      attestationObject: bytesToB64url(response.attestationObject),
      transports:
        typeof response.getTransports === "function" ? response.getTransports() : undefined,
    }
  } else if (response instanceof AuthenticatorAssertionResponse) {
    base.response = {
      clientDataJSON: bytesToB64url(response.clientDataJSON),
      authenticatorData: bytesToB64url(response.authenticatorData),
      signature: bytesToB64url(response.signature),
      userHandle: response.userHandle ? bytesToB64url(response.userHandle) : null,
    }
  } else {
    throw new Error("unknown credential response")
  }

  return base
}
