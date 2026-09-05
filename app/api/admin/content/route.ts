import { listAdminContent } from "../../../lib/content-db";
import { apiError, requireApiAdmin } from "../../../lib/api";

export async function GET() {
  const unauthorized = await requireApiAdmin();
  if (unauthorized) return unauthorized;
  try { return Response.json({ journeys: await listAdminContent() }); }
  catch (error) { return apiError(error, "Could not load the studio"); }
}
