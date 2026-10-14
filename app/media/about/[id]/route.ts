import { getDb, ensureContentSchema } from '../../../lib/content-db';
import { getPlatformEnv } from '../../../lib/platform';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  await ensureContentSchema(db);
  const { id } = await params;
  const row = await db.prepare('SELECT object_key FROM about_images WHERE id = ?').bind(id).first<{ object_key: string }>();
  if (!row) return new Response('Not found', { status: 404 });
  const object = await getPlatformEnv().PHOTOS?.get(row.object_key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}
