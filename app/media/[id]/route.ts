import { getAdminUserForApi } from "../../lib/admin-auth";
import { ensureContentSchema, getDb } from "../../lib/content-db";
import { getPlatformEnv } from "../../lib/platform";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const bucket = getPlatformEnv().PHOTOS;
    if (!bucket) return new Response("Not found", { status: 404 });
    await ensureContentSchema(db);
    const photo = await db.prepare(`SELECT photos.object_key, photos.mime_type, photos.original_name, journeys.status
      FROM photos JOIN journeys ON journeys.id = photos.journey_id WHERE photos.id = ?`)
      .bind(id).first<{ object_key: string; mime_type: string; original_name: string; status: string }>();
    if (!photo) return new Response("Not found", { status: 404 });
    if (photo.status !== "published" && !(await getAdminUserForApi())) return new Response("Not found", { status: 404 });
    const object = await bucket.get(photo.object_key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers({ "Cache-Control": photo.status === "published" ? "public, max-age=3600" : "private, no-store" });
    object.writeHttpMetadata(headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", photo.mime_type);
    headers.set("X-Content-Type-Options", "nosniff");
    if (new URL(request.url).searchParams.get("download") === "1") {
      const fallbackName = photo.original_name.replace(/[\x00-\x1f\x7f"\\]/g, "-") || "photograph";
      const encodedName = encodeURIComponent(photo.original_name).replace(/'/g, "%27");
      headers.set("Content-Disposition", `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`);
    }
    return new Response(object.body, { headers });
  } catch { return new Response("Not found", { status: 404 }); }
}
