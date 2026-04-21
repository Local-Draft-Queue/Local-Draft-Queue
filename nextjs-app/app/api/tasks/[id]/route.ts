import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { normalizeCreateTaskInput } from "@/lib/generation";
import { getSiteByKey } from "@/lib/sites";
import { deleteTask, getTaskById, replaceTaskInput } from "@/lib/tasks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

    const task = await replaceTaskInput(id, input);
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid task payload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to update task." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deleted = await deleteTask(id);

  if (!deleted) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
