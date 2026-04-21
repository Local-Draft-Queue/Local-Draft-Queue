export const AUTH_COOKIE_NAME = "ldq_session";
const AUTH_TOKEN_NAMESPACE = "local-draft-queue";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createAuthToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${AUTH_TOKEN_NAMESPACE}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

export async function isValidSessionTokenEdge(
  token: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!token || !password?.trim()) {
    return false;
  }

  const expected = await createAuthToken(password.trim());
  return token === expected;
}
