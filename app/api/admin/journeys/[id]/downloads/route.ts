import { apiError, requireApiAdmin } from '../../../../../lib/api';
import { ensureContentSchema, getDb } from '../../../../../lib/content-db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { allowDownloads } = await request.json() as { allowDownloads?: boolean };
    if (typeof allowDownloads !== 'boolean') throw new Error('Choose whether downloads are allowed.');
    const { id } = await params;
    const db = getDb();
    await ensureContentSchema(db);
    if (!await db.prepare('SELECT id FROM journeys WHERE id = ?').bind(id).first()) return Response.json({ error: 'Journey not found.' }, { status: 404 });
    await db.prepare('UPDATE journeys SET allow_downloads = ?, updated_at = unixepoch() WHERE id = ?').bind(allowDownloads ? 1 : 0, id).run();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, 'Could not save download setting.'); }
}
