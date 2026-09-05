import type { EditorialBlock } from "../../../../types";
import { apiError, requireApiAdmin } from "../../../../lib/api";
import { ensureContentSchema, getDb } from "../../../../lib/content-db";
import { getPlatformEnv } from "../../../../lib/platform";

const allowedLayouts = new Set<EditorialBlock["type"]>(["fullBleed", "single", "pair", "leadDetail", "portraitFocus", "sequence", "storyMoment"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const body = await request.json() as { alt?: string; caption?: string; layoutType?: EditorialBlock["type"]; storyTitle?: string; storyBody?: string; storyAlignment?: "left" | "right"; hero?: boolean };
    if (body.layoutType && !allowedLayouts.has(body.layoutType)) throw new Error("Choose a valid layout.");
    if (body.storyAlignment && body.storyAlignment !== "left" && body.storyAlignment !== "right") throw new Error("Choose a valid story alignment.");
    const db = getDb();
    await ensureContentSchema(db);
    const photo = await db.prepare("SELECT journey_id FROM photos WHERE id = ?").bind(id).first<{ journey_id: string }>();
    if (!photo) throw new Error("Photo not found.");
    await db.prepare("UPDATE photos SET alt = COALESCE(?, alt), caption = COALESCE(?, caption), layout_type = COALESCE(?, layout_type), story_title = COALESCE(?, story_title), story_body = COALESCE(?, story_body), story_alignment = COALESCE(?, story_alignment) WHERE id = ?")
      .bind(body.alt ?? null, body.caption ?? null, body.layoutType ?? null, body.storyTitle?.trim() ?? null, body.storyBody?.trim() ?? null, body.storyAlignment ?? null, id).run();
    if (body.hero) await db.prepare("UPDATE journeys SET hero_photo_id = ?, updated_at = unixepoch() WHERE id = ?").bind(id, photo.journey_id).run();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, "Could not update the photo"); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const db = getDb();
    const bucket = getPlatformEnv().PHOTOS;
    if (!bucket) throw new Error("Photo storage is unavailable.");
    await ensureContentSchema(db);
    const photo = await db.prepare("SELECT object_key FROM photos WHERE id = ?").bind(id).first<{ object_key: string }>();
    if (!photo) throw new Error("Photo not found.");
    await db.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
    await bucket.delete(photo.object_key);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, "Could not remove the photo"); }
}
