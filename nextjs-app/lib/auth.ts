import { createHash } from "crypto";

export const AUTH_COOKIE_NAME = "ldq_session";
const AUTH_TOKEN_NAMESPACE = "local-draft-queue";

export function getConfiguredUiPassword(): string {
  return process.env.UI_AUTH_PASSWORD?.trim() ?? "";
}

export function isUiAuthConfigured(): boolean {
  return getConfiguredUiPassword().length > 0;
}

export function createAuthToken(password: string): string {
  return createHash("sha256")
    .update(`${AUTH_TOKEN_NAMESPACE}:${password}`, "utf8")
    .digest("base64url");
}

export function getExpectedAuthToken(): string {
  const password = getConfiguredUiPassword();
  return password ? createAuthToken(password) : "";
}

export function isValidPasswordAttempt(password: string): boolean {
  const configured = getConfiguredUiPassword();
  return Boolean(configured) && password === configured;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const expected = getExpectedAuthToken();
  return Boolean(expected) && token === expected;
}

export function sanitizeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  if (value === "/login" || value.startsWith("/login?")) {
    return "/dashboard";
  }

  return value;
}
