import { apiError, requireApiAdmin } from "../../../../lib/api";
import { ensureContentSchema, getDb } from "../../../../lib/content-db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const body = await request.json() as { title?: string; note?: string };
    const title = body.title?.trim();
    if (!title) throw new Error("Chapter name is required.");
    const db = getDb();
    await ensureContentSchema(db);
    const chapter = await db.prepare("SELECT id FROM chapters WHERE id = ?").bind(id).first();
    if (!chapter) throw new Error("Chapter not found.");
    await db.prepare("UPDATE chapters SET title = ?, note = ? WHERE id = ?")
      .bind(title, body.note?.trim() ?? "", id).run();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, "Could not update the chapter"); }
}
