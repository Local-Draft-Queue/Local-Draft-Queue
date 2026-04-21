import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ensureApiAuthorized } from "@/lib/auth-guards";
import { listSites, saveSite } from "@/lib/sites";

export async function GET() {
  const authResponse = await ensureApiAuthorized();
  if (authResponse) {
    return authResponse;
  }
  const sites = await listSites();
  return NextResponse.json({ sites });
}

export async function POST(request: Request) {
  const authResponse = await ensureApiAuthorized();
  if (authResponse) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const site = await saveSite(body);
    return NextResponse.json({ site }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid site payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to save site." }, { status: 500 });
  }
}
