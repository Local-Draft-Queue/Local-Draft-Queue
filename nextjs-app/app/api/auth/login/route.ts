import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AUTH_COOKIE_NAME,
  createAuthToken,
  isUiAuthConfigured,
  isValidPasswordAttempt,
  sanitizeNextPath,
} from "@/lib/auth";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required."),
  next: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isUiAuthConfigured()) {
    return NextResponse.json(
      { error: "UI_AUTH_PASSWORD is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const input = loginSchema.parse(body);

    if (!isValidPasswordAttempt(input.password)) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: sanitizeNextPath(input.next),
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: createAuthToken(input.password),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }
}
