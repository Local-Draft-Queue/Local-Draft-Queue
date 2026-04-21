import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, isUiAuthConfigured, isValidSessionToken } from "@/lib/auth";

interface AuthGuardOptions {
  allowWhenUnconfigured?: boolean;
  nextPath?: string;
}

export async function getAuthState() {
  const configured = await isUiAuthConfigured();
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const authenticated = configured ? await isValidSessionToken(token) : false;

  return {
    configured,
    authenticated,
  };
}

export async function requirePageAuth(options: AuthGuardOptions = {}) {
  const state = await getAuthState();
  const loginPath = options.nextPath
    ? `/login?next=${encodeURIComponent(options.nextPath)}`
    : "/login";

  if (!state.configured) {
    if (options.allowWhenUnconfigured) {
      return state;
    }
    redirect("/setup");
  }

  if (!state.authenticated) {
    redirect(loginPath);
  }

  return state;
}

export async function ensureApiAuthorized(options: AuthGuardOptions = {}) {
  const state = await getAuthState();

  if (!state.configured) {
    if (options.allowWhenUnconfigured) {
      return null;
    }
    return NextResponse.json({ error: "UI auth password is not configured." }, { status: 500 });
  }

  if (!state.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}
