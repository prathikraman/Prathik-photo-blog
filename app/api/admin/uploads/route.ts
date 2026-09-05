import type { EditorialBlock } from "../../../types";
import { apiError, requireApiAdmin } from "../../../lib/api";
import { ensureContentSchema, getDb } from "../../../lib/content-db";
import { getPlatformEnv, type R2UploadedPart } from "../../../lib/platform";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const allowedLayouts = new Set<EditorialBlock["type"]>(["fullBleed", "single", "pair", "leadDetail", "portraitFocus", "sequence", "storyMoment"]);
const safeName = (name: string) => name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "photo";
const maxFileSize = 30 * 1024 * 1024;

type UploadDetails = {
  journeyId?: string;
  chapterId?: string;
  layoutType?: EditorialBlock["type"];
  layoutGroup?: string;
  alt?: string;
  caption?: string;
  name?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
};

function checkedDetails(value: UploadDetails, requireSize = false) {
  const details = {
    journeyId: String(value.journeyId ?? ""), chapterId: String(value.chapterId ?? ""),
    layoutType: String(value.layoutType ?? "single") as EditorialBlock["type"], layoutGroup: String(value.layoutGroup ?? ""),
    alt: String(value.alt ?? "").trim(), caption: String(value.caption ?? "").trim(),
    name: String(value.name ?? "photo"), mimeType: String(value.mimeType ?? ""),
    fileSize: Number(value.fileSize ?? 0), width: Math.max(1, Number(value.width ?? 1)), height: Math.max(1, Number(value.height ?? 1)),
  };
  if (!details.journeyId || !details.chapterId) throw new Error("Choose a journey and chapter.");
  if (!allowedLayouts.has(details.layoutType)) throw new Error("Choose a valid editorial layout.");
  if (!allowedTypes.has(details.mimeType)) throw new Error(`${details.name} is not a supported image type.`);
  if (requireSize && (!details.fileSize || details.fileSize > maxFileSize)) throw new Error(`${details.name} must be no larger than 30 MB.`);
  return details;
}

async function selectedJourney(journeyId: string, chapterId: string) {
  const db = getDb();
  await ensureContentSchema(db);
  const journey = await db.prepare("SELECT slug FROM journeys WHERE id = ?").bind(journeyId).first<{ slug: string }>();
  const chapter = await db.prepare("SELECT id FROM chapters WHERE id = ? AND journey_id = ?").bind(chapterId, journeyId).first();
  if (!journey || !chapter) throw new Error("The selected journey or chapter was not found.");
  return { db, journey };
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const value = await request.json() as UploadDetails & { action?: string };
    if (value.action !== "start") throw new Error("Invalid upload action.");
    const details = checkedDetails(value, true);
    const { journey } = await selectedJourney(details.journeyId, details.chapterId);
    const bucket = getPlatformEnv().PHOTOS;
    if (!bucket) throw new Error("Photo storage is unavailable.");
    const id = crypto.randomUUID();
    const key = `journeys/${journey.slug}/${id}-${safeName(details.name)}`;
    const upload = await bucket.createMultipartUpload(key, {
      httpMetadata: { contentType: details.mimeType }, customMetadata: { originalName: details.name },
    });
    return Response.json({ key, uploadId: upload.uploadId }, { status: 201 });
  } catch (error) { return apiError(error, "Could not start the upload"); }
}

export async function PUT(request: Request) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";
    const uploadId = url.searchParams.get("uploadId") ?? "";
    const partNumber = Number(url.searchParams.get("partNumber") ?? 0);
    if (!key.startsWith("journeys/") || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) throw new Error("Invalid upload part.");
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) throw new Error("Invalid upload part size.");
    const bucket = getPlatformEnv().PHOTOS;
    if (!bucket) throw new Error("Photo storage is unavailable.");
    const part = await bucket.resumeMultipartUpload(key, uploadId).uploadPart(partNumber, bytes);
    return Response.json(part);
  } catch (error) { return apiError(error, "Could not upload part of the photo"); }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const value = await request.json() as UploadDetails & { key?: string; uploadId?: string; parts?: R2UploadedPart[] };
    const details = checkedDetails(value);
    const key = String(value.key ?? "");
    const uploadId = String(value.uploadId ?? "");
    const parts = Array.isArray(value.parts) ? value.parts.filter((part) => Number.isInteger(part.partNumber) && part.partNumber > 0 && typeof part.etag === "string") : [];
    if (!key.startsWith("journeys/") || !uploadId || !parts.length) throw new Error("The upload is incomplete.");
    const { db, journey } = await selectedJourney(details.journeyId, details.chapterId);
    if (!key.startsWith(`journeys/${journey.slug}/`)) throw new Error("The upload does not belong to this journey.");
    const bucket = getPlatformEnv().PHOTOS;
    if (!bucket) throw new Error("Photo storage is unavailable.");
    await bucket.resumeMultipartUpload(key, uploadId).complete(parts);
    const id = crypto.randomUUID();
    const nextPosition = await db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS value FROM photos WHERE chapter_id = ?")
      .bind(details.chapterId).first<{ value: number }>();
    try {
      await db.prepare(`INSERT INTO photos
        (id, journey_id, chapter_id, object_key, original_name, mime_type, width, height, alt, caption, layout_type, layout_group, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        id, details.journeyId, details.chapterId, key, details.name, details.mimeType, details.width, details.height,
        details.alt || details.name.replace(/\.[^.]+$/, ""), details.caption, details.layoutType, details.layoutGroup || crypto.randomUUID(), nextPosition?.value ?? 0,
      ).run();
    } catch (error) { await bucket.delete(key); throw error; }
    return Response.json({ uploaded: [id] }, { status: 201 });
  } catch (error) { return apiError(error, "Could not finish the upload"); }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";
    const uploadId = url.searchParams.get("uploadId") ?? "";
    if (!key.startsWith("journeys/") || !uploadId) throw new Error("Invalid upload session.");
    const bucket = getPlatformEnv().PHOTOS;
    if (!bucket) throw new Error("Photo storage is unavailable.");
    await bucket.resumeMultipartUpload(key, uploadId).abort();
    return Response.json({ deleted: true });
  } catch (error) { return apiError(error, "Could not cancel the upload"); }
}
