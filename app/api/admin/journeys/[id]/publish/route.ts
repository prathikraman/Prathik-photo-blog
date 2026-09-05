import { apiError, requireApiAdmin } from "../../../../../lib/api";
import { ensureContentSchema, getDb } from "../../../../../lib/content-db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const body = await request.json() as { status?: "draft" | "published" };
    if (body.status !== "draft" && body.status !== "published") throw new Error("Choose draft or published status.");
    const db = getDb();
    await ensureContentSchema(db);
    if (body.status === "published") {
      const count = await db.prepare("SELECT COUNT(*) AS value FROM photos WHERE journey_id = ?").bind(id).first<{ value: number }>();
      if (!count?.value) throw new Error("Upload at least one photo before publishing.");
    }
    await db.prepare("UPDATE journeys SET status = ?, updated_at = unixepoch() WHERE id = ?").bind(body.status, id).run();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, "Could not change publish status"); }
}
