import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ensureApiAuthorized } from "@/lib/auth-guards";
import { AUTH_COOKIE_NAME, createAuthToken } from "@/lib/auth";
import { getRuntimeConfig, saveRuntimeConfig } from "@/lib/runtime-config";

export async function GET() {
  const authResponse = await ensureApiAuthorized({ allowWhenUnconfigured: true });
  if (authResponse) {
    return authResponse;
  }

  const config = await getRuntimeConfig();
  return NextResponse.json({ config });
}

export async function PUT(request: Request) {
  const authResponse = await ensureApiAuthorized({ allowWhenUnconfigured: true });
  if (authResponse) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const config = await saveRuntimeConfig(body);
    const response = NextResponse.json({ config });

    if (config.uiAuthPassword.trim()) {
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: createAuthToken(config.uiAuthPassword),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    } else {
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0),
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid runtime settings payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to save runtime settings." }, { status: 500 });
  }
}
