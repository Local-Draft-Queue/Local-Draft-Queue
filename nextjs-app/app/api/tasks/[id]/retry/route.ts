import { NextResponse } from "next/server";

import { ensureApiAuthorized } from "@/lib/auth-guards";
import { WorkerRequestError, generateDraftForTask } from "@/lib/generation";
import { TaskStateConflictError } from "@/lib/tasks";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResponse = await ensureApiAuthorized();
  if (authResponse) {
    return authResponse;
  }

  const { id } = await params;

  try {
    const task = await generateDraftForTask(id);
    const status = task.status === "failed" ? 422 : 200;
    return NextResponse.json({ task }, { status });
  } catch (error) {
    if (error instanceof TaskStateConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof WorkerRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unable to retry task." }, { status: 500 });
  }
}
