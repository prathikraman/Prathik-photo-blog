import { cleanSlug, apiError, requireApiAdmin } from "../../../lib/api";
import { ensureContentSchema, getDb } from "../../../lib/content-db";

export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { title?: string; slug?: string; year?: string | number; meta?: string; intro?: string };
    const title = body.title?.trim();
    const slug = cleanSlug(body.slug || title || "");
    const year = Number(body.year);
    if (!title || !slug) throw new Error("Journey title and URL slug are required.");
    if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new Error("Enter a journey year between 1900 and 2100.");
    const db = getDb();
    await ensureContentSchema(db);
    const existing = await db.prepare("SELECT id FROM journeys WHERE slug = ?").bind(slug).first();
    if (existing) throw new Error(`A journey already exists at /journeys/${slug}. Select it from the journey list.`);
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO journeys (id, slug, title, year, meta, intro) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, slug, title, year, body.meta?.trim() ?? "", body.intro?.trim() ?? "").run();
    return Response.json({ id }, { status: 201 });
  } catch (error) { return apiError(error, "Could not create the journey"); }
}
