import { apiError, requireApiAdmin } from '../../../../../lib/api';
import { ensureContentSchema, getDb, getAboutImages } from '../../../../../lib/content-db';
import { getPlatformEnv } from '../../../../../lib/platform';

type Context = { params: Promise<{ slot: string }> };
async function update(request: Request, context: Context) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { slot } = await context.params;
    if (!['portrait', 'secondary'].includes(slot)) throw new Error('Invalid image slot.');
    const db = getDb();
    const bucket = getPlatformEnv().PHOTOS;
    if (!bucket) throw new Error('Photo storage is unavailable.');
    await ensureContentSchema(db);
    const previous = await db.prepare('SELECT object_key FROM about_images WHERE slot = ?').bind(slot).first<{ object_key: string }>();
    if (request.method === 'PATCH') {
      const body = await request.json() as { alt?: string };
      if (!previous) throw new Error('Upload an image first.');
      await db.prepare('UPDATE about_images SET alt = ? WHERE slot = ?').bind(String(body.alt ?? '').trim().slice(0, 1000), slot).run();
    } else if (request.method === 'DELETE') {
      await db.prepare('DELETE FROM about_images WHERE slot = ?').bind(slot).run();
    } else {
      const mime = request.headers.get('content-type') ?? '';
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(mime)) throw new Error('Use JPEG, PNG, WebP or AVIF.');
      const limit = 30 * 1024 * 1024;
      if (Number(request.headers.get('content-length')) > limit) throw new Error('Choose an image up to 30 MB.');
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > limit) throw new Error('Choose an image up to 30 MB.');
      const query = new URL(request.url).searchParams;
      const width = Number(query.get('width')), height = Number(query.get('height'));
      if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 20000)) throw new Error('Invalid image dimensions.');
      const id = crypto.randomUUID(), key = `about/${slot}/${id}`;
      await bucket.put(key, bytes, { httpMetadata: { contentType: mime } });
      try {
        await db.prepare(`INSERT INTO about_images (slot, id, object_key, mime_type, width, height, alt) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(slot) DO UPDATE SET id=excluded.id, object_key=excluded.object_key, mime_type=excluded.mime_type, width=excluded.width, height=excluded.height, alt=excluded.alt`)
          .bind(slot, id, key, mime, width, height, (query.get('alt') ?? '').trim().slice(0, 1000)).run();
      } catch (error) { await bucket.delete(key); throw error; }
    }
    if (previous && request.method !== 'PATCH') {
      try { await bucket.delete(previous.object_key); }
      catch (error) { console.error('About image cleanup failed', error); }
    }
    return Response.json({ images: await getAboutImages() });
  } catch (error) { return apiError(error, 'Could not update the About image.'); }
}
export const PUT = update;
export const PATCH = update;
export const DELETE = update;
