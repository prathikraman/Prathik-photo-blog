import type { EditorialBlock } from "../../../../../types";
import { apiError, requireApiAdmin } from "../../../../../lib/api";
import { ensureContentSchema, getDb } from "../../../../../lib/content-db";

type LayoutType = EditorialBlock["type"];
type CompositionBlock = { layoutType?: LayoutType; photoIds?: string[]; storyTitle?: string; storyBody?: string; storyAlignment?: "left" | "right" };

const allowedLayouts = new Set<LayoutType>(["fullBleed", "single", "pair", "leadDetail", "portraitFocus", "sequence", "storyMoment"]);

function validCount(type: LayoutType, count: number) {
  if (type === "pair" || type === "leadDetail") return count === 2;
  if (type === "sequence") return count >= 2 && count <= 3;
  return count === 1;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { id: chapterId } = await params;
    const body = await request.json() as { blocks?: CompositionBlock[] };
    if (!Array.isArray(body.blocks) || !body.blocks.length) throw new Error("Add at least one editorial block.");

    const db = getDb();
    await ensureContentSchema(db);
    const stored = (await db.prepare("SELECT id FROM photos WHERE chapter_id = ? ORDER BY position").bind(chapterId).all<{ id: string }>()).results;
    const storedIds = new Set(stored.map((photo) => photo.id));
    const submittedIds = body.blocks.flatMap((block) => block.photoIds ?? []);
    if (submittedIds.length !== stored.length || new Set(submittedIds).size !== stored.length || submittedIds.some((id) => !storedIds.has(id))) {
      throw new Error("The composition must include every photo in this chapter exactly once.");
    }

    let position = 0;
    const updates = [];
    for (const block of body.blocks) {
      const layoutType = String(block.layoutType ?? "") as LayoutType;
      const photoIds = block.photoIds ?? [];
      if (!allowedLayouts.has(layoutType) || !validCount(layoutType, photoIds.length)) throw new Error(`The ${layoutType || "selected"} block has the wrong number of photos.`);
      if (layoutType === "storyMoment" && !block.storyBody?.trim()) throw new Error("Add the short story for each Story moment.");
      if (block.storyAlignment && block.storyAlignment !== "left" && block.storyAlignment !== "right") throw new Error("Choose a valid Story moment arrangement.");
      const layoutGroup = crypto.randomUUID();
      for (const photoId of photoIds) {
        updates.push(db.prepare("UPDATE photos SET position = ?, layout_type = ?, layout_group = ?, story_title = COALESCE(?, story_title), story_body = COALESCE(?, story_body), story_alignment = COALESCE(?, story_alignment) WHERE id = ? AND chapter_id = ?")
          .bind(position++, layoutType, layoutGroup, layoutType === "storyMoment" ? block.storyTitle?.trim() ?? "" : null, layoutType === "storyMoment" ? block.storyBody?.trim() ?? "" : null, layoutType === "storyMoment" ? block.storyAlignment ?? "right" : null, photoId, chapterId));
      }
    }
    await db.batch(updates);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, "Could not save the chapter composition"); }
}
