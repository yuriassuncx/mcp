export interface CustomBotState {
  customBotName?: string;
  isCustomBot?: boolean;
  sessionToken?: string;
  [key: string]: unknown;
}

export function generateSessionToken(): string {
  // Resolve whatever WebCrypto might be available, either on globalThis or as the legacy `crypto` global
  const webCrypto: Crypto | undefined = (typeof globalThis !== "undefined" &&
    (globalThis.crypto as Crypto | undefined)) ||
    (typeof crypto !== "undefined" ? (crypto as Crypto) : undefined);

  // Prefer crypto.randomUUID() when available
  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }

  // Ensure getRandomValues is available before falling back
  if (!webCrypto?.getRandomValues) {
    throw new Error(
      "Web Crypto API is not available; register a crypto polyfill before calling generateSessionToken().",
    );
  }

  // Fallback: fill 32 bytes of randomness and base64-URL-encode them
  const array = new Uint8Array(32);
  webCrypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Session store for custom bot credentials
const sessionStore = new Map<string, {
  clientId: string;
  clientSecret: string;
  botName?: string;
  expiresAt: number;
}>();

export function storeCustomBotSession(
  clientId: string,
  clientSecret: string,
  botName?: string,
): string {
  const sessionToken = generateSessionToken();
  const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes expiry

  sessionStore.set(sessionToken, {
    clientId,
    clientSecret,
    botName,
    expiresAt,
  });

  return sessionToken;
}

export function retrieveCustomBotSession(sessionToken: string): {
  clientId: string;
  clientSecret: string;
  botName?: string;
} | null {
  const session = sessionStore.get(sessionToken);

  if (!session) {
    return null;
  }

  // Check expiration
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(sessionToken);
    return null;
  }

  // Don't delete on retrieval - allow multiple uses during OAuth flow
  return {
    clientId: session.clientId,
    clientSecret: session.clientSecret,
    botName: session.botName,
  };
}

export function invalidateSession(sessionToken: string): void {
  sessionStore.delete(sessionToken);
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessionStore.entries()) {
    if (now > session.expiresAt) {
      sessionStore.delete(token);
    }
  }
}
