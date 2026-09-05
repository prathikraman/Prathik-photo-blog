import { getAdminUserForApi } from "./admin-auth";

export async function requireApiAdmin(): Promise<Response | null> {
  return (await getAdminUserForApi()) ? null : Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function apiError(error: unknown, fallback = "Something went wrong") {
  const message = error instanceof Error ? error.message : fallback;
  return Response.json({ error: message }, { status: 400 });
}

export const cleanSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
