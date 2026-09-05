import { japanJourney } from "../../data";
import { getPublishedJourney } from "../../lib/content-db";
import { JourneyView } from "../JourneyView";

export const dynamic = "force-dynamic";

export default async function JapanJourneyPage() {
  const journey = await getPublishedJourney("japan") ?? japanJourney;
  return <JourneyView journey={journey} />;
}
