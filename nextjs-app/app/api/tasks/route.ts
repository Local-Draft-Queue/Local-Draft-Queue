import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ensureApiAuthorized } from "@/lib/auth-guards";
import { normalizeCreateTaskInput } from "@/lib/generation";
import { getSiteByKey } from "@/lib/sites";
import { createTask, listTasks } from "@/lib/tasks";

export async function GET() {
  const authResponse = await ensureApiAuthorized();
  if (authResponse) {
    return authResponse;
  }
  const tasks = await listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const authResponse = await ensureApiAuthorized();
  if (authResponse) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const input = normalizeCreateTaskInput(body);
    const site = await getSiteByKey(input.siteKey);
    if (!site) {
      return NextResponse.json(
        { error: "Saved WordPress site not found. Add it in /sites first." },
        { status: 400 },
      );
    }
    const task = await createTask(input);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid task payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to create task." }, { status: 500 });
  }
}
