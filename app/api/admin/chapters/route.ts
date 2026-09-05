import { cleanSlug, apiError, requireApiAdmin } from "../../../lib/api";
import { ensureContentSchema, getDb } from "../../../lib/content-db";

export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { journeyId?: string; title?: string; slug?: string; note?: string };
    const title = body.title?.trim();
    const slug = cleanSlug(body.slug || title || "");
    if (!body.journeyId || !title || !slug) throw new Error("Journey and chapter title are required.");
    const db = getDb();
    await ensureContentSchema(db);
    const existing = await db.prepare("SELECT id FROM chapters WHERE journey_id = ? AND slug = ?").bind(body.journeyId, slug).first();
    if (existing) throw new Error(`A chapter named ${title} already exists in this journey. Select it from the chapter tabs.`);
    const position = await db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS value FROM chapters WHERE journey_id = ?")
      .bind(body.journeyId).first<{ value: number }>();
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO chapters (id, journey_id, slug, title, note, position) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, body.journeyId, slug, title, body.note?.trim() ?? "", position?.value ?? 0).run();
    return Response.json({ id }, { status: 201 });
  } catch (error) { return apiError(error, "Could not create the chapter"); }
}
