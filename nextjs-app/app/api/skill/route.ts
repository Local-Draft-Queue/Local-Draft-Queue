import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getDefaultPromptSkill, getPromptSkill, savePromptSkill } from "@/lib/skill-config";

export async function GET() {
  const skill = await getPromptSkill();
  return NextResponse.json({ skill });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const skill = await savePromptSkill(body);
    return NextResponse.json({ skill });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid skill payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to save skill configuration." }, { status: 500 });
  }
}

export async function POST() {
  const skill = await savePromptSkill(getDefaultPromptSkill());
  return NextResponse.json({ skill });
}
