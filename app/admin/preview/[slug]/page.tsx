import { notFound } from "next/navigation";
import { JourneyView } from "../../../journeys/JourneyView";
import { requireAdminUser } from "../../../lib/admin-auth";
import { getAdminJourneyPreview } from "../../../lib/content-db";

export const dynamic = "force-dynamic";

export default async function AdminJourneyPreview({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminUser();
  const { slug } = await params;
  const journey = await getAdminJourneyPreview(slug);
  if (!journey) notFound();
  return <JourneyView journey={journey} />;
}
