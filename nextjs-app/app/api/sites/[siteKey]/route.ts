import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ensureApiAuthorized } from "@/lib/auth-guards";
import { deleteSite, getSiteByKey, updateSite } from "@/lib/sites";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  const authResponse = await ensureApiAuthorized();
  if (authResponse) {
    return authResponse;
  }

  const { siteKey } = await params;
  const site = await getSiteByKey(siteKey);

  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  return NextResponse.json({ site });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  const authResponse = await ensureApiAuthorized();
  if (authResponse) {
    return authResponse;
  }

  const { siteKey } = await params;

  try {
    const body = await request.json();
    const site = await updateSite(siteKey, body);

    if (!site) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }

    return NextResponse.json({ site });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid site payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to update site." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  const authResponse = await ensureApiAuthorized();
  if (authResponse) {
    return authResponse;
  }

  const { siteKey } = await params;
  const deleted = await deleteSite(siteKey);

  if (!deleted) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
