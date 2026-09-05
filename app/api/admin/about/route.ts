import { apiError, requireApiAdmin } from "../../../lib/api";
import { ensureContentSchema, getDb } from "../../../lib/content-db";

export async function PATCH(request: Request) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as Record<string, unknown>;
    const value = (key: string) => String(body[key] ?? "").trim();
    const introHeading = value("introHeading");
    const introBody = value("introBody");
    const approachHeading = value("approachHeading");
    const approachBody = value("approachBody");
    const gear = value("gear");
    const instagramUrl = value("instagramUrl");
    if (!introHeading || !introBody || !approachHeading || !approachBody) throw new Error("Complete the introduction and approach fields.");
    if (instagramUrl && !/^https:\/\//i.test(instagramUrl)) throw new Error("Instagram link must start with https://");
    const db = getDb();
    await ensureContentSchema(db);
    await db.prepare("UPDATE about_content SET intro_heading = ?, intro_body = ?, approach_heading = ?, approach_body = ?, gear = ?, instagram_url = ?, updated_at = unixepoch() WHERE id = 'about'")
      .bind(introHeading, introBody, approachHeading, approachBody, gear, instagramUrl).run();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, "Could not update the About page"); }
}
