import { apiError, requireApiAdmin } from "../../../../lib/api";
import { ensureContentSchema, getDb } from "../../../../lib/content-db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const body = await request.json() as { title?: string; year?: string | number; meta?: string; intro?: string };
    const title = body.title?.trim();
    const year = Number(body.year);
    if (!title) throw new Error("Journey name is required.");
    if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new Error("Enter a journey year between 1900 and 2100.");
    const db = getDb();
    await ensureContentSchema(db);
    const journey = await db.prepare("SELECT id FROM journeys WHERE id = ?").bind(id).first();
    if (!journey) throw new Error("Journey not found.");
    await db.prepare("UPDATE journeys SET title = ?, year = ?, meta = ?, intro = ?, updated_at = unixepoch() WHERE id = ?")
      .bind(title, year, body.meta?.trim() ?? "", body.intro?.trim() ?? "", id).run();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, "Could not update the journey"); }
}
