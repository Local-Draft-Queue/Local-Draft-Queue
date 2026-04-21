import { NextResponse } from "next/server";

import { WorkerRequestError, generateDraftForTask } from "@/lib/generation";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const task = await generateDraftForTask(id);
    const status = task.status === "failed" ? 422 : 200;
    return NextResponse.json({ task }, { status });
  } catch (error) {
    if (error instanceof WorkerRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unable to retry task." }, { status: 500 });
  }
}
