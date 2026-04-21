import { createHash } from "crypto";

import { getRuntimeConfig } from "@/lib/runtime-config";

export const AUTH_COOKIE_NAME = "ldq_session";
const AUTH_TOKEN_NAMESPACE = "local-draft-queue";

export async function getConfiguredUiPassword(): Promise<string> {
  const config = await getRuntimeConfig();
  return config.uiAuthPassword.trim();
}

export async function isUiAuthConfigured(): Promise<boolean> {
  return (await getConfiguredUiPassword()).length > 0;
}

export function createAuthToken(password: string): string {
  return createHash("sha256")
    .update(`${AUTH_TOKEN_NAMESPACE}:${password}`, "utf8")
    .digest("base64url");
}

export async function getExpectedAuthToken(): Promise<string> {
  const password = await getConfiguredUiPassword();
  return password ? createAuthToken(password) : "";
}

export async function isValidPasswordAttempt(password: string): Promise<boolean> {
  const configured = await getConfiguredUiPassword();
  return Boolean(configured) && password === configured;
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const expected = await getExpectedAuthToken();
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
