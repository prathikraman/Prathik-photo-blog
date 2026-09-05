import { notFound } from "next/navigation";
import { getPublishedJourney } from "../../lib/content-db";
import { JourneyView } from "../JourneyView";

export const dynamic = "force-dynamic";

export default async function JourneyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const journey = await getPublishedJourney(slug);
  if (!journey) notFound();
  return <JourneyView journey={journey} />;
}
